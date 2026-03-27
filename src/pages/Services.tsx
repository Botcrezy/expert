import { Link } from "react-router-dom";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Palette,
  Code,
  PenTool,
  Megaphone,
  Languages,
  Video,
  Music,
  Camera,
  FileText,
  Presentation,
  Search,
  CheckCircle2,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";

const services = [
  {
    icon: Palette,
    name: "تصميم جرافيك",
    description: "شعارات احترافية، هوية بصرية كاملة، تصاميم سوشيال ميديا، كروت عمل، بروشورات، وجميع المطبوعات",
    features: ["تصميم شعارات", "هوية بصرية", "سوشيال ميديا", "مطبوعات"],
    price: "من 50 ج.م"
  },
  {
    icon: Code,
    name: "تطوير المواقع",
    description: "مواقع إلكترونية متجاوبة، متاجر إلكترونية، تطبيقات ويب، لاندينج بيجز، وتعديلات على المواقع الحالية",
    features: ["مواقع شركات", "متاجر إلكترونية", "لاندينج بيج", "تعديلات برمجية"],
    price: "من 500 ج.م"
  },
  {
    icon: PenTool,
    name: "كتابة المحتوى",
    description: "مقالات احترافية، محتوى تسويقي، سكريبتات فيديو، وصف منتجات، وكتابة إبداعية",
    features: ["مقالات", "محتوى تسويقي", "سكريبتات", "وصف منتجات"],
    price: "من 30 ج.م"
  },
  {
    icon: Megaphone,
    name: "التسويق الرقمي",
    description: "إدارة حملات إعلانية، تحسين محركات البحث SEO، إدارة حسابات السوشيال ميديا",
    features: ["إعلانات فيسبوك", "إعلانات جوجل", "SEO", "إدارة حسابات"],
    price: "من 200 ج.م"
  },
  {
    icon: Languages,
    name: "الترجمة",
    description: "ترجمة احترافية من وإلى العربية، الإنجليزية، الفرنسية، والمزيد من اللغات",
    features: ["ترجمة مستندات", "ترجمة مواقع", "ترجمة فيديوهات", "تدقيق لغوي"],
    price: "من 20 ج.م"
  },
  {
    icon: Video,
    name: "المونتاج والموشن",
    description: "مونتاج فيديوهات احترافي، موشن جرافيك، انترو وأوترو، تعديلات الفيديو",
    features: ["مونتاج فيديو", "موشن جرافيك", "انترو/أوترو", "إعلانات فيديو"],
    price: "من 100 ج.م"
  },
  {
    icon: Music,
    name: "الصوتيات",
    description: "تسجيل صوتي، تعليق صوتي، هندسة صوتية، بودكاست، ومؤثرات صوتية",
    features: ["تعليق صوتي", "هندسة صوت", "بودكاست", "مؤثرات صوتية"],
    price: "من 50 ج.م"
  },
  {
    icon: Camera,
    name: "التصوير",
    description: "تصوير منتجات، تصوير فوتوغرافي، تعديل صور، ريتاتش احترافي",
    features: ["تصوير منتجات", "ريتاتش", "تعديل صور", "إزالة خلفيات"],
    price: "من 30 ج.م"
  },
  {
    icon: FileText,
    name: "إدخال البيانات",
    description: "إدخال بيانات، تفريغ صوتي، تحويل PDF، وتنسيق ملفات",
    features: ["إدخال بيانات", "تفريغ صوتي", "تحويل ملفات", "تنسيق"],
    price: "من 20 ج.م"
  },
  {
    icon: Presentation,
    name: "العروض التقديمية",
    description: "تصميم عروض PowerPoint و Keynote احترافية، انفوجرافيك، وتقارير",
    features: ["PowerPoint", "Keynote", "انفوجرافيك", "تقارير"],
    price: "من 50 ج.م"
  },
  {
    icon: Search,
    name: "البحث والتحليل",
    description: "بحث سوق، تحليل منافسين، دراسات جدوى، وتحليل بيانات",
    features: ["بحث سوق", "تحليل منافسين", "دراسة جدوى", "تحليل بيانات"],
    price: "من 100 ج.م"
  }
];

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="الخدمات - Sity Experts"
        description="نقدم مجموعة شاملة من الخدمات الرقمية بجودة احترافية ومراجعة دقيقة"
        path="/services"
      />

      <DynamicNavbar />

      {/* Hero */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">خدماتنا</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            نقدم مجموعة شاملة من الخدمات الرقمية بجودة احترافية ومراجعة دقيقة
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div 
                key={service.name}
                className="group p-6 rounded-3xl bg-card border hover:border-primary/50 hover:shadow-xl transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <service.icon className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3">{service.name}</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{service.description}</p>
                
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-primary font-semibold">{service.price}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/register">
                      اطلب الآن
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">جاهز تبدأ مشروعك؟</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            سجل الآن واحصل على أول مهمة مجانية
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/register">
              ابدأ مجاناً
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}