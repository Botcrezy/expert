import { useEffect, useMemo, useState } from "react";
import { useFileUpload, type UploadedFile } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, X, ArrowUp, ArrowDown, Star, FileImage, FileText, File } from "lucide-react";

export type PortfolioMediaItem = {
  name: string;
  url?: string;
  path?: string;
  type?: string;
  size?: number;
  isCover?: boolean;
  order?: number;
};

type Props = {
  label: string;
  bucket?: string;
  folder: string;
  accept?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  initialItems?: PortfolioMediaItem[];
  allowCover?: boolean;
  onChange: (items: PortfolioMediaItem[]) => void;
  className?: string;
};

const iconFor = (type?: string) => {
  if (!type) return File;
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("pdf") || type.includes("document")) return FileText;
  return File;
};

export function PortfolioMediaUploader({
  label,
  bucket = "portfolio-assets",
  folder,
  accept = "*",
  maxFiles = 12,
  maxSizeMb = 50,
  initialItems,
  allowCover = true,
  onChange,
  className,
}: Props) {
  const { files, uploading, uploadFiles, removeFile, setFiles } = useFileUpload({
    bucket,
    folder,
    maxSize: maxSizeMb,
  });

  const [coverPath, setCoverPath] = useState<string | null>(null);

  // Hydrate existing items into internal uploader state
  useEffect(() => {
    const normalized = (initialItems || [])
      .filter(Boolean)
      .map((it) => {
        const id = it.path || it.url || it.name;
        return {
          id,
          name: it.name,
          size: it.size || 0,
          type: it.type || "",
          progress: 100,
          url: it.url,
          path: it.path,
        } satisfies UploadedFile;
      });

    setFiles(normalized);

    const initialCover = (initialItems || []).find((x) => x?.isCover);
    setCoverPath(initialCover?.path || initialCover?.url || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  const items: PortfolioMediaItem[] = useMemo(() => {
    const ready = (files || [])
      .filter((f) => f.progress === 100 && !f.error)
      .map((f, idx) => {
        const pathOrUrl = f.path || f.url || "";
        const isCover = allowCover && !!coverPath && pathOrUrl === coverPath;
        return {
          name: f.name,
          url: f.url,
          path: f.path,
          type: f.type,
          size: f.size,
          isCover,
          order: idx,
        };
      });

    // If no cover chosen, default to first item
    if (allowCover && ready.length > 0 && !ready.some((x) => x.isCover)) {
      ready[0].isCover = true;
    }

    return ready;
  }, [files, coverPath, allowCover]);

  useEffect(() => {
    onChange(items);
  }, [items, onChange]);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!selected.length) return;

    const remaining = Math.max(0, maxFiles - files.length);
    await uploadFiles(selected.slice(0, remaining));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const next = [...files];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setFiles(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="relative">
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading || files.length >= maxFiles}
          />
          <Button variant="outline" size="sm" disabled={uploading || files.length >= maxFiles}>
            <Upload className="w-4 h-4 ml-2" />
            إضافة ملفات
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          لا توجد ملفات بعد.
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f, idx) => {
            const Icon = iconFor(f.type);
            const id = f.path || f.url || f.id;
            const isCover = allowCover && !!coverPath && id === coverPath;
            const isReady = f.progress === 100 && !f.error;

            return (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    {allowCover && isCover && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="w-3.5 h-3.5" />
                        غلاف
                      </Badge>
                    )}
                  </div>

                  {!isReady && !f.error && <Progress value={f.progress} className="h-1 mt-2" />}
                  {f.error && <p className="text-xs text-destructive mt-1">{f.error}</p>}
                </div>

                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => move(idx, idx - 1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => move(idx, idx + 1)}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>

                  {allowCover && isReady && (
                    <Button
                      type="button"
                      variant={isCover ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setCoverPath(f.path || f.url || null)}
                      title="تعيين كغلاف"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}

                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(f.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground">
            {allowCover ? "اختر ملف كغلاف من زر ⭐. " : ""}الحد الأقصى {maxFiles} ملف.
          </p>
        </div>
      )}
    </div>
  );
}
