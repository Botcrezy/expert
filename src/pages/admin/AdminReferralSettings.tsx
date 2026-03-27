import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Gift,
  Users,
  Wallet,
  Save,
  Loader2,
  Settings,
  Percent,
} from "lucide-react";

export default function AdminReferralSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    referral_enabled: true,
    client_referrer_reward: 50,
    client_referred_reward: 25,
    freelancer_referrer_reward: 100,
    freelancer_referred_reward: 50,
    min_tasks_for_reward: 1,
  });

  const { data: referralSettings, isLoading } = useQuery({
    queryKey: ["referral-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("referral_settings")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (referralSettings) {
      const newSettings = { ...settings };
      referralSettings.forEach((setting: any) => {
        const key = setting.key as keyof typeof settings;
        if (key in newSettings) {
          const value = typeof setting.value === 'string' 
            ? JSON.parse(setting.value) 
            : setting.value;
          (newSettings as any)[key] = key === 'referral_enabled' 
            ? value === 'true' || value === true 
            : Number(value);
        }
      });
      setSettings(newSettings);
    }
  }, [referralSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(settings);
      
      for (const [key, value] of entries) {
        await (supabase as any)
          .from("referral_settings")
          .upsert({
            key,
            value: JSON.stringify(value),
            updated_at: new Date().toISOString(),
          }, { onConflict: "key" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-settings"] });
      toast({ title: "تم حفظ إعدادات الإحالات بنجاح! ✅" });
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: referralStats } = useQuery({
    queryKey: ["referral-stats"],
    queryFn: async () => {
      const { data: referrals } = await supabase
        .from("referrals")
        .select("*");

      const { data: rewards } = await supabase
        .from("referral_rewards")
        .select("*");

      return {
        totalReferrals: referrals?.length || 0,
        completedReferrals: referrals?.filter(r => r.status === 'completed').length || 0,
        pendingReferrals: referrals?.filter(r => r.status === 'pending').length || 0,
        totalRewardsGiven: rewards?.reduce((sum, r) => sum + Number(r.rewards_earned || 0), 0) || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="إعدادات الإحالات">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إعدادات الإحالات"
      subtitle="تخصيص نظام وقواعد الإحالات"
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{referralStats?.totalReferrals || 0}</p>
            <p className="text-sm text-muted-foreground">إجمالي الإحالات</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{referralStats?.completedReferrals || 0}</p>
            <p className="text-sm text-muted-foreground">إحالات مكتملة</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{referralStats?.pendingReferrals || 0}</p>
            <p className="text-sm text-muted-foreground">إحالات معلقة</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{referralStats?.totalRewardsGiven || 0}</p>
            <p className="text-sm text-muted-foreground">مكافآت ممنوحة</p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="card-elevated p-6 space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            الإعدادات العامة
          </h3>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">تفعيل نظام الإحالات</p>
              <p className="text-sm text-muted-foreground">
                السماح للمستخدمين بإحالة آخرين
              </p>
            </div>
            <Switch
              checked={settings.referral_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, referral_enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>الحد الأدنى من المهام للحصول على المكافأة</Label>
            <Input
              type="number"
              min="0"
              value={settings.min_tasks_for_reward}
              onChange={(e) => 
                setSettings({ ...settings, min_tasks_for_reward: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              عدد المهام التي يجب إتمامها قبل منح المكافأة
            </p>
          </div>
        </div>

        {/* Client Rewards */}
        <div className="card-elevated p-6 space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            مكافآت العملاء (كريديت)
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>مكافأة العميل المُحيل</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={settings.client_referrer_reward}
                  onChange={(e) => 
                    setSettings({ ...settings, client_referrer_reward: parseInt(e.target.value) || 0 })
                  }
                  className="pl-16"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  كريديت
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>مكافأة العميل الجديد</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={settings.client_referred_reward}
                  onChange={(e) => 
                    setSettings({ ...settings, client_referred_reward: parseInt(e.target.value) || 0 })
                  }
                  className="pl-16"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  كريديت
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Freelancer Rewards */}
        <div className="card-elevated p-6 space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-500" />
            مكافآت الفريلانسرز (ج.م)
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>مكافأة الفريلانسر المُحيل</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={settings.freelancer_referrer_reward}
                  onChange={(e) => 
                    setSettings({ ...settings, freelancer_referrer_reward: parseInt(e.target.value) || 0 })
                  }
                  className="pl-12"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ج.م
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>مكافأة الفريلانسر الجديد</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={settings.freelancer_referred_reward}
                  onChange={(e) => 
                    setSettings({ ...settings, freelancer_referred_reward: parseInt(e.target.value) || 0 })
                  }
                  className="pl-12"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ج.م
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="card-elevated p-6 space-y-4 bg-gradient-to-br from-primary/5 to-transparent">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            كيف يعمل النظام؟
          </h3>

          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>كل مستخدم لديه كود إحالة فريد</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>عند التسجيل بكود إحالة، يتم ربط المستخدم الجديد بالمُحيل</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>بعد إتمام العدد المطلوب من المهام، يحصل الطرفان على المكافأة</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>تُضاف المكافآت تلقائياً للرصيد</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={saveMutation.isPending}
          size="lg"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              حفظ الإعدادات
            </>
          )}
        </Button>
      </div>
    </DashboardLayout>
  );
}
