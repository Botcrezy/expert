import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Loader2, 
  Globe, 
  Mail, 
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  MessageCircle
} from "lucide-react";

export default function AdminSiteSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    tiktok: ""
  });

  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
    whatsapp: "",
    address: ""
  });

  const [pricingSettings, setPricingSettings] = useState({
    credit_price_egp: "50"
  });

  const [newsletterSettings, setNewsletterSettings] = useState({
    enabled: true,
    title: "اشترك في نشرتنا البريدية",
    subtitle: "احصل على آخر العروض والأخبار"
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      const social = settings.find(s => s.key === "social_links");
      const contact = settings.find(s => s.key === "contact_info");
      const newsletter = settings.find(s => s.key === "newsletter_settings");
      const pricing = settings.find(s => s.key === "credit_price_egp");

      if (social?.value) setSocialLinks(social.value as any);
      if (contact?.value) setContactInfo(contact.value as any);
      if (newsletter?.value) setNewsletterSettings(newsletter.value as any);
      if (pricing?.value) setPricingSettings({ credit_price_egp: String(pricing.value).replace(/"/g, '') });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: "social_links", value: socialLinks, category: "social", is_public: true },
        { key: "contact_info", value: contactInfo, category: "contact", is_public: true },
        { key: "newsletter_settings", value: newsletterSettings, category: "newsletter", is_public: true },
        { key: "credit_price_egp", value: `"${pricingSettings.credit_price_egp}"`, category: "pricing", is_public: false }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("site_settings")
          .upsert(update, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["dynamic-footer-settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح! ✅" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="إعدادات الموقع">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إعدادات الموقع"
      subtitle="تخصيص السوشيال ميديا ومعلومات التواصل"
    >
      <Tabs defaultValue="social" className="space-y-6">
        <TabsList>
          <TabsTrigger value="social" className="gap-2">
            <Globe className="w-4 h-4" />
            السوشيال ميديا
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="w-4 h-4" />
            التواصل
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="gap-2">
            <Mail className="w-4 h-4" />
            النشرة البريدية
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <Save className="w-4 h-4" />
            التسعير
          </TabsTrigger>
        </TabsList>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                روابط السوشيال ميديا
              </CardTitle>
              <CardDescription>
                أضف روابط حساباتك على مواقع التواصل الاجتماعي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    Facebook
                  </Label>
                  <Input
                    value={socialLinks.facebook}
                    onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                    placeholder="https://facebook.com/..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-sky-500" />
                    Twitter / X
                  </Label>
                  <Input
                    value={socialLinks.twitter}
                    onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                    placeholder="https://twitter.com/..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    Instagram
                  </Label>
                  <Input
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-blue-700" />
                    LinkedIn
                  </Label>
                  <Input
                    value={socialLinks.linkedin}
                    onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600" />
                    YouTube
                  </Label>
                  <Input
                    value={socialLinks.youtube}
                    onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                    placeholder="https://youtube.com/..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    TikTok
                  </Label>
                  <Input
                    value={socialLinks.tiktok}
                    onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                    placeholder="https://tiktok.com/..."
                    dir="ltr"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                معلومات التواصل
              </CardTitle>
              <CardDescription>
                معلومات التواصل التي ستظهر في الفوتر وصفحة التواصل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                    placeholder="support@example.com"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف
                  </Label>
                  <Input
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                    placeholder="+20 xxx xxx xxxx"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    WhatsApp
                  </Label>
                  <Input
                    value={contactInfo.whatsapp}
                    onChange={(e) => setContactInfo({ ...contactInfo, whatsapp: e.target.value })}
                    placeholder="+20 xxx xxx xxxx"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    العنوان
                  </Label>
                  <Input
                    value={contactInfo.address}
                    onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                    placeholder="القاهرة، مصر"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="newsletter">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                إعدادات النشرة البريدية
              </CardTitle>
              <CardDescription>
                تخصيص قسم الاشتراك في النشرة البريدية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label>تفعيل النشرة البريدية</Label>
                <Switch
                  checked={newsletterSettings.enabled}
                  onCheckedChange={(checked) => 
                    setNewsletterSettings({ ...newsletterSettings, enabled: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={newsletterSettings.title}
                  onChange={(e) => setNewsletterSettings({ ...newsletterSettings, title: e.target.value })}
                  placeholder="اشترك في نشرتنا البريدية"
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Input
                  value={newsletterSettings.subtitle}
                  onChange={(e) => setNewsletterSettings({ ...newsletterSettings, subtitle: e.target.value })}
                  placeholder="احصل على آخر العروض والأخبار"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Settings */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" />
                إعدادات التسعير
              </CardTitle>
              <CardDescription>
                تحديد سعر الكريديت الواحد بالجنيه المصري للتسعير الذكي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>سعر الكريديت الواحد (ج.م)</Label>
                <Input
                  type="number"
                  value={pricingSettings.credit_price_egp}
                  onChange={(e) => setPricingSettings({ credit_price_egp: e.target.value })}
                  placeholder="50"
                  min="1"
                />
                <p className="text-sm text-muted-foreground">
                  يُستخدم هذا السعر لحساب السعر التقريبي للطلبات بناءً على عدد الكريديتات
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={saveMutation.isPending}
          size="lg"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              حفظ الإعدادات
            </>
          )}
        </Button>
      </div>
    </DashboardLayout>
  );
}
