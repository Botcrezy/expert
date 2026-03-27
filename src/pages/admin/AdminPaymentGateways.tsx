import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Save, 
  Loader2, 
  Globe,
  CheckCircle2,
  AlertCircle,
  Shield,
  Zap
} from "lucide-react";

interface KashierSettings {
  kashierEnabled: boolean;
}

export default function AdminPaymentGateways() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-payment-gateway-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .in("key", ["kashierEnabled"]);
      return data || [];
    },
  });

  const [formData, setFormData] = useState<KashierSettings>({
    kashierEnabled: false,
  });

  useEffect(() => {
    if (settings) {
      const newFormData = { ...formData };
      settings.forEach(setting => {
        const key = setting.key as keyof KashierSettings;
        if (key in formData) {
          try {
            const value = typeof setting.value === "string" 
              ? JSON.parse(setting.value as string) 
              : setting.value;
            (newFormData as any)[key] = value;
          } catch {
            (newFormData as any)[key] = setting.value;
          }
        }
      });
      setFormData(newFormData);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(formData);
      
      for (const [key, value] of entries) {
        await supabase
          .from("settings")
          .upsert({
            key,
            value: JSON.stringify(value),
            group_name: "payment_gateways",
            type: typeof value === "boolean" ? "boolean" : "string",
            is_public: key === "kashierEnabled",
          }, { onConflict: "key" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-gateway-settings"] });
      toast({ title: "تم حفظ إعدادات بوابة الدفع بنجاح! ✅" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const testKashierConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("kashier-payment", {
        method: "GET",
      });

      if (error) throw error;

      const isConfigured = Boolean((data as any)?.configured ?? (data as any)?.available);
      if (!isConfigured) {
        throw new Error("Kashier غير مُكوّن");
      }

      toast({
        title: "اتصال ناجح! ✅",
        description: "تم التحقق من إعدادات Kashier بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "فشل الاتصال",
        description: error?.message || "تحقق من البيانات المدخلة",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout
        sidebar={<AdminSidebar />}
        title="بوابات الدفع"
        subtitle="إعدادات بوابات الدفع الإلكتروني"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="بوابات الدفع"
      subtitle="إعدادات بوابات الدفع الإلكتروني"
    >
      <div className="max-w-3xl space-y-6">
        {/* Kashier Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  K
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Kashier Payment Gateway
                    {formData.kashierEnabled ? (
                      <Badge className="bg-success text-success-foreground">مفعّل</Badge>
                    ) : (
                      <Badge variant="secondary">معطّل</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    بوابة الدفع الإلكتروني - فيزا/ماستر/فوري/المحافظ الإلكترونية
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={formData.kashierEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, kashierEnabled: checked })}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="grid sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span>دفع آمن PCI DSS</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-warning" />
                <span>تفعيل فوري</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-success" />
                <span>طرق دفع متعددة</span>
              </div>
            </div>

            {/* Credentials Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">بيانات الاعتماد</Label>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border text-sm text-muted-foreground space-y-2">
                <p>
                  بيانات الاعتماد الخاصة ببوابة الدفع (Merchant ID, API Key, Secret Key) محفوظة بشكل آمن
                  داخل بيئة الخادم فقط كمتغيرات سرّية، ولا يتم تخزينها في قاعدة البيانات.
                </p>
                <p>
                  إذا كنت تحتاج لتعديل المفاتيح، قم بتحديث متغيرات البيئة الخاصة بالخادم ثم استخدم زر
                  "اختبار الاتصال" بالأسفل للتأكد من أن الإعدادات صحيحة.
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">كيفية تحديث بيانات Kashier:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>انتقل إلى: Backend → Secrets</li>
                    <li>أضف أو عدّل المتغيرات: KASHIER_MERCHANT_ID, KASHIER_API_KEY, KASHIER_SECRET_KEY</li>
                    <li>احصل على القيم من لوحة تحكم Kashier: Integrate Now → Payment API Keys</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={testKashierConnection}
                disabled={!formData.kashierEnabled}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                اختبار الاتصال
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                حفظ الإعدادات
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Other Payment Methods Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              طرق الدفع اليدوية
            </CardTitle>
            <CardDescription>
              التحويل البنكي والمحافظ الإلكترونية - يتم إعدادها من صفحة الإعدادات العامة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a href="/admin/settings">الذهاب للإعدادات العامة</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
