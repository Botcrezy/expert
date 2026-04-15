import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Sparkles, Shield, Clock, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import platformLogo from "@/assets/logo.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, userRole, user } = useAuth();
  const { data: settings } = usePlatformSettings();

  useEffect(() => {
    if (user && userRole) {
      const pending = sessionStorage.getItem("pending_service_purchase");
      if (userRole === "client" && pending) {
        try {
          const parsed = JSON.parse(pending);
          const service = parsed?.service;
          const freelancerId = parsed?.freelancerId;
          if (service?.id && freelancerId) {
            sessionStorage.setItem("pending_service_purchase", JSON.stringify({ ...parsed, userId: user.id }));
            navigate(`/client/checkout?resume=1`, { replace: true });
            return;
          }
        } catch { /* ignore */ }
      }
      const roleRedirects: Record<string, string> = {
        client: "/client/dashboard",
        freelancer: "/freelancer/dashboard",
        admin: "/admin",
        team_leader: "/admin",
      };
      navigate(roleRedirects[userRole] || "/client/dashboard", { replace: true });
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "خطأ", description: "يرجى إدخال البريد الإلكتروني وكلمة المرور", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        let errorMessage = "حدث خطأ في تسجيل الدخول";
        if (error.message === "Invalid login credentials") errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        else if (error.message.includes("Email not confirmed")) errorMessage = "يرجى تأكيد بريدك الإلكتروني أولاً";
        toast({ title: "خطأ في تسجيل الدخول", description: errorMessage, variant: "destructive" });
        return;
      }
      toast({ title: "تم تسجيل الدخول بنجاح ✓", description: "جاري تحويلك للوحة التحكم..." });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-16">
        <div className="w-full max-w-md">
          <Link to="/" className="hidden lg:inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-10 transition-colors group text-sm">
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            العودة للرئيسية
          </Link>

          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <LogIn className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">أهلاً بعودتك! 👋</h1>
            <p className="text-muted-foreground">سجل دخولك للمتابعة والوصول لحسابك</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base rounded-xl bg-muted/50 border-border focus-visible:ring-primary"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">كلمة المرور</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base rounded-xl bg-muted/50 border-border focus-visible:ring-primary pl-12"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl" loading={loading}>
              تسجيل الدخول
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-4 bg-background text-muted-foreground">أو</span></div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-center text-muted-foreground text-sm">ما عندكش حساب؟</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/register" className="flex-1">
                <Button variant="outline" className="w-full h-11 rounded-xl">تسجيل كعميل</Button>
              </Link>
              <Link to="/freelancer-register" className="flex-1">
                <Button variant="secondary" className="w-full h-11 rounded-xl">انضم كفريلانسر</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding Panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-16 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-28 h-28 bg-white/8 rounded-full blur-2xl" />
        </div>

        <div className="max-w-lg text-center relative z-10">
          {settings?.logoUrl ? (
            <img src={platformLogo} alt={settings.siteName} className="w-20 h-20 mx-auto mb-8 object-contain rounded-2xl bg-white/15 p-3 backdrop-blur-sm border border-white/20 shadow-2xl" />
          ) : (
            <img src={platformLogo} alt="Sity Experts" className="w-20 h-20 mx-auto mb-8 object-contain rounded-2xl bg-white/15 p-3 backdrop-blur-sm border border-white/20 shadow-2xl" />
          )}

          <h2 className="text-3xl xl:text-4xl font-bold mb-4 text-white">{settings?.siteName || "Sity Experts"}</h2>
          <p className="text-lg text-white/85 mb-10 leading-relaxed">منصة خدمات مُدارة تضمن لك جودة التسليم وراحة البال. اطلب خدمتك واستلمها جاهزة.</p>

          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: Sparkles, text: "جودة مضمونة ومراجعة قبل التسليم" },
              { icon: Shield, text: "حماية كاملة للمشاريع والدفعات" },
              { icon: Clock, text: "دعم فني على مدار الساعة" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl p-4 bg-white/10 backdrop-blur-sm border border-white/15 text-right hover:bg-white/15 transition-colors">
                <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-medium text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
