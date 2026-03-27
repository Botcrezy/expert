import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, userRole, user } = useAuth();

  useEffect(() => {
    if (user && userRole) {
      if (userRole === "admin" || userRole === "team_leader") {
        navigate("/admin", { replace: true });
      } else {
        toast({
          title: "غير مصرح",
          description: "هذه الصفحة مخصصة للمسؤولين فقط",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      }
    }
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
        description: "جاري التحويل للوحة التحكم...",
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
    <div className="min-h-screen auth-neo auth-neo-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">لوحة تحكم الإدارة</h1>
          <p className="text-muted-foreground">تسجيل الدخول للوصول للوحة التحكم</p>
        </div>

        {/* Form Card */}
        <div className="auth-neo-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 auth-neo-input text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                كلمة المرور
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 auth-neo-input text-foreground placeholder:text-muted-foreground pl-12"
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
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري تسجيل الدخول...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  تسجيل الدخول
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/70">
            <p className="text-center text-muted-foreground text-sm">
              لست مسؤولاً؟{" "}
              <Link to="/login" className="text-primary hover:underline">
                تسجيل الدخول للعملاء
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground/70 text-xs mt-6">
          © 2024 Sity Experts. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
