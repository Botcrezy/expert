import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  File,
  FileText,
  FileImage,
  Search,
  Download,
  Eye,
  Loader2,
  ChevronRight,
  FileArchive,
  FileSpreadsheet,
  Presentation,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { downloadAsBlob, getSignedUrlOrUrl, createBlobObjectUrlFromUrl } from "@/lib/storageFileAccess";

interface FileItem {
  name: string;
  path: string;
  size: number;
  type?: string;
  createdAt: string;
  requestId: string;
  requestTitle?: string;
  requestNumber?: string;
}

export default function ClientFiles() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [requestFilter, setRequestFilter] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string; mode: "blob" | "signed" } | null>(null);
  const previewBlobRevokeRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => {
      previewBlobRevokeRef.current?.();
      previewBlobRevokeRef.current = null;
    };
  }, []);

  // Fetch user's requests with proper error handling
  const { data: requests = [], error: requestsError, isLoading } = useQuery({
    queryKey: ["client-requests-for-files", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title, files, request_number, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching requests for files:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Log error for debugging
  if (requestsError) {
    console.error("Client files query error:", requestsError);
  }

  // Extract files from all requests
  const files: FileItem[] = requests.flatMap((request: any) => {
    const requestFiles = request.files as { name: string; path: string; size?: number; type?: string; uploadedAt?: string }[] || [];
    return requestFiles.map((file) => ({
      name: file.name,
      path: file.path,
      size: file.size || 0,
      type: file.type,
      createdAt: file.uploadedAt || request.created_at,
      requestId: request.id,
      requestTitle: request.title,
      requestNumber: request.request_number,
    }));
  });

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesSearch = 
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.requestTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRequest = requestFilter === "all" || file.requestId === requestFilter;
    
    return matchesSearch && matchesRequest;
  });

  // Group files by request
  const filesByRequest = filteredFiles.reduce((acc, file) => {
    const key = file.requestId;
    if (!acc[key]) {
      acc[key] = {
        requestId: file.requestId,
        requestTitle: file.requestTitle || "بدون عنوان",
        requestNumber: file.requestNumber || "",
        files: [],
      };
    }
    acc[key].files.push(file);
    return acc;
  }, {} as Record<string, { requestId: string; requestTitle: string; requestNumber: string; files: FileItem[] }>);

  const getFileIcon = (name: string, type?: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    const lowerType = type?.toLowerCase() || "";
    
    if (lowerType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
      return <FileImage className="w-5 h-5 text-blue-500" />;
    }
    if (lowerType === "application/pdf" || ext === "pdf") {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
      return <FileArchive className="w-5 h-5 text-yellow-500" />;
    }
    if (["doc", "docx"].includes(ext || "")) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (["xls", "xlsx"].includes(ext || "")) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    }
    if (["ppt", "pptx"].includes(ext || "")) {
      return <Presentation className="w-5 h-5 text-orange-500" />;
    }
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isOfficeFile = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    return ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext || "");
  };

  const getGoogleDocsViewerUrl = (url: string) => {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const handlePreview = async (file: FileItem) => {
    const filePath = file.path;
    if (!filePath) return;

    // cleanup previous blob preview
    previewBlobRevokeRef.current?.();
    previewBlobRevokeRef.current = null;

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const signedUrl = await getSignedUrlOrUrl({
        bucket: "request-files",
        pathOrUrl: filePath,
        expiresInSeconds: 300,
      });

      // Images + PDFs => blob URL for in-app preview
      if (["jpg", "jpeg", "png", "gif", "webp", "svg", "pdf"].includes(ext)) {
        const { blobUrl, revoke } = await createBlobObjectUrlFromUrl(signedUrl);
        previewBlobRevokeRef.current = revoke;
        setPreviewFile({ url: blobUrl, name: file.name, type: ext, mode: "blob" });
      } else if (isOfficeFile(file.name)) {
        // Office => signed URL (Google viewer needs a URL)
        setPreviewFile({ url: signedUrl, name: file.name, type: ext, mode: "signed" });
      }
    } catch (error) {
      console.error("Error creating preview:", error);
    }
  };

  const handleDownload = async (file: FileItem) => {
    const filePath = file.path;
    if (!filePath) return;

    try {
      await downloadAsBlob({
        bucket: "request-files",
        pathOrUrl: filePath,
        filename: file.name,
        expiresInSeconds: 60,
      });
    } catch (error) {
      console.error("Error downloading:", error);
    }
  };

  const isPreviewable = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    return [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
    ].includes(ext || "");
  };

  const totalSize = filteredFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="ملفاتي"
      subtitle="عرض وإدارة جميع الملفات المرفوعة في طلباتك"
    >
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="ابحث عن ملف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={requestFilter} onValueChange={setRequestFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="جميع الطلبات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الطلبات</SelectItem>
            {requests.map((request: any) => (
              <SelectItem key={request.id} value={request.id}>
                {request.request_number} - {request.title?.substring(0, 30)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Folder className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredFiles.length}</p>
              <p className="text-sm text-muted-foreground">ملف</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatSize(totalSize)}</p>
              <p className="text-sm text-muted-foreground">الحجم الكلي</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Object.keys(filesByRequest).length}</p>
              <p className="text-sm text-muted-foreground">طلبات</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FileImage className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {filteredFiles.filter(f => isPreviewable(f.name)).length}
              </p>
              <p className="text-sm text-muted-foreground">قابل للمعاينة</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Error State */}
      {requestsError && (
        <Card className="p-6 border-destructive/50 bg-destructive/5 mb-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">حدث خطأ أثناء تحميل الملفات</p>
              <p className="text-sm opacity-80">{(requestsError as Error).message}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">جاري تحميل الملفات...</p>
        </Card>
      )}

      {/* Files Grouped by Request */}
      {!isLoading && filteredFiles.length === 0 ? (
        <Card className="p-12 text-center">
          <Folder className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">لا توجد ملفات</p>
          <p className="text-sm text-muted-foreground mt-1">
            ستظهر هنا الملفات المرفوعة مع طلباتك
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(filesByRequest).map((group) => (
            <Card key={group.requestId} className="overflow-hidden">
              <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{group.requestTitle}</p>
                    <p className="text-sm text-muted-foreground">{group.requestNumber}</p>
                  </div>
                </div>
                <Badge variant="secondary">{group.files.length} ملفات</Badge>
              </div>
              <div className="divide-y">
                {group.files.map((file, index) => {
                  const Icon = getFileIcon(file.name, file.type);
                  return (
                    <div
                      key={`${file.requestId}-${index}`}
                      className="p-4 hover:bg-muted/30 transition-colors flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {Icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatSize(file.size)}</span>
                          {file.createdAt && (
                            <>
                              <ChevronRight className="w-3 h-3" />
                              <span>
                                {format(new Date(file.createdAt), "d MMM yyyy", { locale: ar })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isPreviewable(file.name) && (
                          <Button variant="ghost" size="icon" onClick={() => handlePreview(file)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) {
            previewBlobRevokeRef.current?.();
            previewBlobRevokeRef.current = null;
            setPreviewFile(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewFile?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewFile && ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(previewFile.type) && (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full h-auto rounded-lg mx-auto"
              />
            )}
            {previewFile?.type === "pdf" && (
              <iframe
                src={previewFile.url}
                className="w-full h-[70vh] rounded-lg"
                title={previewFile.name}
              />
            )}
            {previewFile && isOfficeFile(previewFile.name) && previewFile.mode === "signed" && (
              <iframe
                src={getGoogleDocsViewerUrl(previewFile.url)}
                className="w-full h-[70vh] rounded-lg"
                title={previewFile.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
