import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings,
  Save,
  Loader2,
  Globe,
  CreditCard,
  Bell,
  Shield,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Coins
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*");
      return data || [];
    },
  });

  const [formData, setFormData] = useState({
    siteName: "Sity Experts",
    siteDescription: "منصة خدمات مُدارة باحترافية",
    supportEmail: "support@sityexperts.com",
    logoUrl: "",
    taxRate: "14",
    minWithdrawal: "100",
    autoAssignment: true,
    emailNotifications: true,
    maintenanceMode: false,
    bankTransferDetails: "البنك الأهلي المصري\nرقم الحساب: 1234567890\nاسم الحساب: Sity Experts",
    mobileWalletDetails: "فودافون كاش: 01xxxxxxxxx\nأورانج كاش: 01xxxxxxxxx",
    credit_to_egp_rate: "50",
    ai_pricing_enabled: true,
    // Identity verification settings
    identity_verification_enabled: true,
    client_identity_required: true,
    freelancer_identity_required: true,
  });

  useEffect(() => {
    if (settings) {
      const newFormData = { ...formData };
      settings.forEach(setting => {
        const key = setting.key as keyof typeof formData;
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
            group_name: key.includes("credit") || key.includes("pricing") ? "payments" : "general",
            type: typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string",
            is_public: !key.includes("rate") && !key.includes("pricing"),
          }, { onConflict: "key" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["cms-sections"] });
      toast({
        title: "تم حفظ الإعدادات بنجاح! ✅",
      });
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `platform/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, logoUrl: publicUrl }));
      toast({ title: "تم رفع الشعار بنجاح ✅" });
    } catch (error: any) {
      toast({
        title: "خطأ في رفع الشعار",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout
        sidebar={<AdminSidebar />}
        title="الإعدادات"
        subtitle="إعدادات المنصة العامة"
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
      title="الإعدادات"
      subtitle="إعدادات المنصة العامة"
    >
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general" className="gap-2">
            <Globe className="w-4 h-4" />
            عام
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            المدفوعات
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <Coins className="w-4 h-4" />
            التسعير والتحويل
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            الأمان
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="card-elevated p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5" />
              الإعدادات العامة
            </h3>

            {/* Logo Upload */}
            <div className="space-y-3">
              <Label>شعار المنصة</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                      <span>
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploading ? "جاري الرفع..." : "رفع شعار"}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG (max 2MB)</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>اسم الموقع</Label>
                <Input
                  value={formData.siteName}
                  onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>بريد الدعم</Label>
                <Input
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>وصف الموقع</Label>
              <Textarea
                value={formData.siteDescription}
                onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium text-foreground">التعيين التلقائي</p>
                <p className="text-sm text-muted-foreground">تعيين المهام تلقائياً للفريلانسرز المتاحين</p>
              </div>
              <Switch
                checked={formData.autoAssignment}
                onCheckedChange={(checked) => setFormData({ ...formData, autoAssignment: checked })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="card-elevated p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              إعدادات المدفوعات
            </h3>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>نسبة الضريبة (%)</Label>
                <Input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>الحد الأدنى للسحب (ج.م)</Label>
                <Input
                  type="number"
                  value={formData.minWithdrawal}
                  onChange={(e) => setFormData({ ...formData, minWithdrawal: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>بيانات التحويل البنكي</Label>
              <Textarea
                value={formData.bankTransferDetails}
                onChange={(e) => setFormData({ ...formData, bankTransferDetails: e.target.value })}
                rows={4}
                placeholder="اسم البنك&#10;رقم الحساب&#10;اسم صاحب الحساب"
              />
              <p className="text-xs text-muted-foreground">تظهر هذه البيانات للعملاء عند الدفع بالتحويل البنكي</p>
            </div>

            <div className="space-y-2">
              <Label>بيانات المحافظ الإلكترونية</Label>
              <Textarea
                value={formData.mobileWalletDetails}
                onChange={(e) => setFormData({ ...formData, mobileWalletDetails: e.target.value })}
                rows={4}
                placeholder="فودافون كاش: 01xxxxxxxxx&#10;أورانج كاش: 01xxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">تظهر هذه البيانات للعملاء عند الدفع بالمحافظ الإلكترونية</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="card-elevated p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5" />
              إعدادات التسعير وتحويل الكريديت
            </h3>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">سعر تحويل الكريديت</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    يُستخدم هذا السعر لتحويل كريديتات العميل إلى فلوس يستلمها الفريلانسر
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="space-y-1">
                      <Label>1 كريديت =</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={formData.credit_to_egp_rate}
                          onChange={(e) => setFormData({ ...formData, credit_to_egp_rate: e.target.value })}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">ج.م</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-foreground">تسعير الذكاء الصناعي</p>
                  <p className="text-sm text-muted-foreground">اقتراح أسعار المهام تلقائياً بناءً على البيانات</p>
                </div>
              </div>
              <Switch
                checked={formData.ai_pricing_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, ai_pricing_enabled: checked })}
              />
            </div>

            <div className="p-4 border rounded-xl bg-muted/30">
              <h4 className="font-medium mb-2">كيف يعمل نظام الدفع؟</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>عند تعيين مهمة للفريلانسر، يُحدد الأدمن مبلغ الدفع (أو يستخدم اقتراح AI)</li>
                <li>بعد موافقة المنصة على التسليم، يُضاف المبلغ تلقائياً لمحفظة الفريلانسر</li>
                <li>يتم خصم كريديت العميل عند إنشاء الطلب</li>
                <li>الفريلانسر يستلم المبلغ المحدد بالجنيه المصري</li>
              </ol>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="card-elevated p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5" />
              إعدادات الإشعارات
            </h3>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium text-foreground">إشعارات البريد الإلكتروني</p>
                <p className="text-sm text-muted-foreground">إرسال إشعارات للمستخدمين عبر البريد</p>
              </div>
              <Switch
                checked={formData.emailNotifications}
                onCheckedChange={(checked) => setFormData({ ...formData, emailNotifications: checked })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="card-elevated p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              إعدادات الأمان والتحقق
            </h3>

            <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div>
                <p className="font-medium text-foreground">وضع الصيانة</p>
                <p className="text-sm text-muted-foreground">إيقاف الموقع مؤقتاً للصيانة</p>
              </div>
              <Switch
                checked={formData.maintenanceMode}
                onCheckedChange={(checked) => setFormData({ ...formData, maintenanceMode: checked })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">إعدادات التحقق من الهوية</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">تفعيل نظام التحقق من الهوية</p>
                    <p className="text-sm text-muted-foreground">طلب التحقق من هوية المستخدمين</p>
                  </div>
                  <Switch
                    checked={formData.identity_verification_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, identity_verification_enabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">إلزام العملاء بالتحقق</p>
                    <p className="text-sm text-muted-foreground">يجب على العملاء التحقق من هويتهم</p>
                  </div>
                  <Switch
                    checked={formData.client_identity_required}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, client_identity_required: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">إلزام الفريلانسرز بالتحقق</p>
                    <p className="text-sm text-muted-foreground">يجب على الفريلانسرز التحقق من هويتهم</p>
                  </div>
                  <Switch
                    checked={formData.freelancer_identity_required}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, freelancer_identity_required: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </div>
      </Tabs>
    </DashboardLayout>
  );
}
