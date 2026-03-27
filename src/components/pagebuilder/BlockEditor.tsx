import { useState } from "react";
import { PageBlock, BLOCK_TYPES } from "./BlockTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Settings, Image as ImageIcon } from "lucide-react";
import { StyleEditor } from "./StyleEditor";
import { FilePickerDialog } from "./FilePickerDialog";
import {
  FAQProEditorWrapper,
  PricingCompareEditorWrapper,
  ServiceCategoriesEditorWrapper,
  TestimonialsCarouselEditorWrapper,
  TrustBarEditorWrapper,
} from "./PremiumEditorWrappers";

interface BlockEditorProps {
  block: PageBlock;
  onChange: (block: PageBlock) => void;
  onClose: () => void;
}

export function BlockEditor({ block, onChange, onClose }: BlockEditorProps) {
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [filePickerTarget, setFilePickerTarget] = useState<string | null>(null);

  const updateData = (key: string, value: any) => {
    onChange({
      ...block,
      data: { ...block.data, [key]: value },
    } as PageBlock);
  };

  const openFilePicker = (targetKey: string) => {
    setFilePickerTarget(targetKey);
    setFilePickerOpen(true);
  };

  const handleFileSelect = (url: string) => {
    if (filePickerTarget) {
      updateData(filePickerTarget, url);
    }
  };

  const renderDataEditor = () => {
    switch (block.type) {
      case "hero":
        return <HeroEditor block={block} onChange={onChange} openFilePicker={openFilePicker} />;
      case "trustbar":
        return <TrustBarEditorWrapper block={block as any} onChange={onChange} />;
      case "features":
        return <FeaturesEditor block={block} onChange={onChange} />;
      case "services":
        return <ServicesEditor block={block} onChange={onChange} />;
      case "service_categories":
        return <ServiceCategoriesEditorWrapper block={block as any} onChange={onChange} />;
      case "testimonials":
        return <TestimonialsEditor block={block} onChange={onChange} />;
      case "testimonials_carousel":
        return <TestimonialsCarouselEditorWrapper block={block as any} onChange={onChange} />;
      case "pricing":
        return <PricingEditor block={block} onChange={onChange} />;
      case "pricing_compare":
        return <PricingCompareEditorWrapper block={block as any} onChange={onChange} />;
      case "cta":
        return <CTAEditor block={block} onChange={onChange} />;
      case "faq":
        return <FAQEditor block={block} onChange={onChange} />;
      case "faq_pro":
        return <FAQProEditorWrapper block={block as any} onChange={onChange} />;
      case "steps":
        return <StepsEditor block={block} onChange={onChange} />;
      case "text":
        return <TextEditor block={block} onChange={onChange} />;
      case "image":
        return <ImageEditor block={block} onChange={onChange} openFilePicker={openFilePicker} />;
      case "spacer":
        return <SpacerEditor block={block} onChange={onChange} />;
      case "divider":
        return <DividerEditor block={block} onChange={onChange} />;
      case "table":
        return <TableEditor block={block} onChange={onChange} />;
      case "gallery":
        return <GalleryEditor block={block} onChange={onChange} openFilePicker={openFilePicker} />;
      case "team":
        return <TeamEditor block={block} onChange={onChange} openFilePicker={openFilePicker} />;
      case "counter":
        return <CounterEditor block={block} onChange={onChange} />;
      case "timeline":
        return <TimelineEditor block={block} onChange={onChange} />;
      default:
        return <GenericBlockEditor block={block} onChange={onChange} updateData={updateData} openFilePicker={openFilePicker} />;
    }
  };

  return (
    <>
      <Sheet open={true} onOpenChange={() => onClose()}>
        <SheetContent side="left" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              تعديل: {BLOCK_TYPES.find(t => t.type === block.type)?.label}
            </SheetTitle>
          </SheetHeader>
          
          <Tabs defaultValue="content" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1">المحتوى</TabsTrigger>
              <TabsTrigger value="style" className="flex-1">التنسيق</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-4 mt-4">
              {renderDataEditor()}
            </TabsContent>
            
            <TabsContent value="style" className="mt-4">
              <StyleEditor block={block} onChange={onChange} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <FilePickerDialog 
        open={filePickerOpen} 
        onOpenChange={setFilePickerOpen}
        onSelect={handleFileSelect}
        type="image"
      />
    </>
  );
}

