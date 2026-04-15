import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowRight, CheckCircle, Sparkles, Gift, Shield, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import platformLogo from "@/assets/logo.jpg";
import { useReferralTracking } from "@/hooks/useReferralTracking";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "", referralCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { signUp, user, userRole } = useAuth();
  const { data: settings } = usePlatformSettings();
  const { processReferral } = useReferralTracking();

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
      localStorage.setItem("referral_code", refCode.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && userRole) {
      const roleRedirects: Record<string, string> = { client: "/client/dashboard", freelancer: "/freelancer/dashboard", admin: "/admin", team_leader: "/admin" };
      navigate(roleRedirects[userRole] || "/client/dashboard", { replace: true });
    }
  }, [user, userRole, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" }); return; }
    if (formData.password.length < 6) { toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" }); return; }
    if (!acceptTerms) { toast({ title: "خطأ", description: "يجب الموافقة على الشروط والأحكام", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { error } = await signUp(formData.email, formData.password, formData.name);
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes("already registered")) errorMessage = "البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول";
        toast({ title: "خطأ في إنشاء الحساب", description: errorMessage, variant: "destructive" });
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const userId = authData.user.id;
        const profileData: Record<string, any> = { user_id: userId, full_name: formData.name, email: formData.email };
        if (formData.phone) profileData.phone = formData.phone;
        await (supabase as any).from("profiles").upsert(profileData, { onConflict: "user_id" });
        if (formData.referralCode || localStorage.getItem("referral_code")) await processReferral(userId, "client");
        const { notifyTelegramAdmin } = await import("@/lib/telegramAdminNotify");
        await notifyTelegramAdmin({ eventKey: "admin_user_registered_client", reference: { type: "user", id: userId }, adminPath: `/admin/users/${userId}`, data: { user_name: formData.name, user_email: formData.email } });
      }
      try {
        const { data: authDataForLog } = await supabase.auth.getUser();
        const userIdForLog = authDataForLog?.user?.id;
        if (userIdForLog) await (supabase as any).from("system_logs").insert({ user_id: userIdForLog, action_type: "create", entity_type: "user", details: { source: "client_register", email: formData.email } });
      } catch (e) { console.error("Failed to write system log for registration", e); }
      toast({ title: "تم إنشاء الحساب بنجاح! ✓", description: "جاري تحويلك للوحة التحكم..." });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ غير متوقع", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-border/50 bg-background">
        <Link to="/" className="flex items-center gap-2">
          <img src={platformLogo} alt={settings?.siteName || "Sity Experts"} className="w-9 h-9 rounded-xl object-contain" />
          <span className="font-bold text-lg text-foreground">{settings?.siteName || "Sity Experts"}</span>
        </Link>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="hidden lg:inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group text-sm">
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            العودة للرئيسية
          </Link>

          <div className="mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <UserPlus className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">أنشئ حسابك الآن 🚀</h1>
            <p className="text-muted-foreground">انضم لآلاف العملاء واحصل على خدمات احترافية</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">الاسم الكامل</Label>
              <Input id="name" name="name" type="text" placeholder="أحمد محمد" value={formData.name} onChange={handleChange} required className="h-12 text-base rounded-xl bg-muted/50 border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" placeholder="example@email.com" value={formData.email} onChange={handleChange} required className="h-12 text-base rounded-xl bg-muted/50 border-border" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">رقم الهاتف <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <Input id="phone" name="phone" type="tel" placeholder="01xxxxxxxxx" value={formData.phone} onChange={handleChange} className="h-12 text-base rounded-xl bg-muted/50 border-border" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-sm font-medium text-foreground">كود الإحالة <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <Input id="referralCode" name="referralCode" type="text" placeholder="أدخل كود الإحالة إن وجد" value={formData.referralCode} onChange={handleChange} className="h-12 text-base rounded-xl bg-muted/50 border-border" dir="ltr" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">كلمة المرور</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleChange} required className="h-12 text-base rounded-xl bg-muted/50 border-border pl-12" dir="ltr" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">تأكيد كلمة المرور</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required className="h-12 text-base rounded-xl bg-muted/50 border-border" dir="ltr" />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl border border-border/60">
              <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(c) => setAcceptTerms(c as boolean)} className="mt-0.5" />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                بالتسجيل أنت موافق على{" "}<Link to="/terms" className="text-primary hover:underline">الشروط والأحكام</Link>{" "}و{" "}<Link to="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>
              </Label>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl" loading={loading}>إنشاء الحساب</Button>
          </form>

          <p className="text-center text-muted-foreground mt-6 text-sm">
            عندك حساب بالفعل؟{" "}<Link to="/login" className="text-primary hover:underline font-medium">سجل دخولك</Link>
          </p>
          <div className="mt-3 text-center">
            <Link to="/freelancer-register" className="text-sm text-muted-foreground hover:text-primary transition-colors">تريد الانضمام كفريلانسر؟ <span className="underline">سجل هنا</span></Link>
          </div>
        </div>
      </div>

      {/* Right Side - Branding Panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-16 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-lg text-center relative z-10">
          <img src={platformLogo} alt={settings?.siteName || "Sity Experts"} className="w-20 h-20 mx-auto mb-8 object-contain rounded-2xl bg-white/15 p-3 backdrop-blur-sm border border-white/20 shadow-2xl" />
          <h2 className="text-3xl xl:text-4xl font-bold mb-4 text-white">{settings?.siteName || "Sity Experts"}</h2>
          <p className="text-lg text-white/85 mb-10 leading-relaxed">منصة خدمات مُدارة تضمن لك جودة التسليم وراحة البال.</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: Gift, text: "مهمة مجانية للتجربة" },
              { icon: CheckCircle, text: "جودة مضمونة ومراجعة قبل التسليم" },
              { icon: Sparkles, text: "فريق خبراء متخصصين" },
              { icon: Shield, text: "دعم فني على مدار الساعة" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl p-4 bg-white/10 backdrop-blur-sm border border-white/15 text-right hover:bg-white/15 transition-colors">
                <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0"><f.icon className="w-5 h-5 text-white" /></div>
                <span className="text-white font-medium text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
