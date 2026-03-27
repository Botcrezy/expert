import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Briefcase, TrendingUp, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function FreelancerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, userRole, user } = useAuth();

  useEffect(() => {
    const checkFreelancerStatus = async () => {
      if (user && userRole) {
        if (userRole === "freelancer") {
          // Check if freelancer is verified
          const { data: freelancerProfile } = await supabase
            .from("freelancer_profiles")
            .select("is_verified, verification_status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (freelancerProfile?.is_verified) {
            navigate("/freelancer/dashboard", { replace: true });
          } else {
            navigate("/freelancer/account-pending", { replace: true });
          }
        } else {
          toast({
            title: "ملاحظة",
            description: "هذا الحساب ليس حساب فريلانسر",
          });
          const redirects: Record<string, string> = {
            client: "/client/dashboard",
            admin: "/admin",
            team_leader: "/admin",
          };
          navigate(redirects[userRole] || "/", { replace: true });
        }
      }
    };

    checkFreelancerStatus();
  }, [user, userRole, navigate, toast]);

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
        toast({
          title: "خطأ في تسجيل الدخول",
          description: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "تم تسجيل الدخول بنجاح ✓",
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Briefcase className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Sity Experts</span>
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
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
              <Briefcase className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              مرحباً بعودتك! 💼
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              سجل دخولك لإدارة مهامك وأرباحك
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 auth-neo-input"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
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
                  className="h-12 auth-neo-input pl-12"
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
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={loading}
              variant="hero"
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm">
              ما عندكش حساب فريلانسر؟{" "}
              <Link to="/freelancer-register" className="text-primary hover:underline font-medium">
                انضم لفريقنا
              </Link>
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              أو{" "}
              <Link to="/login" className="text-primary hover:underline">
                سجل كعميل
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 auth-neo-brand items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-lg text-center auth-neo-brand-content relative z-10">
          <div className="w-24 h-24 mx-auto mb-10 flex items-center justify-center auth-neo-brand-badge">
            <Briefcase className="w-12 h-12" />
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold mb-6">منصة الفريلانسرز</h2>
          <p className="text-lg xl:text-xl auth-neo-brand-lead mb-12 leading-relaxed">
            انضم لفريق Sity Experts واحصل على مهام مناسبة لمهاراتك مع ضمان الدفع.
          </p>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: TrendingUp, text: "نمو مستمر في الأرباح" },
              { icon: Wallet, text: "دفعات منتظمة ومضمونة" },
              { icon: Briefcase, text: "مهام متنوعة تناسب مهاراتك" },
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
