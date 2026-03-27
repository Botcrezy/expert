import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBlock, createDefaultBlock } from "@/components/pagebuilder/BlockTypes";
import {
  FileText,
  Newspaper,
  Info,
  Gift,
  HelpCircle,
  Users,
  Briefcase,
  MessageSquare,
  Layout,
  Plus,
} from "lucide-react";

interface PageTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: any;
  blocks: PageBlock[];
}

const pageTemplates: PageTemplate[] = [
  {
    id: "landing",
    name: "Landing Page",
    nameAr: "صفحة هبوط",
    description: "صفحة هبوط Premium: Hero + Trust + خدمات + آراء + CTA",
    icon: Layout,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("trustbar"),
      createDefaultBlock("service_categories"),
      createDefaultBlock("testimonials_carousel"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "news",
    name: "News / Offers",
    nameAr: "أخبار وعروض",
    description: "صفحة للأخبار والعروض الترويجية",
    icon: Newspaper,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("cards"),
      createDefaultBlock("newsletter"),
    ],
  },
  {
    id: "about",
    name: "About Us",
    nameAr: "من نحن",
    description: "صفحة تعريفية عن الشركة والفريق",
    icon: Info,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("timeline"),
      createDefaultBlock("team"),
      createDefaultBlock("counter"),
    ],
  },
  {
    id: "services",
    name: "Services",
    nameAr: "الخدمات",
    description: "صفحة خدمات Premium: تصنيفات + تسعير مقارنة + CTA",
    icon: Briefcase,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("service_categories"),
      createDefaultBlock("pricing_compare"),
      createDefaultBlock("faq_pro"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "faq",
    name: "FAQ",
    nameAr: "الأسئلة الشائعة",
    description: "FAQ Premium مع بحث + تواصل",
    icon: HelpCircle,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("faq_pro"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "contact",
    name: "Contact",
    nameAr: "اتصل بنا",
    description: "صفحة التواصل مع معلومات الاتصال",
    icon: MessageSquare,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "team",
    name: "Our Team",
    nameAr: "فريقنا",
    description: "عرض أعضاء الفريق",
    icon: Users,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("team"),
      createDefaultBlock("testimonials"),
    ],
  },
  {
    id: "offers",
    name: "Special Offers",
    nameAr: "عروض خاصة",
    description: "صفحة العروض والخصومات",
    icon: Gift,
    blocks: [
      createDefaultBlock("banner"),
      createDefaultBlock("pricing"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    nameAr: "معرض الأعمال",
    description: "عرض أعمال ومشاريع سابقة",
    icon: FileText,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("gallery"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "pricing-page",
    name: "Pricing Page",
    nameAr: "صفحة الأسعار",
    description: "تسعير Premium: مقارنة + أسئلة شائعة + CTA",
    icon: Gift,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("pricing_compare"),
      createDefaultBlock("faq_pro"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "careers",
    name: "Careers",
    nameAr: "الوظائف",
    description: "صفحة التوظيف والانضمام للفريق",
    icon: Users,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("features"),
      createDefaultBlock("team"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "privacy",
    name: "Privacy Policy",
    nameAr: "سياسة الخصوصية",
    description: "صفحة سياسة الخصوصية والشروط",
    icon: FileText,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("text"),
      createDefaultBlock("accordion"),
    ],
  },
  {
    id: "coming-soon",
    name: "Coming Soon",
    nameAr: "قريباً",
    description: "صفحة إطلاق قريب مع عداد تنازلي",
    icon: Layout,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("newsletter"),
    ],
  },
  // قوالب جديدة
  {
    id: "case-study",
    name: "Case Study",
    nameAr: "دراسة حالة",
    description: "عرض تفصيلي لمشروع أو دراسة حالة",
    icon: FileText,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("splitcontent"),
      createDefaultBlock("counter"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "event",
    name: "Event Page",
    nameAr: "صفحة فعالية",
    description: "صفحة لحدث أو مؤتمر أو ورشة عمل",
    icon: Gift,
    blocks: [
      createDefaultBlock("herovideo"),
      createDefaultBlock("timeline"),
      createDefaultBlock("team"),
      createDefaultBlock("pricing"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "saas-landing",
    name: "SaaS Landing",
    nameAr: "صفحة SaaS",
    description: "صفحة هبوط لمنتج برمجي",
    icon: Layout,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("logos"),
      createDefaultBlock("features"),
      createDefaultBlock("comparison"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("pricing"),
      createDefaultBlock("faq"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "webinar",
    name: "Webinar",
    nameAr: "ويبينار",
    description: "صفحة تسجيل في ويبينار أو ورشة",
    icon: MessageSquare,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("featurelist"),
      createDefaultBlock("team"),
      createDefaultBlock("newsletter"),
    ],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    nameAr: "إطلاق منتج",
    description: "صفحة إطلاق منتج جديد",
    icon: Gift,
    blocks: [
      createDefaultBlock("herovideo"),
      createDefaultBlock("features"),
      createDefaultBlock("gallery"),
      createDefaultBlock("pricing"),
      createDefaultBlock("newsletter"),
    ],
  },
  {
    id: "restaurant",
    name: "Restaurant",
    nameAr: "مطعم",
    description: "صفحة لمطعم أو كافيه",
    icon: Briefcase,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("gallery"),
      createDefaultBlock("cards"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "real-estate",
    name: "Real Estate",
    nameAr: "عقارات",
    description: "صفحة لعرض عقار أو مشروع سكني",
    icon: Layout,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("features"),
      createDefaultBlock("gallery"),
      createDefaultBlock("counter"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "medical",
    name: "Medical Clinic",
    nameAr: "عيادة طبية",
    description: "صفحة لعيادة أو مركز طبي",
    icon: Users,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("services"),
      createDefaultBlock("team"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "education",
    name: "Education",
    nameAr: "تعليم",
    description: "صفحة لمؤسسة تعليمية أو دورة",
    icon: FileText,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("featurelist"),
      createDefaultBlock("steps"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("pricing"),
      createDefaultBlock("faq"),
    ],
  },
  {
    id: "fitness",
    name: "Fitness",
    nameAr: "لياقة بدنية",
    description: "صفحة لنادي رياضي أو مدرب",
    icon: Users,
    blocks: [
      createDefaultBlock("herovideo"),
      createDefaultBlock("services"),
      createDefaultBlock("team"),
      createDefaultBlock("pricing"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "photography",
    name: "Photography",
    nameAr: "تصوير",
    description: "صفحة لمصور أو استوديو تصوير",
    icon: FileText,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("gallery"),
      createDefaultBlock("services"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("contact"),
    ],
  },
  {
    id: "consulting",
    name: "Consulting",
    nameAr: "استشارات",
    description: "صفحة لشركة استشارات",
    icon: Briefcase,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("features"),
      createDefaultBlock("counter"),
      createDefaultBlock("team"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "comparison-page",
    name: "Comparison",
    nameAr: "مقارنة",
    description: "صفحة مقارنة بين خدمات أو منتجات",
    icon: FileText,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("comparison"),
      createDefaultBlock("features"),
      createDefaultBlock("cta"),
    ],
  },
  {
    id: "thank-you",
    name: "Thank You",
    nameAr: "شكراً لك",
    description: "صفحة شكر بعد إتمام عملية",
    icon: Gift,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("social"),
      createDefaultBlock("newsletter"),
    ],
  },
  {
    id: "maintenance",
    name: "Maintenance",
    nameAr: "صيانة",
    description: "صفحة صيانة الموقع",
    icon: Layout,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("social"),
    ],
  },
  {
    id: "app-download",
    name: "App Download",
    nameAr: "تحميل التطبيق",
    description: "صفحة تحميل تطبيق موبايل",
    icon: Layout,
    blocks: [
      createDefaultBlock("hero"),
      createDefaultBlock("features"),
      createDefaultBlock("gallery"),
      createDefaultBlock("testimonials"),
      createDefaultBlock("cta"),
    ],
  },
];

export default function AdminPageTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");

  const createPageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("لم يتم اختيار قالب");

      const { data, error } = await supabase
        .from("cms_pages")
        .insert({
          title: pageTitle || selectedTemplate.name,
          title_ar: pageTitle || selectedTemplate.nameAr,
          slug: pageSlug || selectedTemplate.id + "-" + Date.now(),
          page_blocks: selectedTemplate.blocks as any,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-pages"] });
      toast({ title: "تم إنشاء الصفحة بنجاح ✅" });
      navigate(`/admin/cms/page/${data.id}`);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectTemplate = (template: PageTemplate) => {
    setSelectedTemplate(template);
    setPageTitle(template.nameAr);
    setPageSlug(template.id);
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="قوالب الصفحات"
      subtitle="اختر قالباً جاهزاً لإنشاء صفحة جديدة بسرعة"
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pageTemplates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
            onClick={() => handleSelectTemplate(template)}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <template.icon className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg">{template.nameAr}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {template.blocks.length} بلوك
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty Template */}
        <Card
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all border-dashed"
          onClick={() => navigate("/admin/cms")}
        >
          <CardHeader className="items-center justify-center h-full">
            <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg text-center">صفحة فارغة</CardTitle>
            <CardDescription className="text-center">ابدأ من الصفر</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Create Page Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء صفحة من قالب: {selectedTemplate?.nameAr}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>عنوان الصفحة</Label>
              <Input
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="مثال: عروض رمضان"
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط (slug)</Label>
              <Input
                value={pageSlug}
                onChange={(e) => setPageSlug(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                placeholder="مثال: ramadan-offers"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => createPageMutation.mutate()}
              disabled={createPageMutation.isPending}
            >
              {createPageMutation.isPending ? "جاري الإنشاء..." : "إنشاء الصفحة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
