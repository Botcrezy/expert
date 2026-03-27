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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Pencil, 
  Crown,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    price: 0,
    credits_per_month: 0,
    revisions_limit: 1,
    max_task_size: "medium" as "micro" | "small" | "medium" | "large",
    sla_hours: 48,
    priority_assignment: false,
    is_free: false,
    is_active: true,
    sort_order: 0,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("plans").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "تم إنشاء الباقة بنجاح ✅" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("plans").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "تم تحديث الباقة ✅" });
      setIsOpen(false);
      setEditingPlan(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      price: 0,
      credits_per_month: 0,
      revisions_limit: 1,
      max_task_size: "medium",
      sla_hours: 48,
      priority_assignment: false,
      is_free: false,
      is_active: true,
      sort_order: 0,
    });
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      name_ar: plan.name_ar,
      price: plan.price,
      credits_per_month: plan.credits_per_month,
      revisions_limit: plan.revisions_limit,
      max_task_size: plan.max_task_size,
      sla_hours: plan.sla_hours || 48,
      priority_assignment: plan.priority_assignment,
      is_free: plan.is_free,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const taskSizeLabels: Record<string, string> = {
    micro: "مايكرو",
    small: "صغير",
    medium: "متوسط",
    large: "كبير",
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة الباقات"
      subtitle="إنشاء وإدارة باقات الاشتراك"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plans?.length || 0}</p>
              <p className="text-sm text-muted-foreground">إجمالي الباقات</p>
            </div>
          </div>
          
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingPlan(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                إضافة باقة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الاسم (إنجليزي)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>الاسم (عربي)</Label>
                    <Input
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>السعر (ج.م/شهر)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>الكريديتات الشهرية</Label>
                    <Input
                      type="number"
                      value={formData.credits_per_month}
                      onChange={(e) => setFormData({ ...formData, credits_per_month: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>عدد التعديلات</Label>
                    <Input
                      type="number"
                      value={formData.revisions_limit}
                      onChange={(e) => setFormData({ ...formData, revisions_limit: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>حجم المهمة الأقصى</Label>
                    <Select
                      value={formData.max_task_size}
                      onValueChange={(value: any) => setFormData({ ...formData, max_task_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="micro">مايكرو</SelectItem>
                        <SelectItem value="small">صغير</SelectItem>
                        <SelectItem value="medium">متوسط</SelectItem>
                        <SelectItem value="large">كبير</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SLA (ساعات)</Label>
                    <Input
                      type="number"
                      value={formData.sla_hours}
                      onChange={(e) => setFormData({ ...formData, sla_hours: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>ترتيب العرض</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>أولوية في التعيين</Label>
                    <Switch
                      checked={formData.priority_assignment}
                      onCheckedChange={(checked) => setFormData({ ...formData, priority_assignment: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>باقة مجانية</Label>
                    <Switch
                      checked={formData.is_free}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>مفعلة</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingPlan ? "حفظ التغييرات" : "إنشاء الباقة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              جاري التحميل...
            </div>
          ) : plans?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد باقات</p>
            </div>
          ) : (
            plans?.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "card-elevated p-6 relative",
                  !plan.is_active && "opacity-60"
                )}
              >
                {plan.is_free && (
                  <span className="absolute top-3 left-3 bg-success/10 text-success text-xs px-2 py-1 rounded-full">
                    مجاني
                  </span>
                )}
                
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.name_ar}</p>
                </div>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-muted-foreground">ج.م/شهر</span>
                </div>

                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    {plan.credits_per_month} كريديت شهرياً
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    {plan.revisions_limit} تعديلات
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    حجم المهمة: {taskSizeLabels[plan.max_task_size]}
                  </li>
                  {plan.priority_assignment && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      أولوية في التعيين
                    </li>
                  )}
                  {plan.sla_hours && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      SLA: {plan.sla_hours} ساعة
                    </li>
                  )}
                </ul>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleEdit(plan)}
                >
                  <Pencil className="w-4 h-4 ml-2" />
                  تعديل
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
