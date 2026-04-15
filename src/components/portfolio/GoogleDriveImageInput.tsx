import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, X, Star, ArrowUp, ArrowDown, Link as LinkIcon, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { parseGoogleDriveUrl } from "@/lib/googleDrive";
import type { PortfolioMediaItem } from "@/components/portfolio/PortfolioMediaUploader";

/**
 * Convert a Google Drive file ID to an embeddable thumbnail URL.
 * This avoids storing files in Supabase storage.
 */
export function driveFileIdToImageUrl(fileId: string, size = 1000): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${size}`;
}

/**
 * Try to extract a displayable image URL from a raw link.
 * Supports Google Drive share links and direct image URLs.
 */
export function resolveImageUrl(rawUrl: string): string {
  const parsed = parseGoogleDriveUrl(rawUrl);
  if (parsed) return driveFileIdToImageUrl(parsed.fileId);
  return rawUrl; // fallback: treat as direct image URL
}

type Props = {
  label: string;
  maxItems?: number;
  allowCover?: boolean;
  initialItems?: PortfolioMediaItem[];
  onChange: (items: PortfolioMediaItem[]) => void;
  className?: string;
  /** Accept only images (shows preview) or any link */
  imageOnly?: boolean;
};

export function GoogleDriveImageInput({
  label,
  maxItems = 12,
  allowCover = true,
  initialItems,
  onChange,
  className,
  imageOnly = true,
}: Props) {
  const [items, setItems] = useState<PortfolioMediaItem[]>(() => initialItems || []);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [coverIdx, setCoverIdx] = useState<number>(() => {
    const idx = (initialItems || []).findIndex((x) => x.isCover);
    return idx >= 0 ? idx : 0;
  });

  const emit = (next: PortfolioMediaItem[], nextCover?: number) => {
    const ci = nextCover ?? coverIdx;
    const withCover = next.map((item, i) => ({
      ...item,
      isCover: allowCover && i === ci,
      order: i,
    }));
    setItems(withCover);
    onChange(withCover);
  };

  const addLink = () => {
    const raw = newUrl.trim();
    if (!raw) return;

    try {
      new URL(raw);
    } catch {
      setError("الرابط غير صالح");
      return;
    }

    if (items.length >= maxItems) {
      setError(`الحد الأقصى ${maxItems} عنصر`);
      return;
    }

    const resolvedUrl = resolveImageUrl(raw);
    const driveInfo = parseGoogleDriveUrl(raw);

    const newItem: PortfolioMediaItem = {
      name: newLabel.trim() || (driveInfo ? `Drive Image` : "صورة"),
      url: resolvedUrl,
      path: raw, // store original link for reference
      type: "image/link",
      isCover: false,
      order: items.length,
    };

    setError(null);
    setNewUrl("");
    setNewLabel("");
    emit([...items, newItem]);
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    let nextCover = coverIdx;
    if (idx === coverIdx) nextCover = 0;
    else if (idx < coverIdx) nextCover = coverIdx - 1;
    setCoverIdx(Math.max(0, nextCover));
    emit(next, Math.max(0, nextCover));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    let nextCover = coverIdx;
    if (coverIdx === from) nextCover = to;
    else if (from < coverIdx && to >= coverIdx) nextCover--;
    else if (from > coverIdx && to <= coverIdx) nextCover++;
    setCoverIdx(nextCover);
    emit(next, nextCover);
  };

  const setCover = (idx: number) => {
    setCoverIdx(idx);
    emit(items, idx);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">{label}</Label>

      {/* Add link form */}
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-border bg-muted/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LinkIcon className="w-3.5 h-3.5" />
          <span>أضف رابط صورة من Google Drive (اجعل الرابط عام) أو أي رابط صورة مباشر</span>
        </div>
        <div className="flex gap-2">
          <Input
            dir="ltr"
            placeholder="https://drive.google.com/file/d/.../view"
            value={newUrl}
            onChange={(e) => { setNewUrl(e.target.value); setError(null); }}
            className="flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
            disabled={!newUrl.trim() || items.length >= maxItems}
          >
            <Plus className="w-4 h-4 ml-1" />
            إضافة
          </Button>
        </div>
        <Input
          placeholder="وصف / اسم (اختياري)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="text-sm"
        />
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          لا توجد صور بعد. أضف رابط أعلاه.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const isCover = allowCover && idx === coverIdx;
            return (
              <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
                {/* Thumbnail preview */}
                {imageOnly && item.url ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.innerHTML =
                          '<div class="w-full h-full flex items-center justify-center text-muted-foreground"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center border border-border flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {allowCover && isCover && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Star className="w-3 h-3" />
                        غلاف
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{item.path || item.url}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(idx, idx - 1)}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(idx, idx + 1)}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  {allowCover && (
                    <Button
                      type="button"
                      variant={isCover ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCover(idx)}
                      title="تعيين كغلاف"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            {allowCover ? "اختر صورة كغلاف من زر ⭐. " : ""}الحد الأقصى {maxItems} عنصر.
          </p>
        </div>
      )}
    </div>
  );
}
