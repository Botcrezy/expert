import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageBlock } from "./BlockTypes";

interface StyleEditorProps {
  block: PageBlock;
  onChange: (block: PageBlock) => void;
}

export function StyleEditor({ block, onChange }: StyleEditorProps) {
  const updateSettings = (key: string, value: any) => {
    onChange({
      ...block,
      settings: { ...block.settings, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      {/* Spacing */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">التباعد</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">التباعد العلوي والسفلي</Label>
            <Select
              value={block.settings.padding || "py-16"}
              onValueChange={(v) => updateSettings("padding", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="py-4">صغير جداً</SelectItem>
                <SelectItem value="py-8">صغير</SelectItem>
                <SelectItem value="py-12">متوسط صغير</SelectItem>
                <SelectItem value="py-16">متوسط</SelectItem>
                <SelectItem value="py-20">متوسط كبير</SelectItem>
                <SelectItem value="py-24">كبير</SelectItem>
                <SelectItem value="py-32">كبير جداً</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">التباعد الجانبي</Label>
            <Select
              value={block.settings.paddingX || "px-4"}
              onValueChange={(v) => updateSettings("paddingX", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="px-0">بدون</SelectItem>
                <SelectItem value="px-4">صغير</SelectItem>
                <SelectItem value="px-6">متوسط</SelectItem>
                <SelectItem value="px-8">كبير</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Background */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">الخلفية</Label>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">نوع الخلفية</Label>
            <Select
              value={block.settings.bgType || "none"}
              onValueChange={(v) => updateSettings("bgType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون</SelectItem>
                <SelectItem value="color">لون</SelectItem>
                <SelectItem value="gradient">تدرج</SelectItem>
                <SelectItem value="image">صورة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {block.settings.bgType === "color" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">لون الخلفية</Label>
              <Select
                value={block.settings.bgColor || "bg-background"}
                onValueChange={(v) => updateSettings("bgColor", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bg-background">افتراضي</SelectItem>
                  <SelectItem value="bg-muted">رمادي فاتح</SelectItem>
                  <SelectItem value="bg-primary">اللون الرئيسي</SelectItem>
                  <SelectItem value="bg-secondary">ثانوي</SelectItem>
                  <SelectItem value="bg-card">البطاقة</SelectItem>
                  <SelectItem value="bg-accent">مميز</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {block.settings.bgType === "gradient" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">التدرج</Label>
              <Select
                value={block.settings.bgGradient || "from-primary to-primary/80"}
                onValueChange={(v) => updateSettings("bgGradient", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from-primary to-primary/80">الرئيسي</SelectItem>
                  <SelectItem value="from-blue-600 to-cyan-500">أزرق - سماوي</SelectItem>
                  <SelectItem value="from-purple-600 to-pink-500">بنفسجي - وردي</SelectItem>
                  <SelectItem value="from-orange-500 to-red-500">برتقالي - أحمر</SelectItem>
                  <SelectItem value="from-green-500 to-emerald-500">أخضر</SelectItem>
                  <SelectItem value="from-gray-900 to-gray-800">داكن</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {block.settings.bgType === "image" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">رابط الصورة</Label>
              <Input
                value={block.settings.bgImage || ""}
                onChange={(e) => updateSettings("bgImage", e.target.value)}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
          )}
        </div>
      </div>

      {/* Text Colors */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">الألوان</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">لون النص</Label>
            <Select
              value={block.settings.textColor || "text-foreground"}
              onValueChange={(v) => updateSettings("textColor", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-foreground">افتراضي</SelectItem>
                <SelectItem value="text-white">أبيض</SelectItem>
                <SelectItem value="text-primary">الرئيسي</SelectItem>
                <SelectItem value="text-muted-foreground">رمادي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">لون العنوان</Label>
            <Select
              value={block.settings.titleColor || "text-foreground"}
              onValueChange={(v) => updateSettings("titleColor", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-foreground">افتراضي</SelectItem>
                <SelectItem value="text-white">أبيض</SelectItem>
                <SelectItem value="text-primary">الرئيسي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Alignment */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">المحاذاة</Label>
        <Select
          value={block.settings.alignment || "center"}
          onValueChange={(v: "left" | "center" | "right") => updateSettings("alignment", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="right">يمين</SelectItem>
            <SelectItem value="center">وسط</SelectItem>
            <SelectItem value="left">يسار</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Container Width */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">عرض المحتوى</Label>
        <Select
          value={block.settings.maxWidth || "max-w-7xl"}
          onValueChange={(v) => updateSettings("maxWidth", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="max-w-4xl">صغير</SelectItem>
            <SelectItem value="max-w-5xl">متوسط</SelectItem>
            <SelectItem value="max-w-6xl">كبير</SelectItem>
            <SelectItem value="max-w-7xl">كامل</SelectItem>
            <SelectItem value="max-w-full">بلا حدود</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Border & Shadow */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">الحدود والظل</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">الحدود</Label>
            <Select
              value={block.settings.border || "none"}
              onValueChange={(v) => updateSettings("border", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون</SelectItem>
                <SelectItem value="border-t">علوي</SelectItem>
                <SelectItem value="border-b">سفلي</SelectItem>
                <SelectItem value="border">كامل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">الظل</Label>
            <Select
              value={block.settings.shadow || "none"}
              onValueChange={(v) => updateSettings("shadow", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون</SelectItem>
                <SelectItem value="shadow-sm">خفيف</SelectItem>
                <SelectItem value="shadow">متوسط</SelectItem>
                <SelectItem value="shadow-lg">كبير</SelectItem>
                <SelectItem value="shadow-xl">كبير جداً</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Animation */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">الحركة</Label>
        <Select
          value={block.settings.animation || "none"}
          onValueChange={(v) => updateSettings("animation", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون</SelectItem>
            <SelectItem value="fade-in">ظهور تدريجي</SelectItem>
            <SelectItem value="slide-up">انزلاق للأعلى</SelectItem>
            <SelectItem value="slide-down">انزلاق للأسفل</SelectItem>
            <SelectItem value="zoom-in">تكبير</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
