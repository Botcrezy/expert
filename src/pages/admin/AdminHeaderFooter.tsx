import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Save,
  Layout,
  Menu,
  Globe,
  Palette,
  Eye,
  Check,
} from "lucide-react";

const headerDesigns = [
  {
    id: "default",
    name: "افتراضي",
    description: "تصميم كلاسيكي مع شعار وقائمة",
    preview: "bg-background border-b",
  },
  {
    id: "transparent",
    name: "شفاف",
    description: "هيدر شفاف يتغير عند التمرير",
    preview: "bg-transparent border-b border-white/20",
  },
  {
    id: "centered",
    name: "متمركز",
    description: "شعار في المنتصف مع قوائم جانبية",
    preview: "bg-primary/5 border-b",
  },
  {
    id: "minimal",
    name: "بسيط",
    description: "تصميم مختصر مع أيقونات فقط",
    preview: "bg-card shadow-sm",
  },
];

const footerDesigns = [
  {
    id: "default",
    name: "افتراضي",
    description: "فوتر متعدد الأعمدة مع روابط",
    columns: 4,
  },
  {
    id: "minimal",
    name: "بسيط",
    description: "فوتر سطر واحد مختصر",
    columns: 1,
  },
  {
    id: "centered",
    name: "متمركز",
    description: "محتوى في المنتصف مع سوشيال",
    columns: 2,
  },
  {
    id: "dark",
    name: "داكن",
    description: "فوتر بخلفية داكنة مميزة",
    columns: 4,
  },
];

export default function AdminHeaderFooter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [headerSettings, setHeaderSettings] = useState({
    design_variant: "default",
    showLogo: true,
    showNavigation: true,
    transparent: false,
    sticky: true,
  });

  const [footerSettings, setFooterSettings] = useState({
    design_variant: "default",
    showSocial: true,
    showNewsletter: true,
    showContactInfo: true,
    columns: 4,
  });

  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ["header-footer-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("header_footer_settings")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (dbSettings) {
      const header = dbSettings.find((s: any) => s.setting_type === "header");
      const footer = dbSettings.find((s: any) => s.setting_type === "footer");

      if (header) {
        setHeaderSettings({
          design_variant: header.design_variant,
          ...((header.settings as any) || {}),
        });
      }
      if (footer) {
        setFooterSettings({
          design_variant: footer.design_variant,
          ...((footer.settings as any) || {}),
        });
      }
    }
  }, [dbSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update header
      const { error: headerError } = await supabase
        .from("header_footer_settings")
        .upsert({
          setting_type: "header",
          design_variant: headerSettings.design_variant,
          settings: headerSettings,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "setting_type",
        });
      if (headerError) throw headerError;

      // Update footer
      const { error: footerError } = await supabase
        .from("header_footer_settings")
        .upsert({
          setting_type: "footer",
          design_variant: footerSettings.design_variant,
          settings: footerSettings,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "setting_type",
        });
      if (footerError) throw footerError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["header-footer-settings"] });
      queryClient.invalidateQueries({ queryKey: ["dynamic-header-settings"] });
      queryClient.invalidateQueries({ queryKey: ["dynamic-footer-settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح! ✅" });
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="تصميم Header & Footer">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="تصميم Header & Footer"
      subtitle="تخصيص تصاميم الهيدر والفوتر للموقع"
    >
      <Tabs defaultValue="header" className="space-y-6">
        <TabsList>
          <TabsTrigger value="header" className="gap-2">
            <Menu className="w-4 h-4" />
            الهيدر
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-2">
            <Layout className="w-4 h-4" />
            الفوتر
          </TabsTrigger>
        </TabsList>

        {/* Header Settings */}
        <TabsContent value="header" className="space-y-6">
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              اختر تصميم الهيدر
            </h3>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {headerDesigns.map((design) => (
                <div
                  key={design.id}
                  className={cn(
                    "border-2 rounded-xl p-4 cursor-pointer transition-all",
                    headerSettings.design_variant === design.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setHeaderSettings({ ...headerSettings, design_variant: design.id })}
                >
                  <div className={cn("h-12 rounded-lg mb-3", design.preview)} />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{design.name}</h4>
                      <p className="text-xs text-muted-foreground">{design.description}</p>
                    </div>
                    {headerSettings.design_variant === design.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-6 space-y-4">
            <h3 className="text-lg font-semibold">خيارات الهيدر</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label>إظهار الشعار</Label>
                <Switch
                  checked={headerSettings.showLogo}
                  onCheckedChange={(checked) => 
                    setHeaderSettings({ ...headerSettings, showLogo: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label>إظهار القائمة</Label>
                <Switch
                  checked={headerSettings.showNavigation}
                  onCheckedChange={(checked) => 
                    setHeaderSettings({ ...headerSettings, showNavigation: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label>هيدر ثابت (Sticky)</Label>
                <Switch
                  checked={headerSettings.sticky}
                  onCheckedChange={(checked) => 
                    setHeaderSettings({ ...headerSettings, sticky: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label>خلفية شفافة</Label>
                <Switch
                  checked={headerSettings.transparent}
                  onCheckedChange={(checked) => 
                    setHeaderSettings({ ...headerSettings, transparent: checked })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Footer Settings */}
        <TabsContent value="footer" className="space-y-6">
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              اختر تصميم الفوتر
            </h3>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {footerDesigns.map((design) => (
                <div
                  key={design.id}
                  className={cn(
                    "border-2 rounded-xl p-4 cursor-pointer transition-all",
                    footerSettings.design_variant === design.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setFooterSettings({ ...footerSettings, design_variant: design.id })}
                >
                  <div className="h-16 rounded-lg mb-3 bg-muted flex items-end p-2 gap-1">
                    {Array.from({ length: design.columns }).map((_, i) => (
                      <div key={i} className="flex-1 h-2 bg-foreground/20 rounded" />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{design.name}</h4>
                      <p className="text-xs text-muted-foreground">{design.description}</p>
                    </div>
                    {footerSettings.design_variant === design.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-6 space-y-4">
            <h3 className="text-lg font-semibold">خيارات الفوتر</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label>إظهار السوشيال ميديا</Label>
                <Switch
                  checked={footerSettings.showSocial}
                  onCheckedChange={(checked) => 
                    setFooterSettings({ ...footerSettings, showSocial: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label>إظهار النشرة البريدية</Label>
                <Switch
                  checked={footerSettings.showNewsletter}
                  onCheckedChange={(checked) => 
                    setFooterSettings({ ...footerSettings, showNewsletter: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Label>إظهار معلومات التواصل</Label>
                <Switch
                  checked={footerSettings.showContactInfo}
                  onCheckedChange={(checked) => 
                    setFooterSettings({ ...footerSettings, showContactInfo: checked })
                  }
                />
              </div>
            </div>
          </div>
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
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              حفظ التصميم
            </>
          )}
        </Button>
      </div>
    </DashboardLayout>
  );
}
