import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function SetupAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      // Run the backend bootstrap (creates/updates admin user + assigns admin role)
      const { error: fnError } = await supabase.functions.invoke("setup-admin", {
        body: {
          email,
          password,
          full_name: fullName,
          setup_token: setupToken || undefined,
        },
      });

      if (fnError) throw fnError;

      // Sign in to start an authenticated session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      setSuccess(true);
      toast({
        title: "تم إعداد حساب الأدمن بنجاح ✅",
        description: "يمكنك الآن الدخول للوحة التحكم.",
      });
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "حدث خطأ أثناء الإعداد");
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء الإعداد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">تم الإعداد بنجاح!</h2>
            <p className="text-slate-400 mb-6">
              تم إنشاء حساب الأدمن بنجاح. يمكنك الآن تسجيل الدخول للوحة التحكم.
            </p>
            <div className="space-y-3">
              <Link to="/admin/login">
                <Button className="w-full">
                  تسجيل الدخول للوحة التحكم
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  العودة للرئيسية
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl text-white">إعداد حساب الأدمن</CardTitle>
          <CardDescription className="text-slate-400">
            قم بإعداد حساب مدير النظام للوصول للوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/20 text-destructive rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-slate-300">الاسم الكامل</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white"
              dir="ltr"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setupToken" className="text-slate-300">رمز الإعداد (Setup Token)</Label>
            <Input
              id="setupToken"
              type="text"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white"
              dir="ltr"
            />
            <p className="text-xs text-slate-500">
              أدخل رمز الإعداد السري الذي تم تكوينه في إعدادات الخادم لإتمام إنشاء حساب الأدمن.
            </p>
          </div>
          
          <Button 
            onClick={handleSetup} 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإعداد...
              </span>
            ) : (
              "إنشاء حساب الأدمن"
            )}
          </Button>
          
          <p className="text-center text-slate-500 text-xs mt-4">
            هذه الصفحة تستخدم مرة واحدة فقط لإعداد النظام
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
