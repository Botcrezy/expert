import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "تم الإرسال بنجاح", description: "تفقد بريدك الإلكتروني" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">تم الإرسال بنجاح! ✓</h1>
          <p className="text-muted-foreground mb-8">تفقد بريدك <span className="text-foreground font-medium">{email}</span></p>
          <Link to="/login">
            <Button variant="outline" className="w-full h-12 rounded-xl">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة لتسجيل الدخول
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors text-sm">
          <ArrowRight className="w-4 h-4" />
          العودة لتسجيل الدخول
        </Link>

        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Mail className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">نسيت كلمة المرور؟</h1>
        <p className="text-muted-foreground mb-8">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

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
              className="h-12 text-base rounded-xl bg-muted/50 border-border"
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" loading={loading}>
            إرسال رابط إعادة التعيين
          </Button>
        </form>
      </div>
    </div>
  );
}
