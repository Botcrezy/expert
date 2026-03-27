import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink, Play, ShoppingBag, Star } from "lucide-react";
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

function normalizeImages(images: any): PortfolioMediaItem[] {
  if (!images) return [];
  if (typeof images === "string") return [{ name: "image", url: images, isCover: true, order: 0 }];
  if (!Array.isArray(images)) return [];
  return images
    .map((it: any, idx: number) => {
      if (typeof it === "string") return { name: `image_${idx + 1}`, url: it, order: idx } as PortfolioMediaItem;
      return {
        name: it?.name || `image_${idx + 1}`,
        url: it?.url || it?.publicUrl,
        path: it?.path,
        type: it?.type,
        size: it?.size,
        isCover: !!it?.isCover,
        order: typeof it?.order === "number" ? it.order : idx,
      } as PortfolioMediaItem;
    })
    .filter((x) => !!x.url);
}

type Addon = { id: string; title: string; price_egp: number; description?: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any | null;
  addons?: Addon[];
  stats?: { purchaseCount: number; ratingAvg: number; ratingCount: number };
  onBuy: (payload: { service: any; selectedAddons: Addon[]; total: number }) => void;
};

export function ServiceDetailsDialog({ open, onOpenChange, service, addons = [], stats, onBuy }: Props) {
  const images = useMemo(() => normalizeImages(service?.images), [service]);
  const cover = useMemo(() => getCover(service?.images), [service]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const selectedAddons = useMemo(() => addons.filter((a) => selectedAddonIds.includes(a.id)), [addons, selectedAddonIds]);
  const addonsTotal = useMemo(
    () => selectedAddons.reduce((sum, a) => sum + Number(a.price_egp || 0), 0),
    [selectedAddons]
  );
  const basePrice = Number(service?.price_egp || 0);
  const total = basePrice + addonsTotal;

  const deliverables = Array.isArray(service?.deliverables) ? (service.deliverables as any[]) : [];
  const requirements = Array.isArray(service?.requirements) ? (service.requirements as any[]) : [];

  const mainImage = activeImage || cover || images[0]?.url || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{service?.title || "تفاصيل الخدمة"}</DialogTitle>
          <DialogDescription>
            يمكنك معاينة التفاصيل واختيار الإضافات ثم متابعة الشراء.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Media */}
          <div className="space-y-3">
            <div className="aspect-video rounded-xl border border-border overflow-hidden bg-muted">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={`صورة خدمة: ${service?.title || ""}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  لا توجد صور
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
                    <img src={img.url} alt={`معاينة: ${service?.title || ""}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {service?.video_url && (
              <Card className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    <p className="text-sm font-medium">فيديو</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(service.video_url, "_blank")}> 
                    <ExternalLink className="w-4 h-4 ml-2" />
                    فتح
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {service?.short_description && (
              <p className="text-sm text-muted-foreground">{service.short_description}</p>
            )}

            {service?.description && (
              <div className="space-y-2">
                <p className="text-sm font-medium">الوصف</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.description}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {typeof service?.estimated_days === "number" && (
                <Badge variant="secondary">المدة: {service.estimated_days} يوم</Badge>
              )}
              {typeof service?.revisions_included === "number" && (
                <Badge variant="secondary">التعديلات: {service.revisions_included}</Badge>
              )}
              <Badge>السعر الأساسي: {basePrice} ج.م</Badge>
              {addonsTotal > 0 && <Badge variant="outline">إضافات: +{addonsTotal} ج.م</Badge>}
            </div>

            {stats && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  {Number(stats.purchaseCount || 0)} مرة شراء
                </Badge>
                <Badge variant="secondary" className="gap-2">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  {Number(stats.ratingAvg || 0).toFixed(1)} ({Number(stats.ratingCount || 0)} تقييم)
                </Badge>
              </div>
            )}

            {deliverables.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">المخرجات (Deliverables)</p>
                <ul className="list-disc pr-5 text-sm text-muted-foreground space-y-1">
                  {deliverables.map((d, idx) => (
                    <li key={idx}>{String(d)}</li>
                  ))}
                </ul>
              </div>
            )}

             {requirements.length > 0 && (
               <div className="space-y-2">
                 <p className="text-sm font-medium">متطلبات البدء</p>
                 <ul className="list-disc pr-5 text-sm text-muted-foreground space-y-1">
                   {requirements.map((r, idx) => (
                     <li key={idx}>{String(r)}</li>
                   ))}
                 </ul>
               </div>
             )}

             {Array.isArray(service?.attachments) && service.attachments.length > 0 && (
               <div className="space-y-2">
                 <p className="text-sm font-medium">ملفات مرفقة</p>
                 <div className="space-y-2">
                   {(service.attachments as any[]).map((f: any, idx: number) => (
                     <a
                       key={f?.url || f?.publicUrl || idx}
                       href={f?.url || f?.publicUrl}
                       target="_blank"
                       rel="noreferrer"
                       className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40"
                     >
                       <div className="min-w-0">
                         <p className="text-sm font-medium truncate">{f?.name || `ملف ${idx + 1}`}</p>
                         {f?.type && <p className="text-xs text-muted-foreground truncate">{String(f.type)}</p>}
                       </div>
                       <ExternalLink className="w-4 h-4 text-muted-foreground" />
                     </a>
                   ))}
                 </div>
               </div>
             )}

             {addons.length > 0 && (
               <div className="space-y-2">
                 <p className="text-sm font-medium">إضافات اختيارية</p>
                 <div className="space-y-2">
                   {addons.map((a) => {
                     const checked = selectedAddonIds.includes(a.id);
                     return (
                       <button
                         key={a.id}
                         type="button"
                         className={cn(
                           "w-full text-right rounded-xl border p-3 transition-colors",
                           checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                         )}
                         onClick={() =>
                           setSelectedAddonIds((prev) =>
                             prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                           )
                         }
                       >
                         <div className="flex items-start justify-between gap-3">
                           <div>
                             <p className="font-medium">{a.title}</p>
                             {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                           </div>
                           <p className="font-semibold">+{Number(a.price_egp || 0)} ج.م</p>
                         </div>
                       </button>
                     );
                   })}
                 </div>
               </div>
             )}

            <div className="pt-2 flex items-center justify-between">
              <p className="text-base font-semibold">الإجمالي: {total} ج.م</p>
              <Button onClick={() => onBuy({ service, selectedAddons, total })}>
                شراء الخدمة
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { normalizeImages, getCover };
