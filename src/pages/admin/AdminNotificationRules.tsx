import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Settings2, Loader2, Shield, Zap } from "lucide-react";

interface NotificationRule {
  id: string;
  event_key: string;
  description: string | null;
  channel_in_app: boolean;
  channel_telegram: boolean;
  is_enabled: boolean;
}

export default function AdminNotificationRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newEventKey, setNewEventKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newInApp, setNewInApp] = useState(true);
  const [newTelegram, setNewTelegram] = useState(true);

  const { data: rules = [], isLoading } = useQuery<NotificationRule[]>({
    queryKey: ["notification-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("notification_rules")
        .select("*")
        .order("event_key", { ascending: true });

      if (error) throw error;
      return (data || []) as NotificationRule[];
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NotificationRule> }) => {
      const { error } = await (supabase as any)
        .from("notification_rules")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في حفظ الإعدادات",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      if (!newEventKey.trim()) {
        throw new Error("يجب إدخال مفتاح الحدث (event_key)");
      }

      const { error } = await (supabase as any)
        .from("notification_rules")
        .insert({
          event_key: newEventKey.trim(),
          description: newDescription.trim() || null,
          channel_in_app: newInApp,
          channel_telegram: newTelegram,
          is_enabled: newInApp || newTelegram,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم إضافة القاعدة بنجاح" });
      setNewEventKey("");
      setNewDescription("");
      setNewInApp(true);
      setNewTelegram(true);
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إضافة القاعدة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (rule: NotificationRule, field: keyof NotificationRule, value: boolean) => {
    const updates: Partial<NotificationRule> = { [field]: value } as any;

    if (field === "channel_in_app" || field === "channel_telegram") {
      const nextInApp = field === "channel_in_app" ? value : rule.channel_in_app;
      const nextTelegram = field === "channel_telegram" ? value : rule.channel_telegram;
      updates.is_enabled = nextInApp || nextTelegram;
    }

    if (field === "is_enabled" && !value) {
      updates.channel_in_app = false;
      updates.channel_telegram = false;
    }

    updateRuleMutation.mutate({ id: rule.id, updates });
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="قواعد الإشعارات"
      subtitle="تحكم في قنوات إرسال الإشعارات لكل حدث في النظام"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <h1 className="text-xl font-semibold">نظام قواعد الإشعارات</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              حدد لكل حدث هل يتم إرساله كإشعار داخل المنصة، تليجرام، أم الإثنين معًا بدون الحاجة لتعديل الكود.
            </p>
          </div>

          <Badge variant="outline" className="flex items-center gap-1">
            <Settings2 className="w-3 h-3" />
            {rules.length} حدث مُعرّف
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  قائمة الأحداث والقواعد
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  كل سطر يمثل حدثًا في النظام مثل إنشاء طلب، تغيير حالة، سحب رصيد، أو مهام الفريلانسر.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/60">
                <div className="col-span-4">الحدث (event_key)</div>
                <div className="col-span-4">الوصف</div>
                <div className="col-span-1 text-center">مُفعل</div>
                <div className="col-span-1 text-center">داخل المنصة</div>
                <div className="col-span-2 text-center">تليجرام</div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : rules.length === 0 ? (
                <div className="py-10 px-4 text-center text-sm text-muted-foreground">
                  لا توجد قواعد بعد. أضف أول قاعدة من النموذج على اليمين.
                </div>
              ) : (
                <div className="divide-y">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm bg-background/60"
                    >
                      <div className="col-span-4">
                        <code className="px-2 py-1 rounded bg-muted font-mono text-xs">
                          {rule.event_key}
                        </code>
                      </div>
                      <div className="col-span-4">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {rule.description || "بدون وصف"}
                        </p>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Switch
                          checked={rule.is_enabled}
                          onCheckedChange={(v) => handleToggle(rule, "is_enabled", Boolean(v))}
                        />
                      </div>
                      <div className="col-span-1 flex flex-col items-center gap-1">
                        <Switch
                          checked={rule.channel_in_app}
                          onCheckedChange={(v) => handleToggle(rule, "channel_in_app", Boolean(v))}
                          disabled={!rule.is_enabled}
                        />
                        <span className="text-[10px] text-muted-foreground">داخل المنصة</span>
                      </div>
                      <div className="col-span-2 flex flex-col items-center gap-1">
                        <Switch
                          checked={rule.channel_telegram}
                          onCheckedChange={(v) => handleToggle(rule, "channel_telegram", Boolean(v))}
                          disabled={!rule.is_enabled}
                        />
                        <span className="text-[10px] text-muted-foreground">بوت تليجرام</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                إضافة / تعديل قاعدة جديدة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="event-key">مفتاح الحدث (event_key)</Label>
                <Input
                  id="event-key"
                  value={newEventKey}
                  onChange={(e) => setNewEventKey(e.target.value)}
                  placeholder="مثال: request_created, withdrawal_created"
                />
                <p className="text-[11px] text-muted-foreground">
                  هذا المفتاح يجب أن يطابق اسم الحدث المستخدم في الأكواد و/أو تمبلت تليجرام (message_type).
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">وصف مختصر</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="مثال: إشعار عميل عند إنشاء طلب جديد، أو تنبيه أدمن بطلب سحب جديد"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">إشعار داخل المنصة</p>
                    <p className="text-[11px] text-muted-foreground">يظهر في مركز الإشعارات داخل لوحة التحكم.</p>
                  </div>
                  <Switch checked={newInApp} onCheckedChange={(v) => setNewInApp(Boolean(v))} />
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">إشعار تليجرام</p>
                    <p className="text-[11px] text-muted-foreground">يرسل عبر البوت إلى المستخدمين/الأدمن.</p>
                  </div>
                  <Switch checked={newTelegram} onCheckedChange={(v) => setNewTelegram(Boolean(v))} />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => createRuleMutation.mutate()}
                disabled={createRuleMutation.isPending || !newEventKey.trim()}
              >
                {createRuleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                <span className="ml-2">حفظ القاعدة</span>
              </Button>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ملاحظة: تفعيل/تعطيل القنوات هنا لا يغير من منطق الأكواد، لكنه يتحكم في ما إذا كان سيتم إنشاء إشعار داخل المنصة،
                أو إرسال رسالة تليجرام، أو الإثنين معًا، لكل حدث يتم تعريفه.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