// Hero Editor
function HeroEditor({ block, onChange, openFilePicker }: { block: PageBlock & { type: "hero" }; onChange: (b: PageBlock) => void; openFilePicker: (key: string) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان الرئيسي</Label>
        <Input value={block.data.title} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Textarea value={block.data.subtitle} onChange={(e) => updateData("subtitle", e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>نص الزر الرئيسي</Label>
          <Input value={block.data.ctaText} onChange={(e) => updateData("ctaText", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>رابط الزر</Label>
          <Input value={block.data.ctaLink} onChange={(e) => updateData("ctaLink", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>نص الزر الثانوي</Label>
          <Input value={block.data.secondaryCtaText || ""} onChange={(e) => updateData("secondaryCtaText", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>رابط الزر الثانوي</Label>
          <Input value={block.data.secondaryCtaLink || ""} onChange={(e) => updateData("secondaryCtaLink", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>صورة الخلفية</Label>
        <div className="flex gap-2">
          <Input value={block.data.backgroundImage || ""} onChange={(e) => updateData("backgroundImage", e.target.value)} />
          <Button variant="outline" size="icon" onClick={() => openFilePicker("backgroundImage")}>
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>إظهار الإحصائيات</Label>
        <Switch checked={block.data.showStats} onCheckedChange={(v) => updateData("showStats", v)} />
      </div>
    </div>
  );
}

// Features Editor
function FeaturesEditor({ block, onChange }: { block: PageBlock & { type: "features" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  const updateFeature = (index: number, key: string, value: string) => {
    const features = [...block.data.features];
    features[index] = { ...features[index], [key]: value };
    updateData("features", features);
  };

  const addFeature = () => {
    updateData("features", [...block.data.features, { icon: "Sparkles", title: "ميزة جديدة", description: "وصف الميزة", color: "from-blue-500 to-cyan-500" }]);
  };

  const removeFeature = (index: number) => {
    updateData("features", block.data.features.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle} onChange={(e) => updateData("subtitle", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>عدد الأعمدة</Label>
        <Select value={String(block.data.columns)} onValueChange={(v) => updateData("columns", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 أعمدة</SelectItem>
            <SelectItem value="3">3 أعمدة</SelectItem>
            <SelectItem value="4">4 أعمدة</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>المميزات</Label>
          <Button size="sm" variant="outline" onClick={addFeature}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
        </div>
        {block.data.features.map((feature, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ميزة {index + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => removeFeature(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
            <Input placeholder="العنوان" value={feature.title} onChange={(e) => updateFeature(index, "title", e.target.value)} />
            <Input placeholder="الوصف" value={feature.description} onChange={(e) => updateFeature(index, "description", e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Services Editor
function ServicesEditor({ block, onChange }: { block: PageBlock & { type: "services" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle} onChange={(e) => updateData("subtitle", e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>جلب الخدمات من قاعدة البيانات</Label>
        <Switch checked={block.data.showFromDatabase} onCheckedChange={(v) => updateData("showFromDatabase", v)} />
      </div>
    </div>
  );
}

// Testimonials Editor
function TestimonialsEditor({ block, onChange }: { block: PageBlock & { type: "testimonials" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle} onChange={(e) => updateData("subtitle", e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>جلب الآراء من قاعدة البيانات</Label>
        <Switch checked={block.data.showFromDatabase} onCheckedChange={(v) => updateData("showFromDatabase", v)} />
      </div>
    </div>
  );
}

// Pricing Editor
function PricingEditor({ block, onChange }: { block: PageBlock & { type: "pricing" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle} onChange={(e) => updateData("subtitle", e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>جلب الباقات من قاعدة البيانات</Label>
        <Switch checked={block.data.showFromDatabase} onCheckedChange={(v) => updateData("showFromDatabase", v)} />
      </div>
    </div>
  );
}

// CTA Editor
function CTAEditor({ block, onChange }: { block: PageBlock & { type: "cta" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle} onChange={(e) => updateData("subtitle", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>نص الزر</Label>
          <Input value={block.data.buttonText} onChange={(e) => updateData("buttonText", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>رابط الزر</Label>
          <Input value={block.data.buttonLink} onChange={(e) => updateData("buttonLink", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>النمط</Label>
        <Select value={block.data.style} onValueChange={(v: "primary" | "gradient" | "dark") => updateData("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">أساسي</SelectItem>
            <SelectItem value="gradient">تدرج</SelectItem>
            <SelectItem value="dark">داكن</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// FAQ Editor
function FAQEditor({ block, onChange }: { block: PageBlock & { type: "faq" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  const updateFAQ = (index: number, key: string, value: string) => {
    const faqs = [...block.data.faqs];
    faqs[index] = { ...faqs[index], [key]: value };
    updateData("faqs", faqs);
  };

  const addFAQ = () => {
    updateData("faqs", [...block.data.faqs, { question: "سؤال جديد؟", answer: "إجابة السؤال" }]);
  };

  const removeFAQ = (index: number) => {
    updateData("faqs", block.data.faqs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle} onChange={(e) => updateData("subtitle", e.target.value)} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الأسئلة</Label>
          <Button size="sm" variant="outline" onClick={addFAQ}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
        </div>
        {block.data.faqs.map((faq, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">سؤال {index + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => removeFAQ(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
            <Input placeholder="السؤال" value={faq.question} onChange={(e) => updateFAQ(index, "question", e.target.value)} />
            <Textarea placeholder="الإجابة" value={faq.answer} onChange={(e) => updateFAQ(index, "answer", e.target.value)} rows={2} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Steps Editor
function StepsEditor({ block, onChange }: { block: PageBlock & { type: "steps" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  const updateStep = (index: number, key: string, value: string) => {
    const steps = [...block.data.steps];
    steps[index] = { ...steps[index], [key]: value };
    updateData("steps", steps);
  };

  const addStep = () => {
    const num = block.data.steps.length + 1;
    updateData("steps", [...block.data.steps, { number: String(num).padStart(2, "0"), icon: "Target", title: "خطوة جديدة", description: "وصف الخطوة" }]);
  };

  const removeStep = (index: number) => {
    updateData("steps", block.data.steps.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={block.data.title} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={block.data.subtitle} onChange={(e) => updateData("subtitle", e.target.value)} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الخطوات</Label>
          <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
        </div>
        {block.data.steps.map((step, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">خطوة {step.number}</span>
              <Button size="icon" variant="ghost" onClick={() => removeStep(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
            <Input placeholder="العنوان" value={step.title} onChange={(e) => updateStep(index, "title", e.target.value)} />
            <Input placeholder="الوصف" value={step.description} onChange={(e) => updateStep(index, "description", e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Text Editor
function TextEditor({ block, onChange }: { block: PageBlock & { type: "text" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>المحتوى</Label>
        <Textarea value={block.data.content} onChange={(e) => updateData("content", e.target.value)} rows={10} />
      </div>
    </div>
  );
}

// Image Editor
function ImageEditor({ block, onChange, openFilePicker }: { block: PageBlock & { type: "image" }; onChange: (b: PageBlock) => void; openFilePicker: (key: string) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>رابط الصورة</Label>
        <div className="flex gap-2">
          <Input value={block.data.src} onChange={(e) => updateData("src", e.target.value)} />
          <Button variant="outline" size="icon" onClick={() => openFilePicker("src")}>
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>النص البديل</Label>
        <Input value={block.data.alt} onChange={(e) => updateData("alt", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>التعليق</Label>
        <Input value={block.data.caption || ""} onChange={(e) => updateData("caption", e.target.value)} />
      </div>
    </div>
  );
}

// Spacer Editor
function SpacerEditor({ block, onChange }: { block: PageBlock & { type: "spacer" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>الارتفاع (بكسل)</Label>
        <Input type="number" value={block.data.height} onChange={(e) => updateData("height", parseInt(e.target.value))} />
      </div>
    </div>
  );
}

// Divider Editor
function DividerEditor({ block, onChange }: { block: PageBlock & { type: "divider" }; onChange: (b: PageBlock) => void }) {
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>النمط</Label>
        <Select value={block.data.style} onValueChange={(v: "solid" | "dashed" | "dotted") => updateData("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">متصل</SelectItem>
            <SelectItem value="dashed">متقطع</SelectItem>
            <SelectItem value="dotted">منقط</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Table Editor
function TableEditor({ block, onChange }: { block: PageBlock; onChange: (b: PageBlock) => void }) {
  const data = block.data as any;
  
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...data, [key]: value } } as PageBlock);
  };

  const headers = data.headers || ["عنوان 1", "عنوان 2", "عنوان 3"];
  const rows = data.rows || [["بيانات 1", "بيانات 2", "بيانات 3"]];

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    updateData("headers", newHeaders);
  };

  const addHeader = () => {
    updateData("headers", [...headers, "عنوان جديد"]);
    updateData("rows", rows.map((row: string[]) => [...row, ""]));
  };

  const removeHeader = (index: number) => {
    if (headers.length <= 1) return;
    updateData("headers", headers.filter((_: string, i: number) => i !== index));
    updateData("rows", rows.map((row: string[]) => row.filter((_: string, i: number) => i !== index)));
  };

  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    const newRows = rows.map((row: string[], ri: number) => 
      ri === rowIndex ? row.map((cell: string, ci: number) => ci === cellIndex ? value : cell) : row
    );
    updateData("rows", newRows);
  };

  const addRow = () => {
    updateData("rows", [...rows, headers.map(() => "")]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    updateData("rows", rows.filter((_: string[], i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>رؤوس الجدول</Label>
          <Button size="sm" variant="outline" onClick={addHeader}>
            <Plus className="w-4 h-4 ml-1" />إضافة عمود
          </Button>
        </div>
        <div className="space-y-2">
          {headers.map((header: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input 
                value={header} 
                onChange={(e) => updateHeader(index, e.target.value)}
                placeholder={`عنوان ${index + 1}`}
              />
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => removeHeader(index)}
                disabled={headers.length <= 1}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الصفوف</Label>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="w-4 h-4 ml-1" />إضافة صف
          </Button>
        </div>
        <div className="space-y-3">
          {rows.map((row: string[], rowIndex: number) => (
            <div key={rowIndex} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">صف {rowIndex + 1}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => removeRow(rowIndex)}
                  disabled={rows.length <= 1}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}>
                {row.map((cell: string, cellIndex: number) => (
                  <Input 
                    key={cellIndex}
                    value={cell} 
                    onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
                    placeholder={headers[cellIndex]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>صفوف متناوبة</Label>
        <Switch checked={data.striped || false} onCheckedChange={(v) => updateData("striped", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label>تأثير التمرير</Label>
        <Switch checked={data.hoverable || false} onCheckedChange={(v) => updateData("hoverable", v)} />
      </div>
    </div>
  );
}

// Gallery Editor
function GalleryEditor({ block, onChange, openFilePicker }: { block: PageBlock; onChange: (b: PageBlock) => void; openFilePicker: (key: string) => void }) {
  const data = block.data as any;
  
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...data, [key]: value } } as PageBlock);
  };

  const images = data.images || [];

  const addImage = () => {
    updateData("images", [...images, { src: "", alt: "", caption: "" }]);
  };

  const updateImage = (index: number, key: string, value: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], [key]: value };
    updateData("images", newImages);
  };

  const removeImage = (index: number) => {
    updateData("images", images.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={data.title || ""} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>عدد الأعمدة</Label>
        <Select value={String(data.columns || 3)} onValueChange={(v) => updateData("columns", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 أعمدة</SelectItem>
            <SelectItem value="3">3 أعمدة</SelectItem>
            <SelectItem value="4">4 أعمدة</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الصور</Label>
          <Button size="sm" variant="outline" onClick={addImage}>
            <Plus className="w-4 h-4 ml-1" />إضافة صورة
          </Button>
        </div>
        {images.map((img: any, index: number) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">صورة {index + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => removeImage(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="رابط الصورة" value={img.src} onChange={(e) => updateImage(index, "src", e.target.value)} />
              <Button variant="outline" size="icon" onClick={() => openFilePicker(`images.${index}.src`)}>
                <ImageIcon className="w-4 h-4" />
              </Button>
            </div>
            <Input placeholder="النص البديل" value={img.alt} onChange={(e) => updateImage(index, "alt", e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Team Editor
function TeamEditor({ block, onChange, openFilePicker }: { block: PageBlock; onChange: (b: PageBlock) => void; openFilePicker: (key: string) => void }) {
  const data = block.data as any;
  
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...data, [key]: value } } as PageBlock);
  };

  const members = data.members || [];

  const addMember = () => {
    updateData("members", [...members, { name: "", role: "", image: "", bio: "" }]);
  };

  const updateMember = (index: number, key: string, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [key]: value };
    updateData("members", newMembers);
  };

  const removeMember = (index: number) => {
    updateData("members", members.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={data.title || ""} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>العنوان الفرعي</Label>
        <Input value={data.subtitle || ""} onChange={(e) => updateData("subtitle", e.target.value)} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>أعضاء الفريق</Label>
          <Button size="sm" variant="outline" onClick={addMember}>
            <Plus className="w-4 h-4 ml-1" />إضافة عضو
          </Button>
        </div>
        {members.map((member: any, index: number) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">عضو {index + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => removeMember(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <Input placeholder="الاسم" value={member.name} onChange={(e) => updateMember(index, "name", e.target.value)} />
            <Input placeholder="المنصب" value={member.role} onChange={(e) => updateMember(index, "role", e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="صورة" value={member.image} onChange={(e) => updateMember(index, "image", e.target.value)} />
              <Button variant="outline" size="icon" onClick={() => openFilePicker(`members.${index}.image`)}>
                <ImageIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Counter Editor
function CounterEditor({ block, onChange }: { block: PageBlock; onChange: (b: PageBlock) => void }) {
  const data = block.data as any;
  
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...data, [key]: value } } as PageBlock);
  };

  const items = data.items || [];

  const addItem = () => {
    updateData("items", [...items, { value: "0", label: "عنوان", suffix: "+" }]);
  };

  const updateItem = (index: number, key: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    updateData("items", newItems);
  };

  const removeItem = (index: number) => {
    updateData("items", items.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={data.title || ""} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الأرقام</Label>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="w-4 h-4 ml-1" />إضافة
          </Button>
        </div>
        {items.map((item: any, index: number) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">رقم {index + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => removeItem(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="القيمة" value={item.value} onChange={(e) => updateItem(index, "value", e.target.value)} />
              <Input placeholder="اللاحقة (+، %)" value={item.suffix || ""} onChange={(e) => updateItem(index, "suffix", e.target.value)} />
            </div>
            <Input placeholder="العنوان" value={item.label} onChange={(e) => updateItem(index, "label", e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Timeline Editor
function TimelineEditor({ block, onChange }: { block: PageBlock; onChange: (b: PageBlock) => void }) {
  const data = block.data as any;
  
  const updateData = (key: string, value: any) => {
    onChange({ ...block, data: { ...data, [key]: value } } as PageBlock);
  };

  const items = data.items || [];

  const addItem = () => {
    updateData("items", [...items, { year: "2024", title: "عنوان", description: "" }]);
  };

  const updateItem = (index: number, key: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    updateData("items", newItems);
  };

  const removeItem = (index: number) => {
    updateData("items", items.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Input value={data.title || ""} onChange={(e) => updateData("title", e.target.value)} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الأحداث</Label>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="w-4 h-4 ml-1" />إضافة
          </Button>
        </div>
        {items.map((item: any, index: number) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">حدث {index + 1}</span>
              <Button size="icon" variant="ghost" onClick={() => removeItem(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
            <Input placeholder="السنة" value={item.year} onChange={(e) => updateItem(index, "year", e.target.value)} />
            <Input placeholder="العنوان" value={item.title} onChange={(e) => updateItem(index, "title", e.target.value)} />
            <Textarea placeholder="الوصف" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} rows={2} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic Block Editor
function GenericBlockEditor({ block, onChange, updateData, openFilePicker }: { block: PageBlock; onChange: (b: PageBlock) => void; updateData: (key: string, value: any) => void; openFilePicker: (key: string) => void }) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [key]: value } } as PageBlock);
  };

  const blockData = block.data as Record<string, any>;

  const getLabel = (key: string) => {
    const labels: Record<string, string> = {
      title: "العنوان",
      subtitle: "العنوان الفرعي",
      content: "المحتوى",
      buttonText: "نص الزر",
      buttonLink: "رابط الزر",
      ctaText: "نص الزر",
      ctaLink: "رابط الزر",
      url: "الرابط",
      src: "رابط الصورة",
      alt: "النص البديل",
      columns: "الأعمدة",
      items: "العناصر",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      address: "العنوان",
      image: "الصورة",
      video: "الفيديو",
      description: "الوصف",
    };
    return labels[key] || key;
  };

  return (
    <div className="space-y-4">
      {Object.entries(blockData).map(([key, value]) => {
        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-2">
              <Label>{getLabel(key)}</Label>
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">يحتوي على {value.length} عناصر</p>
            </div>
          );
        }
        
        if (typeof value === 'boolean') {
          return (
            <div key={key} className="flex items-center justify-between">
              <Label>{getLabel(key)}</Label>
              <Switch checked={value} onCheckedChange={(v) => handleChange(key, v)} />
            </div>
          );
        }
        
        if (typeof value === 'number') {
          return (
            <div key={key} className="space-y-2">
              <Label>{getLabel(key)}</Label>
              <Input type="number" value={value} onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)} />
            </div>
          );
        }
        
        if (typeof value === 'string') {
          const isLongText = value.length > 100;
          const isImageField = key.toLowerCase().includes('image') || key.toLowerCase().includes('src') || key.toLowerCase().includes('avatar');
          
          return (
            <div key={key} className="space-y-2">
              <Label>{getLabel(key)}</Label>
              <div className={isImageField ? "flex gap-2" : ""}>
                {isLongText ? (
                  <Textarea value={value} onChange={(e) => handleChange(key, e.target.value)} rows={4} />
                ) : (
                  <Input value={value} onChange={(e) => handleChange(key, e.target.value)} className={isImageField ? "flex-1" : ""} />
                )}
                {isImageField && (
                  <Button variant="outline" size="icon" onClick={() => openFilePicker(key)}>
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}
