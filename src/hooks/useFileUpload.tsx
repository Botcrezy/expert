import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  url?: string;
  path?: string;
  error?: string;
}

interface UseFileUploadOptions {
  bucket?: string;
  folder?: string;
  maxSize?: number; // in MB
  onUploadComplete?: (files: UploadedFile[]) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { 
    bucket = "request-files", 
    folder = "",
    maxSize = 50,
    onUploadComplete 
  } = options;
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile> => {
    if (!user) {
      throw new Error("يجب تسجيل الدخول أولاً");
    }

    // Check file size first
    if (file.size > maxSize * 1024 * 1024) {
      throw new Error(`حجم الملف أكبر من ${maxSize}MB`);
    }

    const fileId = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    
    // Construct file path: bucket/userId/folder/filename
    const filePath = folder 
      ? `${user.id}/${folder}/${fileName}` 
      : `${user.id}/${fileName}`;

    // Add file to state with 0 progress
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
    };

    setFiles(prev => [...prev, uploadedFile]);

    try {
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      // Get public URL (for public buckets) or create signed URL (for private buckets)
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      let fileUrl = publicUrlData.publicUrl;
      
      // If bucket is private, create signed URL
      if (!fileUrl || fileUrl.includes('sign')) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 days

        if (!signedUrlError && signedUrlData) {
          fileUrl = signedUrlData.signedUrl;
        }
      }

      // Update file state with success
      const completedFile: UploadedFile = {
        ...uploadedFile,
        progress: 100,
        url: fileUrl,
        path: data.path,
      };

      setFiles(prev => prev.map(f => 
        f.id === fileId ? completedFile : f
      ));

      return completedFile;
    } catch (error: any) {
      // Update file state with error
      const errorMessage = error.message || "فشل رفع الملف";
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 0, error: errorMessage } : f
      ));

      throw error;
    }
  }, [user, bucket, folder, maxSize]);

  const uploadFiles = useCallback(async (fileList: File[]) => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return [];
    }

    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      for (const file of fileList) {
        try {
          const uploadedFile = await uploadFile(file);
          uploadedFiles.push(uploadedFile);
        } catch (error: any) {
          console.error(`Error uploading ${file.name}:`, error);
          toast({
            title: `فشل رفع ${file.name}`,
            description: error.message,
            variant: "destructive",
          });
        }
      }

      if (uploadedFiles.length > 0 && onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }

      return uploadedFiles;
    } finally {
      setUploading(false);
    }
  }, [user, uploadFile, onUploadComplete, toast]);

  const removeFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    
    if (file?.path) {
      try {
        await supabase.storage
          .from(bucket)
          .remove([file.path]);
      } catch (error) {
        console.error("Error removing file:", error);
      }
    }

    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, [files, bucket]);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const getSignedUrl = useCallback(async (path: string, expiresIn: number = 3600) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }, [bucket]);

  return {
    files,
    uploading,
    uploadFile,
    uploadFiles,
    removeFile,
    clearFiles,
    getSignedUrl,
    setFiles,
  };
}
