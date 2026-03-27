import { cn } from "@/lib/utils";
import { Upload, X, File, Image, FileText } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "./button";
import { Progress } from "./progress";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  url?: string;
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
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

export function FileUpload({ 
  onFilesChange, 
  accept = "*",
  maxFiles = 5,
  maxSize = 10,
  className 
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };
  
  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles
      .filter(file => file.size <= maxSize * 1024 * 1024)
      .slice(0, maxFiles - files.length);
    
    const uploadedFiles: UploadedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
    }));
    
    const updatedFiles = [...files, ...uploadedFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    
    // Simulate upload progress
    uploadedFiles.forEach(file => {
      simulateUpload(file.id);
    });
  };
  
  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress } : f
      ));
    }, 200);
  };
  
  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors",
            isDragging ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Upload className="w-7 h-7" />
          </div>
          <p className="font-medium text-foreground mb-1">
            اسحب وأفلت الملفات هنا
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            أو اضغط للاختيار من جهازك
          </p>
          <p className="text-xs text-muted-foreground">
            الحد الأقصى: {maxSize} MB لكل ملف • {maxFiles} ملفات كحد أقصى
          </p>
        </div>
      </div>
      
      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => {
            const FileIcon = getFileIcon(file.type);
            
            return (
              <div 
                key={file.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileIcon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                  {file.progress < 100 && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon-sm"
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
