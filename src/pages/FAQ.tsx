import { Link } from "react-router-dom";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, Mail } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/seo/SEO";

const faqCategories = [
  {
    name: "عام",
    faqs: [
      {
        q: "ما هي Sity Experts؟",
        a: "Sity Experts هي منصة خدمات مُدارة. بتطلب الخدمة اللي محتاجها وإحنا نختار لك أفضل خبير، ننفذ، ونراجع الجودة قبل التسليم."
      },
      {
        q: "إزاي أبدأ استخدم المنصة؟",
        a: "سجل حساب مجاني، اختر الخدمة المطلوبة، اشرح تفاصيل مشروعك، وإحنا هنتكفل بالباقي. هتستلم شغلك جاهز في الموعد المحدد."
      },
      {
        q: "هل المنصة مجانية؟",
        a: "التسجيل مجاني وأول مهمة صغيرة مجانية. بعد كده تقدر تختار الباقة المناسبة لاحتياجاتك."
      },
      {
        q: "ما الفرق بينكم وبين منصات الفريلانسرز التانية؟",
        a: "عندنا إحنا اللي بنختار الخبير المناسب لمشروعك ونراجع الجودة قبل التسليم. مش محتاج تبحث أو تفاوض، كل حاجة مُدارة ومضمونة."
      }
    ]
  },
  {
    name: "الأسعار والباقات",
    faqs: [
      {
        q: "ما هو نظام الكريديت؟",
        a: "الكريديت هو وحدة قياس حجم المهمة. مهمة صغيرة = 1 كريديت، متوسطة = 3 كريديت، كبيرة = 5 كريديت. كل باقة بتديك عدد معين من الكريديت شهرياً."
      },
      {
        q: "هل الكريديت يتراكم للشهر التالي؟",
        a: "لا، الكريديت الغير مستخدم لا ينتقل للشهر التالي. ننصحك باختيار الباقة المناسبة لاحتياجاتك."
      },
      {
        q: "هل يمكن ترقية أو تخفيض الباقة؟",
        a: "نعم، تقدر تغير باقتك في أي وقت. لو رقيت هتبدأ الباقة الجديدة فوراً، لو خفضت هتبدأ من بداية الشهر الجديد."
      },
      {
        q: "ما هي طرق الدفع المتاحة؟",
        a: "نقبل الدفع بالفيزا، ماستركارد، وفودافون كاش. كمان ممكن الدفع بالتحويل البنكي للمؤسسات."
      }
    ]
  },
  {
    name: "الخدمات والتسليم",
    faqs: [
      {
        q: "كم الوقت المطلوب لتنفيذ مهمة؟",
        a: "يعتمد على حجم المهمة وباقتك. المهام الصغيرة عادة 24-48 ساعة، المتوسطة 2-3 أيام، الكبيرة 5-7 أيام."
      },
      {
        q: "ماذا لو لم أكن راضياً عن النتيجة؟",
        a: "عندك تعديلات مجانية حسب باقتك. لو مش راضي بعد التعديلات، فريق الدعم هيساعدك تلاقي حل مناسب."
      },
      {
        q: "هل يمكنني طلب تعديلات؟",
        a: "نعم، كل باقة بتتضمن عدد معين من التعديلات المجانية. الباقة المجانية تعديل واحد، الاحترافية 3 تعديلات، المؤسسية تعديلات غير محدودة."
      },
      {
        q: "كيف أتواصل مع الفريق؟",
        a: "تقدر تتواصل من خلال الدردشة المباشرة في صفحة المشروع، أو عبر البريد الإلكتروني، أو من خلال صفحة الدعم."
      }
    ]
  },
  {
    name: "الأمان والخصوصية",
    faqs: [
      {
        q: "هل ملفاتي آمنة؟",
        a: "نعم، كل الملفات مشفرة ومحمية. فقط الفريق المعني بمشروعك يقدر يشوفها."
      },
      {
        q: "من يملك حقوق العمل النهائي؟",
        a: "انت تملك كل الحقوق. بعد التسليم واكتمال المشروع، كل الملفات والتصاميم ملكك الكامل."
      },
      {
        q: "هل تشاركون بياناتي مع أي طرف؟",
        a: "لا نشارك بياناتك الشخصية مع أي طرف ثالث. بياناتك محمية ومستخدمة فقط لتقديم الخدمة."
      }
    ]
  }
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredCategories = faqCategories.map(cat => ({
    ...cat,
    faqs: cat.faqs.filter(faq => 
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.faqs.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="الأسئلة الشائعة - Sity Experts"
        description="لاقي إجابات على أسئلتك الأكثر شيوعاً"
        path="/faq"
        schemaType="FAQPage"
        schema={{
          mainEntity: filteredCategories.flatMap((cat) =>
            cat.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            }))
          ),
        }}
      />

      <DynamicNavbar />

      {/* Hero */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">الأسئلة الشائعة</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            لاقي إجابات على أسئلتك الأكثر شيوعاً
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="ابحث عن سؤال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-12 h-12"
            />
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-12">
            {filteredCategories.map((category) => (
              <div key={category.name}>
                <h2 className="text-2xl font-bold text-foreground mb-6">{category.name}</h2>
                <div className="space-y-3">
                  {category.faqs.map((faq, index) => {
                    const id = `${category.name}-${index}`;
                    const isOpen = openItems.includes(id);
                    
                    return (
                      <div 
                        key={id}
                        className="rounded-2xl bg-card border overflow-hidden"
                      >
                        <button
                          onClick={() => toggleItem(id)}
                          className="w-full flex items-center justify-between p-5 text-right hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-foreground">{faq.q}</span>
                          <ChevronDown className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform shrink-0 mr-4",
                            isOpen && "rotate-180"
                          )} />
                        </button>
                        
                        {isOpen && (
                          <div className="px-5 pb-5 pt-0">
                            <p className="text-muted-foreground">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">لسه عندك سؤال؟</h2>
          <p className="text-muted-foreground mb-8">
            فريق الدعم جاهز لمساعدتك في أي وقت
          </p>
          <Button size="lg" asChild>
            <Link to="/client/support">
              <Mail className="w-5 h-5 ml-2" />
              تواصل معنا
            </Link>
          </Button>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}