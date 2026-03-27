import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink, FileText, Image as ImageIcon, Play } from "lucide-react";
import { useMemo, useState } from "react";

export type PortfolioMediaItem = {
  name: string;
  url?: string;
  path?: string;
  type?: string;
  size?: number;
  isCover?: boolean;
  order?: number;
};

function getCover(items?: any): string | null {
  const arr = Array.isArray(items) ? items : [];
  const cover = arr.find((x) => x && typeof x === "object" && x.isCover && (x.url || x.publicUrl));
  if (cover?.url) return cover.url;
  if (cover?.publicUrl) return cover.publicUrl;
  const first = arr[0];
  if (!first) return null;
  if (typeof first === "string") return first;
  return first.url || first.publicUrl || null;
}

function normalizeMedia(items: any): PortfolioMediaItem[] {
  if (!items) return [];
  if (typeof items === "string" && items.trim()) return [{ name: "item", url: items, isCover: true, order: 0 }];
  if (!Array.isArray(items)) return [];
  return items
    .map((it: any, idx: number) => {
      if (typeof it === "string") return { name: `item_${idx + 1}`, url: it, order: idx } as PortfolioMediaItem;
      return {
        name: it?.name || `item_${idx + 1}`,
        url: it?.url || it?.publicUrl,
        path: it?.path,
        type: it?.type,
        size: it?.size,
        isCover: !!it?.isCover,
        order: typeof it?.order === "number" ? it.order : idx,
      } as PortfolioMediaItem;
    })
    .filter((x: any) => !!x?.url);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any | null;
};

export function ProjectDetailsDialog({ open, onOpenChange, project }: Props) {
  const images = useMemo(() => normalizeMedia(project?.images), [project]);
  const attachments = useMemo(() => normalizeMedia(project?.attachments), [project]);
  const cover = useMemo(() => getCover(project?.images), [project]);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const mainImage = activeImage || cover || images[0]?.url || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{project?.title || "تفاصيل العمل"}</DialogTitle>
          <DialogDescription>معاينة صور العمل والملفات والمعلومات.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Media */}
          <div className="space-y-3">
            <div className="aspect-video rounded-xl border border-border overflow-hidden bg-muted">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={`صورة مشروع: ${project?.title || ""}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    لا توجد صور
                  </div>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-auto pb-1">
                {images.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    className={cn(
                      "h-16 w-24 shrink-0 overflow-hidden rounded-lg border",
                      (activeImage || cover || images[0]?.url) === img.url ? "border-primary" : "border-border"
                    )}
                    onClick={() => setActiveImage(img.url || null)}
                  >
                    <img src={img.url} alt={`معاينة: ${project?.title || ""}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {project?.video_url && (
              <Card className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    <p className="text-sm font-medium">فيديو</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(project.video_url, "_blank")}>
                    <ExternalLink className="w-4 h-4 ml-2" />
                    فتح
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {project?.project_type && <Badge variant="secondary">النوع: {project.project_type}</Badge>}
              {project?.external_link && <Badge variant="outline">رابط خارجي</Badge>}
            </div>

            {project?.description && (
              <div className="space-y-2">
                <p className="text-sm font-medium">الوصف</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
              </div>
            )}

            {project?.external_link && (
              <Button className="w-full" variant="outline" onClick={() => window.open(project.external_link, "_blank")}>
                <ExternalLink className="w-4 h-4 ml-2" />
                فتح الرابط الخارجي
              </Button>
            )}

            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">ملفات مرفقة</p>
                <div className="space-y-2">
                  {attachments.map((f, idx) => (
                    <a
                      key={f.url || idx}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{f.name}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
