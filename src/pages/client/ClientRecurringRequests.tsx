import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Plus, Trash2, Loader2, Calendar, Pause, Play } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const frequencyLabels: Record<string, string> = {
  weekly: "أسبوعي",
  biweekly: "كل أسبوعين",
  monthly: "شهري",
};

export default function ClientRecurringRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    task_size: "",
    frequency: "monthly",
  });

  const { data: recurring, isLoading } = useQuery({
    queryKey: ["recurring-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_requests")
        .select("*, categories(name_ar)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-for-recurring"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name_ar").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: taskSizes } = useQuery({
    queryKey: ["task-sizes-recurring"],
    queryFn: async () => {
      const { data } = await supabase.from("task_sizes" as any).select("id, name_ar, credits").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const nextRun = new Date();
      if (form.frequency === "weekly") nextRun.setDate(nextRun.getDate() + 7);
      else if (form.frequency === "biweekly") nextRun.setDate(nextRun.getDate() + 14);
      else nextRun.setMonth(nextRun.getMonth() + 1);

      const { error } = await supabase.from("recurring_requests").insert({
        user_id: user!.id,
        title: form.title,
        description: form.description,
        category_id: form.category_id || null,
        task_size: form.task_size || null,
        frequency: form.frequency,
        next_run_at: nextRun.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
      setShowCreateDialog(false);
      setForm({ title: "", description: "", category_id: "", task_size: "", frequency: "monthly" });
      toast({ title: "تم إنشاء الطلب المتكرر بنجاح" });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("recurring_requests").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring-requests"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
      toast({ title: "تم حذف الطلب المتكرر" });
    },
  });

  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الطلبات المتكررة</h1>
            <p className="text-muted-foreground">جدولة طلبات تتكرر تلقائياً</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 ml-2" />
            طلب متكرر جديد
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !recurring?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">لا توجد طلبات متكررة</h3>
              <p className="text-muted-foreground mb-4">أنشئ طلبات تتكرر أسبوعياً أو شهرياً تلقائياً</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 ml-2" />
                إنشاء طلب متكرر
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recurring.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? "نشط" : "متوقف"}
                        </Badge>
                        <Badge variant="outline">{frequencyLabels[item.frequency]}</Badge>
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {item.categories && (
                          <span>التصنيف: {(item.categories as any)?.name_ar}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          التشغيل التالي: {format(new Date(item.next_run_at), "d MMM yyyy", { locale: ar })}
                        </span>
                        <span>تم التشغيل {item.run_count} مرة</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleMutation.mutate({ id: item.id, is_active: !item.is_active })}
                      >
                        {item.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء طلب متكرر</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>عنوان الطلب</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: تصميم بوستات سوشيال ميديا" />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل الطلب..." />
              </div>
              <div>
                <Label>التصنيف</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>حجم المهمة</Label>
                <Select value={form.task_size} onValueChange={(v) => setForm({ ...form, task_size: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الحجم" /></SelectTrigger>
                  <SelectContent>
                    {taskSizes?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name_ar} ({s.credits} كريديت)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>التكرار</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">أسبوعي</SelectItem>
                    <SelectItem value="biweekly">كل أسبوعين</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
