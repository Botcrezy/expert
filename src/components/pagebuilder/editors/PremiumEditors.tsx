import { PageBlock } from "../BlockTypes";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

export function TrustBarEditor({
  block,
  onChange,
}: {
  block: PageBlock & { type: "trustbar" };
  onChange: (b: PageBlock) => void;
}) {
  const update = (key: string, value: any) => onChange({ ...block, data: { ...block.data, [key]: value } });

  const logos = Array.isArray(block.data.logos) ? block.data.logos : [];
  const highlights = Array.isArray(block.data.highlights) ? block.data.highlights : [];

  const addLogo = () => update("logos", [...logos, { src: "", alt: "شعار" }]);
  const rmLogo = (i: number) => update("logos", logos.filter((_: any, idx: number) => idx !== i));
  const setLogo = (i: number, key: string, value: string) => {
    const next = [...logos];
    next[i] = { ...next[i], [key]: value };
    update("logos", next);
  };

  const addHighlight = () => update("highlights", [...highlights, { icon: "check", label: "ضمان الجودة" }]);
  const rmHighlight = (i: number) => update("highlights", highlights.filter((_: any, idx: number) => idx !== i));
  const setHighlight = (i: number, key: string, value: string) => {
    const next = [...highlights];
    next[i] = { ...next[i], [key]: value };
    update("highlights", next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>عنوان صغير (اختياري)</Label>
        <Input value={block.data.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الشعارات</Label>
          <Button size="sm" variant="outline" onClick={addLogo}>
            <Plus className="w-4 h-4 ml-1" /> إضافة
          </Button>
        </div>

        {logos.map((l: any, i: number) => (
          <div key={i} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">شعار {i + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => rmLogo(i)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <Input placeholder="رابط الصورة" value={l.src || ""} onChange={(e) => setLogo(i, "src", e.target.value)} dir="ltr" />
            <Input placeholder="alt" value={l.alt || ""} onChange={(e) => setLogo(i, "alt", e.target.value)} />
            <Input placeholder="رابط عند الضغط (اختياري)" value={l.url || ""} onChange={(e) => setLogo(i, "url", e.target.value)} dir="ltr" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>نِقَاط الثقة (اختياري)</Label>
          <Button size="sm" variant="outline" onClick={addHighlight}>
            <Plus className="w-4 h-4 ml-1" /> إضافة
          </Button>
        </div>

        {highlights.map((h: any, i: number) => (
          <div key={i} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">نقطة {i + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => rmHighlight(i)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <Input placeholder="الأيقونة (sparkles/shield/check)" value={h.icon || ""} onChange={(e) => setHighlight(i, "icon", e.target.value)} dir="ltr" />
            <Input placeholder="النص" value={h.label || ""} onChange={(e) => setHighlight(i, "label", e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServiceCategoriesEditor({
  block,
  onChange,
}: {
  block: PageBlock & { type: "service_categories" };
  onChange: (b: PageBlock) => void;
}) {
  const update = (key: string, value: any) => onChange({ ...block, data: { ...block.data, [key]: value } });

  const items = Array.isArray(block.data.customItems) ? block.data.customItems : [];

  const addItem = () => update("customItems", [...items, { name: "Service", name_ar: "خدمة", description: "" }]);
  const rmItem = (i: number) => update("customItems", items.filter((_: any, idx: number) => idx !== i));
  const setItem = (i: number, key: string, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: value };
    update("customItems", next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>جلب التصنيفات من قاعدة البيانات</Label>
        <Switch checked={!!block.data.showFromDatabase} onCheckedChange={(v) => update("showFromDatabase", v)} />
      </div>

      {!block.data.showFromDatabase ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>عناصر مخصصة</Label>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="w-4 h-4 ml-1" /> إضافة
            </Button>
          </div>

          {items.map((it: any, i: number) => (
            <div key={i} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">عنصر {i + 1}</span>
                <Button size="icon" variant="ghost" onClick={() => rmItem(i)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <Input placeholder="الاسم عربي" value={it.name_ar || ""} onChange={(e) => setItem(i, "name_ar", e.target.value)} />
              <Input placeholder="الاسم إنجليزي" value={it.name || ""} onChange={(e) => setItem(i, "name", e.target.value)} dir="ltr" />
              <Textarea placeholder="الوصف" value={it.description || ""} onChange={(e) => setItem(i, "description", e.target.value)} rows={2} />
              <Input placeholder="URL (اختياري)" value={it.url || ""} onChange={(e) => setItem(i, "url", e.target.value)} dir="ltr" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TestimonialsCarouselEditor({
  block,
  onChange,
}: {
  block: PageBlock & { type: "testimonials_carousel" };
  onChange: (b: PageBlock) => void;
}) {
  const update = (key: string, value: any) => onChange({ ...block, data: { ...block.data, [key]: value } });

  const items = Array.isArray(block.data.customTestimonials) ? block.data.customTestimonials : [];
  const add = () => update("customTestimonials", [...items, { name: "عميل", role: "", content: "رأي العميل", rating: 5 }]);
  const rm = (i: number) => update("customTestimonials", items.filter((_: any, idx: number) => idx !== i));
  const set = (i: number, key: string, value: any) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: value };
    update("customTestimonials", next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>جلب الآراء من قاعدة البيانات</Label>
        <Switch checked={!!block.data.showFromDatabase} onCheckedChange={(v) => update("showFromDatabase", v)} />
      </div>

      {!block.data.showFromDatabase ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>آراء مخصصة</Label>
            <Button size="sm" variant="outline" onClick={add}>
              <Plus className="w-4 h-4 ml-1" /> إضافة
            </Button>
          </div>

          {items.map((t: any, i: number) => (
            <div key={i} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">رأي {i + 1}</span>
                <Button size="icon" variant="ghost" onClick={() => rm(i)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <Input placeholder="الاسم" value={t.name || ""} onChange={(e) => set(i, "name", e.target.value)} />
              <Input placeholder="المنصب (اختياري)" value={t.role || ""} onChange={(e) => set(i, "role", e.target.value)} />
              <Textarea placeholder="النص" value={t.content || ""} onChange={(e) => set(i, "content", e.target.value)} rows={3} />
              <Input placeholder="التقييم (1-5)" value={String(t.rating ?? 5)} onChange={(e) => set(i, "rating", Number(e.target.value || 5))} dir="ltr" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PricingCompareEditor({
  block,
  onChange,
}: {
  block: PageBlock & { type: "pricing_compare" };
  onChange: (b: PageBlock) => void;
}) {
  const update = (key: string, value: any) => onChange({ ...block, data: { ...block.data, [key]: value } });

  const plans = Array.isArray(block.data.plans) ? block.data.plans : [];

  const addPlan = () =>
    update("plans", [
      ...plans,
      {
        name: "خطة جديدة",
        price: "0",
        period: "شهرياً",
        features: ["ميزة 1"],
        ctaText: "ابدأ",
        ctaLink: "/register",
      },
    ]);

  const rmPlan = (i: number) => update("plans", plans.filter((_: any, idx: number) => idx !== i));
  const setPlan = (i: number, key: string, value: any) => {
    const next = [...plans];
    next[i] = { ...next[i], [key]: value };
    update("plans", next);
  };

  const setFeature = (planIndex: number, featureIndex: number, value: string) => {
    const next = [...plans];
    const features = Array.isArray(next[planIndex].features) ? [...next[planIndex].features] : [];
    features[featureIndex] = value;
    next[planIndex] = { ...next[planIndex], features };
    update("plans", next);
  };

  const addFeature = (planIndex: number) => {
    const next = [...plans];
    const features = Array.isArray(next[planIndex].features) ? [...next[planIndex].features] : [];
    features.push("ميزة جديدة");
    next[planIndex] = { ...next[planIndex], features };
    update("plans", next);
  };

  const rmFeature = (planIndex: number, featureIndex: number) => {
    const next = [...plans];
    const features = Array.isArray(next[planIndex].features) ? [...next[planIndex].features] : [];
    next[planIndex] = { ...next[planIndex], features: features.filter((_: any, idx: number) => idx !== featureIndex) };
    update("plans", next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>رقم الخطة المميزة (0-based)</Label>
        <Input value={String(block.data.highlightedIndex ?? 1)} onChange={(e) => update("highlightedIndex", Number(e.target.value || 0))} dir="ltr" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الخطط</Label>
          <Button size="sm" variant="outline" onClick={addPlan}>
            <Plus className="w-4 h-4 ml-1" /> إضافة
          </Button>
        </div>

        {plans.map((p: any, i: number) => (
          <div key={i} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">خطة {i + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => rmPlan(i)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <Input placeholder="الاسم" value={p.name || ""} onChange={(e) => setPlan(i, "name", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="السعر" value={p.price || ""} onChange={(e) => setPlan(i, "price", e.target.value)} dir="ltr" />
              <Input placeholder="الفترة" value={p.period || ""} onChange={(e) => setPlan(i, "period", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="نص الزر" value={p.ctaText || ""} onChange={(e) => setPlan(i, "ctaText", e.target.value)} />
              <Input placeholder="رابط الزر" value={p.ctaLink || ""} onChange={(e) => setPlan(i, "ctaLink", e.target.value)} dir="ltr" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">الميزات</Label>
                <Button size="sm" variant="outline" onClick={() => addFeature(i)}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة ميزة
                </Button>
              </div>
              {(p.features || []).map((f: string, fi: number) => (
                <div key={fi} className="flex gap-2">
                  <Input value={f} onChange={(e) => setFeature(i, fi, e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => rmFeature(i, fi)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FAQProEditor({
  block,
  onChange,
}: {
  block: PageBlock & { type: "faq_pro" };
  onChange: (b: PageBlock) => void;
}) {
  const update = (key: string, value: any) => onChange({ ...block, data: { ...block.data, [key]: value } });

  const faqs = Array.isArray(block.data.faqs) ? block.data.faqs : [];

  const addFAQ = () => update("faqs", [...faqs, { question: "سؤال جديد؟", answer: "إجابة السؤال", category: "" }]);
  const rmFAQ = (i: number) => update("faqs", faqs.filter((_: any, idx: number) => idx !== i));
  const setFAQ = (i: number, key: string, value: string) => {
    const next = [...faqs];
    next[i] = { ...next[i], [key]: value };
    update("faqs", next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>تفعيل البحث</Label>
        <Switch checked={!!block.data.enableSearch} onCheckedChange={(v) => update("enableSearch", v)} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الأسئلة</Label>
          <Button size="sm" variant="outline" onClick={addFAQ}>
            <Plus className="w-4 h-4 ml-1" /> إضافة
          </Button>
        </div>

        {faqs.map((f: any, i: number) => (
          <div key={i} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">سؤال {i + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => rmFAQ(i)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <Input placeholder="التصنيف (اختياري)" value={f.category || ""} onChange={(e) => setFAQ(i, "category", e.target.value)} />
            <Input placeholder="السؤال" value={f.question || ""} onChange={(e) => setFAQ(i, "question", e.target.value)} />
            <Textarea placeholder="الإجابة" value={f.answer || ""} onChange={(e) => setFAQ(i, "answer", e.target.value)} rows={3} />
          </div>
        ))}
      </div>
    </div>
  );
}
