import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Sparkles, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, userRole, user } = useAuth();
  const { data: settings } = usePlatformSettings();

  // Redirect based on role when user is authenticated
  useEffect(() => {
    if (user && userRole) {
      // Resume pending service purchase (saved from public portfolio) for clients
      const pending = sessionStorage.getItem("pending_service_purchase");
      if (userRole === "client" && pending) {
        try {
          const parsed = JSON.parse(pending);
          const service = parsed?.service;
          const freelancerId = parsed?.freelancerId;
          if (service?.id && freelancerId) {
            // We can't create DB rows in this effect without supabase imports here;
            // Redirect to checkout and let it create the purchase intent.
            sessionStorage.setItem("pending_service_purchase", JSON.stringify({ ...parsed, userId: user.id }));
            navigate(`/client/checkout?resume=1`, { replace: true });
            return;
          }
        } catch {
          // ignore
        }
      }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني وكلمة المرور",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        let errorMessage = "حدث خطأ في تسجيل الدخول";
        if (error.message === "Invalid login credentials") {
          errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "يرجى تأكيد بريدك الإلكتروني أولاً";
        }
        
        toast({
          title: "خطأ في تسجيل الدخول",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "تم تسجيل الدخول بنجاح ✓",
        description: "جاري تحويلك للوحة التحكم...",
      });
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
            className="hidden lg:inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            العودة للرئيسية
          </Link>
          
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              أهلاً بعودتك! 👋
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              سجل دخولك للمتابعة والوصول لحسابك
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 sm:h-14 text-base auth-neo-input focus-visible:ring-ring transition-colors"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور
                </Label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs sm:text-sm text-primary hover:underline transition-colors"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                    className="h-12 sm:h-14 text-base auth-neo-input focus-visible:ring-ring transition-colors pl-12"
                    dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 sm:h-14 text-base font-semibold" 
              loading={loading}
              variant="hero"
            >
              تسجيل الدخول
            </Button>
          </form>
          
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">أو</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            <p className="text-center text-muted-foreground text-sm sm:text-base">
              ما عندكش حساب؟
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/register" className="flex-1">
                <Button variant="outline" className="w-full h-11 sm:h-12">
                  تسجيل كعميل
                </Button>
              </Link>
              <Link to="/freelancer-register" className="flex-1">
                <Button variant="secondary" className="w-full h-11 sm:h-12">
                  انضم كفريلانسر
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 auth-neo-brand items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        </div>
        
        <div className="max-w-lg text-center auth-neo-brand-content relative z-10">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteName} className="w-24 h-24 mx-auto mb-10 object-contain auth-neo-brand-chip" />
          ) : (
            <div className="w-24 h-24 rounded-3xl auth-neo-brand-badge flex items-center justify-center mx-auto mb-10 shadow-2xl">
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
              { icon: Sparkles, text: "جودة مضمونة ومراجعة قبل التسليم" },
              { icon: Shield, text: "حماية كاملة للمشاريع والدفعات" },
              { icon: Clock, text: "دعم فني على مدار الساعة" },
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
