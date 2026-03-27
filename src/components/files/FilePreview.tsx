import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { downloadAsBlob, getSignedUrlOrUrl, createBlobObjectUrlFromUrl } from "@/lib/storageFileAccess";
import {
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  FileArchive,
  File,
  Loader2,
  FolderOpen,
  FileSpreadsheet,
  Presentation
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileInfo {
  name: string;
  size?: number;
  type?: string;
  url?: string;
  path?: string;
}

interface FilePreviewProps {
  files: FileInfo[];
  bucket?: string;
  className?: string;
  showPreview?: boolean;
  title?: string;
}

export function FilePreview({ 
  files, 
  bucket = "request-files",
  className,
  showPreview = true,
  title = "الملفات المرفقة"
}: FilePreviewProps) {
  const { toast } = useToast();
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const previewBlobRevokeRef = useRef<null | (() => void)>(null);

  const clearPreview = () => {
    try {
      previewBlobRevokeRef.current?.();
    } finally {
      previewBlobRevokeRef.current = null;
      setPreviewFile(null);
      setPreviewUrl(null);
      setLoading(false);
    }
  };

  // Pre-fetch signed URLs for all files on mount
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<string, string> = {};
      for (const file of files) {
        const path = file.path || file.url;
        if (!path) continue;
        try {
          // Use the unified helper to handle legacy stored values (full URLs, bucket-prefixed paths, etc.)
          const resolved = await getSignedUrlOrUrl({ bucket, pathOrUrl: path, expiresInSeconds: 3600 });
          urls[path] = resolved;
        } catch (e) {
          console.error("Error fetching signed URL:", e);
          // Best-effort fallback: if it's already a URL, keep it.
          if (path.startsWith("http") || path.startsWith("//")) urls[path] = path;
        }
      }
      setSignedUrls(urls);
    };

    if (files.length > 0) {
      fetchSignedUrls();
    }
  }, [files, bucket]);

  const getFileIcon = (type?: string, name?: string) => {
    const lowerName = name?.toLowerCase() || "";
    const lowerType = type?.toLowerCase() || "";
    
    if (lowerType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerName)) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    if (lowerType === "application/pdf" || lowerName.endsWith(".pdf")) {
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
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if file is previewable (images, PDFs, and Office files via Google Docs)
  const isPreviewable = (type?: string, name?: string) => {
    const lowerName = name?.toLowerCase() || "";
    const lowerType = type?.toLowerCase() || "";
    
    return (
      lowerType.startsWith("image/") || 
      lowerType === "application/pdf" ||
      /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(lowerName)
    );
  };

  const isImage = (type?: string, name?: string) => {
    const lowerName = name?.toLowerCase() || "";
    const lowerType = type?.toLowerCase() || "";
    
    return (
      lowerType.startsWith("image/") || 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerName)
    );
  };

  const isPDF = (type?: string, name?: string) => {
    const lowerName = name?.toLowerCase() || "";
    const lowerType = type?.toLowerCase() || "";
    return lowerType === "application/pdf" || lowerName.endsWith(".pdf");
  };

  const isOfficeFile = (name?: string) => {
    const lowerName = name?.toLowerCase() || "";
    return /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(lowerName);
  };

  // Generate Google Docs Viewer URL for Office files
  const getGoogleDocsViewerUrl = (fileUrl: string) => {
    return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  };

  const getFileUrl = (file: FileInfo): string | null => {
    const path = file.path || file.url;
    if (!path) return null;
    return signedUrls[path] || null;
  };

  const handlePreview = async (file: FileInfo) => {
    if (!showPreview || !isPreviewable(file.type, file.name)) return;

    setLoading(true);
    setPreviewFile(file);

    try {
      // cleanup previous blob preview (if any)
      previewBlobRevokeRef.current?.();
      previewBlobRevokeRef.current = null;

      const pathOrUrl = file.path || file.url;
      if (!pathOrUrl) return;

      // Keep using cached signed URL when available
      const signedUrl =
        signedUrls[pathOrUrl] ||
        (await getSignedUrlOrUrl({ bucket, pathOrUrl, expiresInSeconds: 300 }));

      if (!signedUrls[pathOrUrl] && !pathOrUrl.startsWith("http")) {
        setSignedUrls((prev) => ({ ...prev, [pathOrUrl]: signedUrl }));
      }

      // Images + PDFs: render via blob: URL so the storage URL isn't visible in the iframe/img src
      if (isImage(file.type, file.name) || isPDF(file.type, file.name)) {
        const { blobUrl, revoke } = await createBlobObjectUrlFromUrl(signedUrl);
        previewBlobRevokeRef.current = revoke;
        setPreviewUrl(blobUrl);
      } else {
        // Office/other: keep signed URL (Google viewer needs a URL)
        setPreviewUrl(signedUrl);
      }
    } catch (e: any) {
      console.error("Preview error:", e);
      toast({
        title: "تعذر معاينة الملف",
        description: e?.message,
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileInfo) => {
    const pathOrUrl = file.path || file.url;
    if (!pathOrUrl) return;

    setLoading(true);
    try {
      await downloadAsBlob({
        bucket,
        pathOrUrl,
        filename: file.name,
        expiresInSeconds: 60,
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "فشل التنزيل",
        description: error?.message || "حدث خطأ أثناء تنزيل الملف",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
          <FolderOpen className="w-4 h-4" />
          <span>{title} ({files.length})</span>
        </div>
        
        <div className="grid gap-2">
          {files.map((file, index) => {
            const fileUrl = getFileUrl(file);
            const canPreview = isPreviewable(file.type, file.name);
            const isImg = isImage(file.type, file.name);
            
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group border border-transparent hover:border-border"
              >
                {/* Thumbnail for images */}
                {isImg && fileUrl ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-background flex-shrink-0">
                    <img 
                      src={fileUrl} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                    {getFileIcon(file.type, file.name)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.size && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {showPreview && canPreview && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePreview(file)}
                      title="معاينة"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(file)}
                    title="تحميل"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) clearPreview(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle className="truncate flex-1">{previewFile?.name}</DialogTitle>
            <div className="flex items-center gap-2">
              {previewFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(previewFile)}
                  title="تحميل"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : previewUrl ? (
              isImage(previewFile?.type, previewFile?.name) ? (
                <img
                  src={previewUrl}
                  alt={previewFile?.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : isOfficeFile(previewFile?.name) ? (
                <iframe
                  src={getGoogleDocsViewerUrl(previewUrl)}
                  className="w-full h-[70vh] rounded-lg"
                  title={previewFile?.name}
                />
              ) : isPDF(previewFile?.type, previewFile?.name) ? (
                <iframe
                  src={previewUrl}
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
              <div className="text-center text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>لا يمكن عرض هذا الملف</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => previewFile && handleDownload(previewFile)}
                >
                  <Download className="w-4 h-4 ml-2" />
                  تحميل الملف
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
