import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Upload, Image as ImageIcon, FileText, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  type?: "image" | "file" | "all";
}

export function FilePickerDialog({ open, onOpenChange, onSelect, type = "all" }: FilePickerDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ["storage-files", type],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("avatars")
        .list("uploads", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      refetch();
      toast({ title: "تم رفع الملف بنجاح ✅" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const getFileUrl = (name: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(`uploads/${name}`);
    return publicUrl;
  };

  const isImage = (name: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  };

  const filteredFiles = files?.filter(f => {
    if (!f.name) return false;
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (type === "image") return matchesSearch && isImage(f.name);
    if (type === "file") return matchesSearch && !isImage(f.name);
    return matchesSearch;
  }) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>اختر ملف</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">المكتبة</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">رفع جديد</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">رابط خارجي</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 flex flex-col gap-4 mt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن ملف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                  <p>لا توجد ملفات</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filteredFiles.map((file) => {
                    const url = getFileUrl(file.name);
                    const isImg = isImage(file.name);
                    const isSelected = selectedUrl === url;

                    return (
                      <button
                        key={file.id}
                        onClick={() => setSelectedUrl(url)}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                          isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        {isImg ? (
                          <img src={url} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                            <span className="text-xs mt-1 px-1 truncate w-full text-center">{file.name}</span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-5 h-5 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button 
                disabled={!selectedUrl} 
                onClick={() => {
                  if (selectedUrl) {
                    onSelect(selectedUrl);
                    onOpenChange(false);
                  }
                }}
              >
                اختيار
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-xl">
              <label className="cursor-pointer flex flex-col items-center">
                <input
                  type="file"
                  onChange={handleUpload}
                  className="hidden"
                  accept={type === "image" ? "image/*" : undefined}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-lg font-medium">اضغط لرفع ملف</p>
                    <p className="text-sm text-muted-foreground">أو اسحب الملف هنا</p>
                  </>
                )}
              </label>
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="https://example.com/image.jpg"
                dir="ltr"
                value={selectedUrl || ""}
                onChange={(e) => setSelectedUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">أدخل رابط الصورة أو الملف الخارجي</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button 
                disabled={!selectedUrl} 
                onClick={() => {
                  if (selectedUrl) {
                    onSelect(selectedUrl);
                    onOpenChange(false);
                  }
                }}
              >
                استخدام الرابط
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
