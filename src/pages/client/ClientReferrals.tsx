import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Gift,
  Copy,
  Share2,
  CheckCircle2,
  Clock,
  Calculator,
  ArrowUp,
  Sparkles,
} from "lucide-react";

export default function ClientReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [referralCode, setReferralCode] = useState("");

  // Fetch or create referral code
  const { data: referralData } = useQuery({
    queryKey: ["client-referral", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check if user has a referral code
      const { data: existing } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .eq("referrer_type", "client")
        .limit(1);
      
      if (existing && existing.length > 0) {
        return existing[0];
      }
      
      // Create a new referral code
      const code = `CL${user.id.substring(0, 8).toUpperCase()}`;
      const { data: newRef, error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: user.id,
          referrer_type: "client",
          referral_code: code,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newRef;
    },
    enabled: !!user?.id,
  });

  // Fetch referral stats
  const { data: referralStats } = useQuery({
    queryKey: ["client-referral-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: rewards } = await supabase
        .from("referral_rewards")
        .select("*")
        .eq("user_id", user.id)
        .eq("user_type", "client")
        .single();
      
      const { count: totalReferrals } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .eq("status", "completed");
      
      return {
        referralCount: rewards?.referral_count || 0,
        rewardsEarned: rewards?.rewards_earned || 0,
        totalCompleted: totalReferrals || 0,
      };
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (referralData?.referral_code) {
      setReferralCode(referralData.referral_code);
    }
  }, [referralData]);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: "تم نسخ الكود! 📋" });
  };

  const shareLink = () => {
    const url = `${window.location.origin}/register?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: "انضم إلى Sity Experts",
        text: "سجل الآن واحصل على مكافأة!",
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "تم نسخ رابط الإحالة! 🔗" });
    }
  };

  // Calculate progress to next reward (10 referrals = 5 credits)
  const referralsNeeded = 10;
  const creditsReward = 5;
  const currentProgress = (referralStats?.referralCount || 0) % referralsNeeded;
  const progressPercent = (currentProgress / referralsNeeded) * 100;
  const referralsToNextReward = referralsNeeded - currentProgress;

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="برنامج الإحالات"
      subtitle="ادعُ أصدقاءك واكسب كريديت مجاني"
    >
      <div className="grid gap-6">
        {/* Hero Card */}
        <Card className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">ادعُ صديق واكسب 5 كريديت!</h2>
              <p className="text-muted-foreground">كل 10 أصدقاء يسجلون = 5 كريديت مجاني</p>
            </div>
          </div>

          {/* Referral Code */}
          <div className="bg-card rounded-xl p-4 mb-6">
            <label className="text-sm text-muted-foreground mb-2 block">كود الإحالة الخاص بك</label>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                readOnly
                className="text-lg font-mono font-bold text-center"
              />
              <Button variant="outline" onClick={copyCode}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button onClick={shareLink}>
                <Share2 className="w-4 h-4 ml-2" />
                مشاركة
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">التقدم نحو المكافأة القادمة</span>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                {referralsToNextReward} إحالة متبقية
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-3 mb-2" />
            <p className="text-xs text-muted-foreground">
              {currentProgress} من {referralsNeeded} إحالة مكتملة
            </p>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-muted-foreground">إجمالي الإحالات</span>
            </div>
            <p className="text-3xl font-bold">{referralStats?.totalCompleted || 0}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-muted-foreground">الكريديت المكتسب</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{referralStats?.rewardsEarned || 0}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-muted-foreground">القيمة المكتسبة</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {((referralStats?.rewardsEarned || 0) * 50).toLocaleString()} ج.م
            </p>
          </Card>
        </div>

        {/* Calculator */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            حاسبة المكافآت
          </h3>
          <div className="grid sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold text-primary">10</p>
              <p className="text-sm text-muted-foreground">إحالات</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowUp className="w-6 h-6 text-muted-foreground rotate-90" />
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">5</p>
              <p className="text-sm text-muted-foreground">كريديت</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-xl">
              <p className="text-2xl font-bold text-primary">250 ج.م</p>
              <p className="text-sm text-muted-foreground">قيمة تقريبية</p>
            </div>
          </div>
        </Card>

        {/* How it works */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">كيف يعمل البرنامج؟</h3>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h4 className="font-medium mb-1">شارك الكود</h4>
              <p className="text-sm text-muted-foreground">شارك كود الإحالة مع أصدقائك</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h4 className="font-medium mb-1">التسجيل</h4>
              <p className="text-sm text-muted-foreground">صديقك يسجل باستخدام الكود</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h4 className="font-medium mb-1">اكسب كريديت</h4>
              <p className="text-sm text-muted-foreground">عند كل 10 إحالات تحصل على 5 كريديت</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}