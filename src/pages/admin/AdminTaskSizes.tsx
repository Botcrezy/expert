import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, ListChecks } from "lucide-react";

interface TaskSizeConfig {
  id: string;
  name: string;
  credits: number;
  goals: number;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
  min_days?: number;
  max_days?: number;
}

const defaultTaskSizes: TaskSizeConfig[] = [
  { id: "micro", name: "مهمة صغيرة جداً", credits: 1, goals: 1, description: "مهمة بسيطة (1-2 ساعة)", is_active: true, sort_order: 1, min_days: 0, max_days: 1 },
  { id: "small", name: "مهمة صغيرة", credits: 3, goals: 2, description: "مهمة عادية (3-5 ساعات)", is_active: true, sort_order: 2, min_days: 0, max_days: 1 },
  { id: "medium", name: "مهمة متوسطة", credits: 5, goals: 3, description: "مشروع متوسط (1-2 يوم)", is_active: true, sort_order: 3, min_days: 2, max_days: 2 },
  { id: "large", name: "مشروع كبير", credits: 10, goals: 5, description: "مشروع كبير (3-5 أيام)", is_active: true, sort_order: 4, min_days: 3, max_days: 5 },
];

export default function AdminTaskSizes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localSizes, setLocalSizes] = useState<TaskSizeConfig[] | null>(null);
  const [settingId, setSettingId] = useState<string | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["admin-task-sizes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("settings")
        .select("id, value")
        .eq("key", "task_sizes_config")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      const sizes = (data?.value as TaskSizeConfig[] | null) || defaultTaskSizes;
      setSettingId(data?.id || null);
      setLocalSizes(sizes);

      return sizes;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (sizes: TaskSizeConfig[]) => {
      if (settingId) {
        const { error } = await (supabase as any)
          .from("settings")
          .update({ value: sizes, updated_at: new Date().toISOString(), is_public: true })
          .eq("id", settingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("settings")
          .insert({
            key: "task_sizes_config",
            group_name: "pricing",
            type: "json",
            description: "Task sizes configuration (credits & goals)",
            is_public: true,
            value: sizes,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-task-sizes"] });
      toast({ title: "تم حفظ إعدادات أحجام المهام ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleAddSize = () => {
    if (!localSizes) return;
    setLocalSizes([
      ...localSizes,
      {
        id: `custom_${localSizes.length + 1}`,
        name: "مهمة جديدة",
        credits: 1,
        goals: 1,
        description: "وصف مختصر",
        is_active: true,
        sort_order: (localSizes[localSizes.length - 1]?.sort_order || localSizes.length) + 1,
      },
    ]);
  };

  const handleUpdateSize = (index: number, patch: Partial<TaskSizeConfig>) => {
    if (!localSizes) return;
    const updated = [...localSizes];
    updated[index] = { ...updated[index], ...patch };
    setLocalSizes(updated);
  };

  const handleDeleteSize = (index: number) => {
    if (!localSizes) return;
    const updated = localSizes.filter((_, i) => i !== index);
    setLocalSizes(updated);
  };

  const allowedTaskSizeIds = ["micro", "small", "medium", "large"] as const;

  const handleSave = () => {
    if (!localSizes) return;

    // Prevent saving invalid IDs that are not part of the task_size enum
    const invalidIds = localSizes
      .map((s) => s.id.trim())
      .filter((id) => id && !allowedTaskSizeIds.includes(id as any));

    if (invalidIds.length > 0) {
      toast({
        title: "خطأ في معرفات أحجام المهام",
        description:
          "معرف حجم المهمة (ID) يجب أن يكون واحدًا من: micro, small, medium, large فقط.",
        variant: "destructive",
      });
      return;
    }

    const normalized = localSizes
      .map((s, i) => ({
        ...s,
        id: s.id.trim() || `size_${i + 1}`,
        credits: Number(s.credits) || 0,
        goals: Number(s.goals) || 1,
        sort_order: s.sort_order ?? i + 1,
        is_active: s.is_active ?? true,
        min_days: s.min_days != null ? Number(s.min_days) : 0,
        max_days:
          s.max_days != null
            ? Number(s.max_days)
            : s.min_days != null
              ? Number(s.min_days)
              : null,
      }))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    saveMutation.mutate(normalized);
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="أحجام المهام"
      subtitle="تحكم في أحجام المهام وعدد الأهداف والكريديت المطلوب"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ListChecks className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">إدارة أحجام المهام</h2>
              <p className="text-sm text-muted-foreground">
                من هنا تقدر تتحكم في أحجام المهام، عدد الأهداف المسموح بها، وعدد الكريديت المطلوب لكل حجم
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleAddSize}>
              <Plus className="w-4 h-4 ml-1" />
              إضافة حجم جديد
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !localSizes}>
              <Save className="w-4 h-4 ml-1" />
              حفظ التغييرات
            </Button>
          </div>
        </div>

        <div className="card-elevated p-4 space-y-4">
          <div className="grid grid-cols-14 gap-3 text-xs font-medium text-muted-foreground px-2">
            <div className="col-span-2">المعرف (ID)</div>
            <div className="col-span-2">الاسم الظاهر</div>
            <div className="col-span-2">الكريديت المطلوب</div>
            <div className="col-span-2">عدد الأهداف الأقصى</div>
            <div className="col-span-2">المدة الدنيا (أيام)</div>
            <div className="col-span-2">المدة القصوى (أيام)</div>
            <div className="col-span-1 text-center">مفعل</div>
            <div className="col-span-1 text-center">حذف</div>
          </div>

          {isLoading && !localSizes && (
            <p className="text-sm text-muted-foreground px-2">جاري تحميل الإعدادات...</p>
          )}

          {localSizes && localSizes.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground px-2">
              لا توجد أحجام مهام حتى الآن، اضغط على "إضافة حجم جديد" للبدء.
            </p>
          )}

          <div className="space-y-3">
            {localSizes?.map((size, index) => (
              <div
                key={size.id || index}
                className="grid grid-cols-14 gap-3 items-center px-2 py-2 rounded-lg border bg-card"
              >
                <div className="col-span-2">
                  <Label className="sr-only">ID</Label>
                  <Input
                    value={size.id}
                    onChange={(e) => handleUpdateSize(index, { id: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="sr-only">الاسم</Label>
                  <Input
                    value={size.name}
                    onChange={(e) => handleUpdateSize(index, { name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="sr-only">الكريديت</Label>
                  <Input
                    type="number"
                    min={0}
                    value={size.credits}
                    onChange={(e) => handleUpdateSize(index, { credits: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="sr-only">الأهداف</Label>
                  <Input
                    type="number"
                    min={1}
                    value={size.goals}
                    onChange={(e) => handleUpdateSize(index, { goals: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="sr-only">المدة الدنيا</Label>
                  <Input
                    type="number"
                    min={0}
                    value={size.min_days ?? ""}
                    onChange={(e) => handleUpdateSize(index, { min_days: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="sr-only">المدة القصوى</Label>
                  <Input
                    type="number"
                    min={0}
                    value={size.max_days ?? ""}
                    onChange={(e) => handleUpdateSize(index, { max_days: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Switch
                    checked={size.is_active ?? true}
                    onCheckedChange={(checked) => handleUpdateSize(index, { is_active: checked })}
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteSize(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="col-span-14 mt-2">
                  <Label className="text-[10px] text-muted-foreground mb-1 block">وصف مختصر (اختياري)</Label>
                  <Input
                    value={size.description || ""}
                    onChange={(e) => handleUpdateSize(index, { description: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            ملاحظة: يتم استخدام هذه الإعدادات في فورم إنشاء الطلب لربط حجم المهمة بعدد الأهداف المسموح بها وعدد الكريديت المطلوب.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
