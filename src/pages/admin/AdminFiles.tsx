import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Trash2,
  Eye,
  Download,
  FileText,
  Image as ImageIcon,
  FileArchive,
  File,
  Loader2,
  FolderOpen,
  Filter,
  FileSpreadsheet,
  Presentation,
  HardDrive,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { downloadAsBlob, getSignedUrlOrUrl, createBlobObjectUrlFromUrl } from "@/lib/storageFileAccess";
interface StorageFile {
  id: string;
  name: string;
  bucket_id: string;
  created_at: string;
  updated_at: string;
  metadata: {
    size?: number;
    mimetype?: string;
  };
}

export default function AdminFiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewBlobRevokeRef = useRef<null | (() => void)>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StorageFile | null>(null);

  useEffect(() => {
    return () => {
      previewBlobRevokeRef.current?.();
      previewBlobRevokeRef.current = null;
    };
  }, []);

  // Fetch all files from storage with recursive folder listing
  const { data: files = [], isLoading, error: filesError } = useQuery({
    queryKey: ["admin-storage-files", bucketFilter],
    queryFn: async () => {
      const buckets = bucketFilter === "all" 
        ? ["request-files", "avatars"]
        : [bucketFilter];
      
      const allFiles: (StorageFile & { bucket: string; folder?: string })[] = [];
      
      // Recursive function to list files in nested folders
      const listFilesRecursively = async (bucket: string, path: string = "", depth: number = 0) => {
        if (depth > 4) return; // Limit depth to prevent infinite recursion
        
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .list(path, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
          
          if (error) {
            console.error(`Error listing ${bucket}/${path}:`, error);
            return;
          }
          
          if (data) {
            for (const item of data) {
              const fullPath = path ? `${path}/${item.name}` : item.name;
              
              if (item.id) {
                // It's a file
                allFiles.push({
                  ...item,
                  name: fullPath,
                  bucket,
                  folder: path || "root"
                } as StorageFile & { bucket: string; folder: string });
              } else {
                // It's a folder, recurse into it
                await listFilesRecursively(bucket, fullPath, depth + 1);
              }
            }
          }
        } catch (e) {
          console.error(`Error listing bucket ${bucket}/${path}:`, e);
        }
      };
      
      for (const bucket of buckets) {
        await listFilesRecursively(bucket);
      }
      
      return allFiles;
    },
  });

  // Log error for debugging
  if (filesError) {
    console.error("Admin files query error:", filesError);
  }

  const deleteMutation = useMutation({
    mutationFn: async ({ bucket, path }: { bucket: string; path: string }) => {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-storage-files"] });
      toast({ title: "تم حذف الملف بنجاح ✅" });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getFileIcon = (name: string, mimetype?: string) => {
    const lowerName = name.toLowerCase();
    const type = mimetype?.toLowerCase() || "";
    
    if (type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerName)) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    if (type === "application/pdf" || lowerName.endsWith(".pdf")) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (/\.(zip|rar|7z|tar|gz)$/i.test(lowerName)) {
      return <FileArchive className="w-5 h-5 text-yellow-500" />;
    }
    if (/\.(doc|docx)$/i.test(lowerName)) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (/\.(xls|xlsx)$/i.test(lowerName)) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    }
    if (/\.(ppt|pptx)$/i.test(lowerName)) {
      return <Presentation className="w-5 h-5 text-orange-500" />;
    }
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "غير معروف";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getBucketLabel = (bucket: string) => {
    switch (bucket) {
      case "request-files": return "ملفات الطلبات";
      case "avatars": return "الصور الشخصية";
      case "payment-receipts": return "إيصالات الدفع";
      default: return bucket;
    }
  };

  const handlePreview = async (file: StorageFile & { bucket: string }) => {
    // cleanup previous blob preview
    previewBlobRevokeRef.current?.();
    previewBlobRevokeRef.current = null;

    try {
      const signedUrl = await getSignedUrlOrUrl({
        bucket: file.bucket,
        pathOrUrl: file.name,
        expiresInSeconds: 300,
      });

      if (isImage(file.name, file.metadata?.mimetype) || file.name.toLowerCase().endsWith(".pdf")) {
        const { blobUrl, revoke } = await createBlobObjectUrlFromUrl(signedUrl);
        previewBlobRevokeRef.current = revoke;
        setPreviewUrl(blobUrl);
      } else {
        setPreviewUrl(signedUrl);
      }
      setPreviewFile(file);
    } catch (e) {
      console.error("Preview error:", e);
    }
  };

  const handleDownload = async (file: StorageFile & { bucket: string }) => {
    try {
      await downloadAsBlob({
        bucket: file.bucket,
        pathOrUrl: file.name,
        filename: file.name.split("/").pop() || file.name,
        expiresInSeconds: 60,
      });
    } catch (e) {
      console.error("Download error:", e);
    }
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);

  const isImage = (name: string, mimetype?: string) => {
    const type = mimetype?.toLowerCase() || "";
    return type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name.toLowerCase());
  };

  const isOfficeFile = (name: string) => {
    return /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(name.toLowerCase());
  };

  const getGoogleDocsViewerUrl = (url: string) => {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة الملفات"
      subtitle="عرض وإدارة جميع الملفات المرفوعة"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{files.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي الملفات</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
                <p className="text-sm text-muted-foreground">إجمالي الحجم</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {files.filter(f => isImage(f.name, f.metadata?.mimetype)).length}
                </p>
                <p className="text-sm text-muted-foreground">صور</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {files.filter(f => !isImage(f.name, f.metadata?.mimetype)).length}
                </p>
                <p className="text-sm text-muted-foreground">مستندات</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={bucketFilter} onValueChange={setBucketFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المجلدات</SelectItem>
              <SelectItem value="request-files">ملفات الطلبات</SelectItem>
              <SelectItem value="avatars">الصور الشخصية</SelectItem>
              <SelectItem value="payment-receipts">إيصالات الدفع</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Files Table */}
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الملف</TableHead>
                <TableHead>المجلد</TableHead>
                <TableHead>الحجم</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد ملفات</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file: any) => (
                  <TableRow key={`${file.bucket}-${file.name}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.name, file.metadata?.mimetype)}
                        <span className="truncate max-w-[200px]" title={file.name}>
                          {file.name.split("/").pop()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getBucketLabel(file.bucket)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(file.metadata?.size)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.created_at ? format(new Date(file.created_at), "dd MMM yyyy", { locale: ar }) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePreview(file)}
                          title="معاينة"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(file)}
                          title="تحميل"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(file)}
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) {
            previewBlobRevokeRef.current?.();
            previewBlobRevokeRef.current = null;
            setPreviewFile(null);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle className="truncate flex-1">
              {previewFile?.name.split("/").pop()}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {previewFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(previewFile as any)}
                  title="تحميل"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
            {previewUrl ? (
              isImage(previewFile?.name || "", previewFile?.metadata?.mimetype) ? (
                <img
                  src={previewUrl}
                  alt={previewFile?.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : isOfficeFile(previewFile?.name || "") ? (
                <iframe
                  src={getGoogleDocsViewerUrl(previewUrl)}
                  className="w-full h-[70vh] rounded-lg"
                  title={previewFile?.name}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] rounded-lg"
                  title={previewFile?.name}
                />
              )
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            هل أنت متأكد من حذف الملف "{deleteConfirm?.name.split("/").pop()}"؟
            <br />
            <span className="text-destructive text-sm">هذا الإجراء لا يمكن التراجع عنه.</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate({
                bucket: (deleteConfirm as any).bucket,
                path: deleteConfirm.name
              })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}