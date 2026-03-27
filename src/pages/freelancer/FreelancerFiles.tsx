import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  FileText,
  Loader2,
  Download,
  Eye,
  Folder,
  Image,
  File,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadAsBlob, getSignedUrlOrUrl, createBlobObjectUrlFromUrl } from "@/lib/storageFileAccess";

interface FileRecord {
  name: string;
  url: string;
  path?: string;
  type?: string;
  size?: number;
}

export default function FreelancerFiles() {
  const { user } = useAuth();
  const [preview, setPreview] = useState<{ name: string; type: string; url: string; mode: "blob" | "signed"; source: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewBlobRevokeRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => {
      previewBlobRevokeRef.current?.();
      previewBlobRevokeRef.current = null;
    };
  }, []);
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["freelancer-assignments-files", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select(`
          *,
          requests(
            id,
            title,
            request_number,
            files
          )
        `)
        .eq("freelancer_id", user?.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all deliveries with files
  const { data: deliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ["freelancer-deliveries-files", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select(`
          *,
          requests(title, request_number)
        `)
        .eq("freelancer_id", user?.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const getFileIcon = (type: string | undefined) => {
    if (type?.startsWith("image/")) return Image;
    return File;
  };

  const isOfficeFile = (name?: string) => /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(name || "");
  const isImageName = (name?: string, type?: string) =>
    !!type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name || "");
  const isPdfName = (name?: string, type?: string) =>
    type === "application/pdf" || /\.pdf$/i.test(name || "");
  const getGoogleDocsViewerUrl = (url: string) =>
    `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isLoading = assignmentsLoading || deliveriesLoading;

  const openPreview = async (file: FileRecord) => {
    const pathOrUrl = file.path || file.url;
    if (!pathOrUrl) return;

    // cleanup previous blob preview
    previewBlobRevokeRef.current?.();
    previewBlobRevokeRef.current = null;

    setPreviewLoading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const signedUrl = await getSignedUrlOrUrl({
        bucket: "request-files",
        pathOrUrl,
        expiresInSeconds: 300,
      });

      if (isImageName(file.name, file.type) || isPdfName(file.name, file.type)) {
        const { blobUrl, revoke } = await createBlobObjectUrlFromUrl(signedUrl);
        previewBlobRevokeRef.current = revoke;
        setPreview({ name: file.name, type: ext, url: blobUrl, mode: "blob", source: pathOrUrl });
      } else if (isOfficeFile(file.name)) {
        setPreview({ name: file.name, type: ext, url: signedUrl, mode: "signed", source: pathOrUrl });
      }
    } catch (e) {
      console.error("Preview error:", e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const triggerDownload = async (file: FileRecord) => {
    const pathOrUrl = file.path || file.url;
    if (!pathOrUrl) return;

    try {
      await downloadAsBlob({
        bucket: "request-files",
        pathOrUrl,
        filename: file.name,
        expiresInSeconds: 60,
      });
    } catch (e) {
      console.error("Download error:", e);
    }
  };

  // Extract all client files from requests
  const clientFiles: { file: FileRecord; request: any }[] = [];
  assignments?.forEach(assignment => {
    const request = assignment.requests as any;
    const rawFiles = request?.files;
    const files = (Array.isArray(rawFiles) ? rawFiles : []) as unknown as FileRecord[];
    files.forEach(file => {
      if (file && typeof file === 'object' && 'name' in file && 'url' in file) {
        clientFiles.push({ file: file as FileRecord, request });
      }
    });
  });

  // Extract all delivery files
  const deliveryFiles: { file: FileRecord; delivery: any; request: any }[] = [];
  deliveries?.forEach(delivery => {
    const rawDeliveryFiles = delivery.files;
    const files = (Array.isArray(rawDeliveryFiles) ? rawDeliveryFiles : []) as unknown as FileRecord[];
    files.forEach(file => {
      if (file && typeof file === 'object' && 'name' in file && 'url' in file) {
        deliveryFiles.push({ file: file as FileRecord, delivery, request: delivery.requests });
      }
    });
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="الملفات">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="الملفات"
      subtitle="إدارة ملفات المشاريع والتسليمات"
    >
      <Tabs defaultValue="client" className="space-y-6">
        <TabsList>
          <TabsTrigger value="client" className="gap-2">
            <Folder className="w-4 h-4" />
            ملفات العملاء ({clientFiles.length})
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-2">
            <FileText className="w-4 h-4" />
            تسليماتي ({deliveryFiles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client">
          {clientFiles.length > 0 ? (
            <div className="card-elevated divide-y divide-border">
              {clientFiles.map((item, index) => {
                const FileIcon = getFileIcon(item.file.type);
                return (
                  <div key={index} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.file.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{item.request?.request_number}</span>
                          <span>•</span>
                          <span>{formatFileSize(item.file.size)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPreview(item.file)}
                        disabled={previewLoading}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => triggerDownload(item.file)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-elevated p-12 text-center">
              <Folder className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد ملفات</h3>
              <p className="text-muted-foreground">ستظهر هنا ملفات العملاء المرفقة بالمهام</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="deliveries">
          {deliveryFiles.length > 0 ? (
            <div className="card-elevated divide-y divide-border">
              {deliveryFiles.map((item, index) => {
                const FileIcon = getFileIcon(item.file.type);
                return (
                  <div key={index} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-success/10 text-success flex items-center justify-center">
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.file.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{item.request?.request_number}</span>
                          <span>•</span>
                          <span>Revision {item.delivery.revision_number}</span>
                          <span>•</span>
                          <span>{formatFileSize(item.file.size)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.delivery.created_at), "dd MMM", { locale: ar })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPreview(item.file)}
                          disabled={previewLoading}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => triggerDownload(item.file)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-elevated p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تسليمات</h3>
              <p className="text-muted-foreground">ستظهر هنا الملفات التي قمت بتسليمها</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!preview || previewLoading}
        onOpenChange={(open) => {
          if (!open) {
            previewBlobRevokeRef.current?.();
            previewBlobRevokeRef.current = null;
            setPreview(null);
            setPreviewLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.name || "معاينة الملف"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
            {previewLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : preview ? (
              isImageName(preview.name) ? (
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-[70vh] object-contain" />
              ) : isPdfName(preview.name) ? (
                <iframe src={preview.url} className="w-full h-[70vh] rounded-lg" title={preview.name} />
              ) : isOfficeFile(preview.name) ? (
                <iframe
                  src={getGoogleDocsViewerUrl(preview.url)}
                  className="w-full h-[70vh] rounded-lg"
                  title={preview.name}
                />
              ) : null
            ) : null}
          </div>

          {preview && (
            <div className="pt-3 flex justify-end">
              <Button onClick={() => downloadAsBlob({ bucket: "request-files", pathOrUrl: preview.source, filename: preview.name, expiresInSeconds: 60 })}>
                <Download className="w-4 h-4 ml-2" />
                تحميل
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
