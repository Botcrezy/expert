import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
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
  Calculator,
  ArrowUp,
  Sparkles,
  DollarSign,
  Wallet,
} from "lucide-react";

export default function FreelancerReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState("");

  // Fetch or create referral code
  const { data: referralData } = useQuery({
    queryKey: ["freelancer-referral", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check if user has a referral code
      const { data: existing } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .eq("referrer_type", "freelancer")
        .limit(1);
      
      if (existing && existing.length > 0) {
        return existing[0];
      }
      
      // Create a new referral code
      const code = `FL${user.id.substring(0, 8).toUpperCase()}`;
      const { data: newRef, error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: user.id,
          referrer_type: "freelancer",
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
    queryKey: ["freelancer-referral-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: rewards } = await supabase
        .from("referral_rewards")
        .select("*")
        .eq("user_id", user.id)
        .eq("user_type", "freelancer")
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
    const url = `${window.location.origin}/freelancer-register?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: "انضم كخبير في Sity Experts",
        text: "سجل الآن كخبير واكسب من مهاراتك!",
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "تم نسخ رابط الإحالة! 🔗" });
    }
  };

  // Calculate progress to next reward (50 referrals = $5 = 240 EGP)
  const referralsNeeded = 50;
  const rewardUSD = 5;
  const rewardEGP = 240;
  const currentProgress = (referralStats?.referralCount || 0) % referralsNeeded;
  const progressPercent = (currentProgress / referralsNeeded) * 100;
  const referralsToNextReward = referralsNeeded - currentProgress;
  const totalEarnedEGP = (referralStats?.rewardsEarned || 0) * rewardEGP;

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="برنامج الإحالات"
      subtitle="ادعُ خبراء آخرين واكسب مكافآت نقدية"
    >
      <div className="grid gap-6">
        {/* Hero Card */}
        <Card className="p-8 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-background border-green-500/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">ادعُ خبير واكسب $5!</h2>
              <p className="text-muted-foreground">كل 50 خبير يسجلون = $5 (240 ج.م) تضاف لمحفظتك</p>
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
              <Button onClick={shareLink} className="bg-green-600 hover:bg-green-700">
                <Share2 className="w-4 h-4 ml-2" />
                مشاركة
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">التقدم نحو المكافأة القادمة</span>
              <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600">
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
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-muted-foreground">المكافآت المكتسبة</span>
            </div>
            <p className="text-3xl font-bold text-green-600">${(referralStats?.rewardsEarned || 0) * rewardUSD}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-muted-foreground">بالجنيه المصري</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {totalEarnedEGP.toLocaleString()} ج.م
            </p>
          </Card>
        </div>

        {/* Calculator */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-600" />
            حاسبة المكافآت
          </h3>
          <div className="grid sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold text-primary">50</p>
              <p className="text-sm text-muted-foreground">إحالة</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowUp className="w-6 h-6 text-muted-foreground rotate-90" />
            </div>
            <div className="p-4 bg-green-500/10 rounded-xl">
              <p className="text-2xl font-bold text-green-600">$5</p>
              <p className="text-sm text-muted-foreground">دولار</p>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-xl">
              <p className="text-2xl font-bold text-purple-600">240 ج.م</p>
              <p className="text-sm text-muted-foreground">جنيه مصري</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-muted/30 rounded-xl">
            <h4 className="font-medium mb-3">جدول المكافآت:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="font-bold">50 إحالة</p>
                <p className="text-muted-foreground">$5 = 240 ج.م</p>
              </div>
              <div className="text-center">
                <p className="font-bold">100 إحالة</p>
                <p className="text-muted-foreground">$10 = 480 ج.م</p>
              </div>
              <div className="text-center">
                <p className="font-bold">500 إحالة</p>
                <p className="text-muted-foreground">$50 = 2,400 ج.م</p>
              </div>
            </div>
          </div>
        </Card>

        {/* How it works */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">كيف يعمل البرنامج؟</h3>
          <div className="grid sm:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-green-600">1</span>
              </div>
              <h4 className="font-medium mb-1">شارك الكود</h4>
              <p className="text-sm text-muted-foreground">شارك كود الإحالة مع خبراء آخرين</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-green-600">2</span>
              </div>
              <h4 className="font-medium mb-1">التسجيل</h4>
              <p className="text-sm text-muted-foreground">الخبير يسجل باستخدام الكود</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-green-600">3</span>
              </div>
              <h4 className="font-medium mb-1">التوثيق</h4>
              <p className="text-sm text-muted-foreground">يتم توثيق الخبير من الإدارة</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-green-600">4</span>
              </div>
              <h4 className="font-medium mb-1">المكافأة</h4>
              <p className="text-sm text-muted-foreground">تحصل على $5 عند كل 50 إحالة</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}