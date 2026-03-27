import { cn } from "@/lib/utils";
import { Upload, X, File, Image, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { useCallback } from "react";
import { Button } from "./button";
import { Progress } from "./progress";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";

interface FileUploadAdvancedProps {
  onFilesChange?: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
  folder?: string;
  bucket?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.includes("pdf") || type.includes("document")) return FileText;
  return File;
};

export function FileUploadAdvanced({ 
  onFilesChange, 
  accept = "*",
  maxFiles = 10,
  maxSize = 50,
  className,
  folder,
  bucket = "request-files",
}: FileUploadAdvancedProps) {
  const { files, uploading, uploadFiles, removeFile, setFiles } = useFileUpload({
    bucket,
    folder,
    maxSize,
    onUploadComplete: onFilesChange,
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (files.length + droppedFiles.length > maxFiles) {
      // Only take what we can fit
      const remaining = maxFiles - files.length;
      uploadFiles(droppedFiles.slice(0, remaining));
    } else {
      uploadFiles(droppedFiles);
    }
  }, [files.length, maxFiles, uploadFiles]);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      if (files.length + selectedFiles.length > maxFiles) {
        const remaining = maxFiles - files.length;
        uploadFiles(selectedFiles.slice(0, remaining));
      } else {
        uploadFiles(selectedFiles);
      }
    }
    // Reset input
    e.target.value = "";
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      {files.length < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
            "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center mb-4",
              uploading ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {uploading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Upload className="w-7 h-7" />
              )}
            </div>
            <p className="font-medium text-foreground mb-1">
              {uploading ? "جاري الرفع..." : "اسحب وأفلت الملفات هنا"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              أو اضغط للاختيار من جهازك
            </p>
            <p className="text-xs text-muted-foreground">
              الحد الأقصى: {maxSize} MB لكل ملف • {maxFiles - files.length} ملفات متبقية
            </p>
          </div>
        </div>
      )}
      
      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => {
            const FileIcon = getFileIcon(file.type);
            const isComplete = file.progress === 100 && !file.error;
            const hasError = !!file.error;
            
            return (
              <div 
                key={file.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  hasError ? "bg-destructive/10" : "bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  hasError 
                    ? "bg-destructive/20 text-destructive" 
                    : isComplete 
                      ? "bg-success/10 text-success" 
                      : "bg-primary/10 text-primary"
                )}>
                  {hasError ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <FileIcon className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className={cn(
                    "text-xs",
                    hasError ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {hasError ? file.error : formatFileSize(file.size)}
                  </p>
                  {!isComplete && !hasError && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
