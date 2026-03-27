import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowRight, CheckCircle, Sparkles, Gift, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useReferralTracking } from "@/hooks/useReferralTracking";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
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

  // Get referral code from URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
      localStorage.setItem("referral_code", refCode.toUpperCase());
    }
  }, [searchParams]);

  // Redirect based on role if already logged in
  useEffect(() => {
    if (user && userRole) {
      const roleRedirects: Record<string, string> = {
        client: "/client/dashboard",
        freelancer: "/freelancer/dashboard",
        admin: "/admin",
        team_leader: "/admin",
      };
      const redirectPath = roleRedirects[userRole] || "/client/dashboard";
      navigate(redirectPath, { replace: true });
    }
  }, [user, userRole, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }
    
    if (!acceptTerms) {
      toast({
        title: "خطأ",
        description: "يجب الموافقة على الشروط والأحكام",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await signUp(formData.email, formData.password, formData.name);
      
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes("already registered")) {
          errorMessage = "البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول";
        }
        
        toast({
          title: "خطأ في إنشاء الحساب",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Ensure profile exists / updated
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const userId = authData.user.id;
        const profileData: Record<string, any> = {
          user_id: userId,
          full_name: formData.name,
          email: formData.email,
        };
        if (formData.phone) {
          profileData.phone = formData.phone;
        }

        await (supabase as any)
          .from("profiles")
          .upsert(profileData, { onConflict: "user_id" });

        // Process referral if code exists
        if (formData.referralCode || localStorage.getItem("referral_code")) {
          await processReferral(userId, "client");
        }

        // Telegram: notify admin (important event)
        const { notifyTelegramAdmin } = await import("@/lib/telegramAdminNotify");
        await notifyTelegramAdmin({
          eventKey: "admin_user_registered_client",
          reference: { type: "user", id: userId },
          adminPath: `/admin/users/${userId}`,
          data: {
            user_name: formData.name,
            user_email: formData.email,
          },
        });
      }
      
      // Log system event for new registration
      try {
        const { data: authDataForLog } = await supabase.auth.getUser();
        const userIdForLog = authDataForLog?.user?.id;
        if (userIdForLog) {
          await (supabase as any).from("system_logs").insert({
            user_id: userIdForLog,
            action_type: "create",
            entity_type: "user",
            details: { source: "client_register", email: formData.email },
          });
        }
      } catch (e) {
        console.error("Failed to write system log for registration", e);
      }
      
      toast({
        title: "تم إنشاء الحساب بنجاح! ✓",
        description: "جاري تحويلك للوحة التحكم...",
      });
      
      // Navigation will happen automatically via useEffect when user state updates
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-neo auth-neo-bg flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-border/50">
        <Link to="/" className="flex items-center gap-2">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteName} className="w-9 h-9 rounded-xl object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-lg">{settings?.siteName?.charAt(0) || "S"}</span>
            </div>
          )}
          <span className="font-bold text-lg">{settings?.siteName || "Sity Experts"}</span>
        </Link>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link 
            to="/" 
            className="hidden lg:inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            العودة للرئيسية
          </Link>
          
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              أنشئ حسابك الآن 🚀
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              انضم لآلاف العملاء واحصل على خدمات احترافية
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">الاسم الكامل</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="أحمد محمد"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-12 sm:h-14 text-base auth-neo-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-12 sm:h-14 text-base auth-neo-input"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                رقم الهاتف <span className="text-muted-foreground text-xs">(اختياري)</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="01xxxxxxxxx"
                value={formData.phone}
                onChange={handleChange}
                className="h-12 sm:h-14 text-base auth-neo-input"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-sm font-medium">
                كود الإحالة <span className="text-muted-foreground text-xs">(اختياري)</span>
              </Label>
              <Input
                id="referralCode"
                name="referralCode"
                type="text"
                placeholder="أدخل كود الإحالة إن وجد"
                value={formData.referralCode}
                onChange={handleChange}
                className="h-12 sm:h-14 text-base auth-neo-input"
                dir="ltr"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-12 sm:h-14 text-base auth-neo-input pl-12"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">تأكيد كلمة المرور</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="h-12 sm:h-14 text-base auth-neo-input"
                  dir="ltr"
                />
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                بالتسجيل أنت موافق على{" "}
                <Link to="/terms" className="text-primary hover:underline">الشروط والأحكام</Link>
                {" "}و{" "}
                <Link to="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 sm:h-14 text-base font-semibold" 
              loading={loading}
              variant="hero"
            >
              إنشاء الحساب
            </Button>
          </form>
          
          <p className="text-center text-muted-foreground mt-6 text-sm sm:text-base">
            عندك حساب بالفعل؟{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              سجل دخولك
            </Link>
          </p>
          
          <div className="mt-4 text-center">
            <Link to="/freelancer-register" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              تريد الانضمام كفريلانسر؟ <span className="underline">سجل هنا</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 auth-neo-brand items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-lg text-center auth-neo-brand-content relative z-10">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteName} className="w-24 h-24 rounded-3xl mx-auto mb-10 shadow-2xl object-contain auth-neo-brand-badge p-2" />
          ) : (
            <div className="w-24 h-24 mx-auto mb-10 flex items-center justify-center auth-neo-brand-badge">
              <span className="text-5xl font-bold">{settings?.siteName?.charAt(0) || "S"}</span>
            </div>
          )}
          
          <h2 className="text-3xl xl:text-4xl font-bold mb-6">{settings?.siteName || "Sity Experts"}</h2>
          <p className="text-lg xl:text-xl auth-neo-brand-lead mb-12 leading-relaxed">
            منصة خدمات مُدارة تضمن لك جودة التسليم وراحة البال. 
            اطلب خدمتك واستلمها جاهزة.
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: Gift, text: "مهمة مجانية للتجربة" },
              { icon: CheckCircle, text: "جودة مضمونة ومراجعة قبل التسليم" },
              { icon: Sparkles, text: "فريق خبراء متخصصين" },
              { icon: Shield, text: "دعم فني على مدار الساعة" },
            ].map((feature, index) => (
              <div key={index} className="auth-neo-brand-feature">
                <div className="auth-neo-brand-icon">
                  <feature.icon className="w-6 h-6" />
                </div>
                <span className="text-base font-semibold">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
