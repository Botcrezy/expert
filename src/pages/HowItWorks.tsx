import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { HeroSection } from "@/components/ui/HeroSection";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { TimelineSection } from "@/components/ui/TimelineSection";
import { CTASection } from "@/components/ui/CTASection";
import { useCMSSections, getCMSContent, getCMSTitle } from "@/hooks/useCMSSections";
import { Send, UserCheck, Cog, CheckCircle } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

const steps = [
  {
    number: "1",
    icon: Send,
    title: "أرسل طلبك",
    description: "اشرح ما تحتاجه بالتفصيل. ارفع أي ملفات أو مراجع تساعدنا نفهم رؤيتك. كل ما وضحت أكتر، كل ما النتيجة تكون أفضل.",
    tags: ["وصف واضح", "ملفات مراجع", "موعد نهائي"]
  },
  {
    number: "2",
    icon: UserCheck,
    title: "نختار الخبير المناسب",
    description: "فريقنا يراجع طلبك ويختار أفضل خبير متخصص في مجالك. كل خبير عندنا مختار بعناية ومجرب.",
    tags: ["خبراء معتمدين", "تخصصات متنوعة", "اختيار دقيق"]
  },
  {
    number: "3",
    icon: Cog,
    title: "التنفيذ والمتابعة",
    description: "الخبير يبدأ العمل على مهمتك. تقدر تتابع التقدم وتتواصل مع الفريق في أي وقت.",
    tags: ["تحديثات مستمرة", "تواصل مباشر", "شفافية كاملة"]
  },
  {
    number: "4",
    icon: CheckCircle,
    title: "مراجعة الجودة",
    description: "قبل ما تستلم، فريق الجودة عندنا يراجع الشغل ويتأكد إنه مطابق للمعايير.",
    tags: ["مراجعة دقيقة", "معايير صارمة", "ضمان الجودة"]
  }
];

const features = [
  {
    emoji: "🛡️",
    title: "أمان تام",
    description: "بياناتك وملفاتك محمية بأعلى معايير الأمان"
  },
  {
    emoji: "⏰",
    title: "التزام بالمواعيد",
    description: "نضمن التسليم في الوقت المحدد أو قبله"
  },
  {
    emoji: "🎧",
    title: "دعم متواصل",
    description: "فريق الدعم جاهز لمساعدتك في أي وقت"
  },
  {
    emoji: "🔄",
    title: "تعديلات مجانية",
    description: "تعديلات مجانية حسب باقتك حتى ترضى تماماً"
  }
];

export default function HowItWorks() {
  const { data: cmsSections } = useCMSSections();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={getCMSTitle(cmsSections, "how_it_works_meta_title") || "كيف نعمل - Sity Experts"}
        description={
          getCMSContent(cmsSections, "how_it_works_meta_desc") ||
          "عملية بسيطة وشفافة من إرسال الطلب حتى استلام العمل النهائي"
        }
        path="/how-it-works"
      />

      <DynamicNavbar />

      {/* Hero */}
      <HeroSection
        badge="🧩 العملية"
        title={getCMSTitle(cmsSections, "how_it_works_title") || "كيف نعمل؟"}
        subtitle={getCMSContent(cmsSections, "how_it_works_subtitle") || "عملية بسيطة وشفافة من إرسال الطلب حتى استلام العمل النهائي"}
        variant="centered"
        size="compact"
      />

      {/* Steps Timeline */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="📋 الخطوات"
            title="خطوات العمل"
            subtitle="4 خطوات بسيطة للحصول على ما تريد"
          />
          <TimelineSection items={steps} variant="cards" />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="✨ مميزاتنا"
            title="ليه تختارنا؟"
          />
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                emoji={feature.emoji}
                title={feature.title}
                description={feature.description}
                variant="default"
                size="default"
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={getCMSTitle(cmsSections, "how_it_works_cta_title") || "جاهز تجرب؟"}
        subtitle={getCMSContent(cmsSections, "how_it_works_cta_subtitle") || "سجل الآن واحصل على أول مهمة مجانية. جرب الخدمة بدون أي التزام."}
        buttons={[
          { text: "ابدأ مجاناً", href: "/register", variant: "secondary" }
        ]}
        variant="primary"
      />

      <DynamicFooter />
    </div>
  );
}
