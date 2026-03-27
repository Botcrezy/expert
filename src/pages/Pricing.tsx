import { Link } from "react-router-dom";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Star, Zap, Crown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Fetch plans from database
  const { data: plans = [] } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const defaultPlans = [
    {
      name: "مجاني",
      name_ar: "مجاني",
      icon: Star,
      price: 0,
      period: "للتجربة",
      features: [
        "مهمة واحدة مجانية",
        "مهام صغيرة فقط",
        "تعديل واحد",
        "دعم بريد إلكتروني",
        "وقت التسليم: 48 ساعة"
      ],
      cta: "ابدأ مجاناً",
      popular: false,
      is_free: true,
    },
    {
      name: "احترافي",
      name_ar: "احترافي",
      icon: Zap,
      price: 499,
      period: "شهرياً",
      features: [
        "20 كريديت شهرياً",
        "كل أنواع المهام",
        "3 تعديلات لكل مهمة",
        "دعم سريع عبر الدردشة",
        "أولوية في التنفيذ",
        "وقت التسليم: 24 ساعة"
      ],
      cta: "اشترك الآن",
      popular: true,
      is_free: false,
    },
    {
      name: "مؤسسي",
      name_ar: "مؤسسي",
      icon: Crown,
      price: 1499,
      period: "شهرياً",
      features: [
        "كريديت غير محدود",
        "مدير حساب مخصص",
        "تعديلات غير محدودة",
        "دعم 24/7",
        "SLA مضمون",
        "وقت التسليم: 12 ساعة",
        "تقارير شهرية"
      ],
      cta: "تواصل معنا",
      popular: false,
      is_free: false,
    }
  ];

  const displayPlans = plans.length > 0 ? plans.map((plan, index) => ({
    ...plan,
    icon: index === 0 ? Star : index === 1 ? Zap : Crown,
    period: "شهرياً",
    features: (plan.features as string[]) || [],
    cta: plan.is_free ? "ابدأ مجاناً" : plan.price > 1000 ? "تواصل معنا" : "اشترك الآن",
    popular: index === 1,
  })) : defaultPlans;

  const faqs = [
    { q: "ما هو الكريديت؟", a: "الكريديت هو وحدة قياس حجم المهمة. مهمة صغيرة = 1 كريديت، متوسطة = 3، كبيرة = 5." },
    { q: "هل يمكن ترقية الباقة؟", a: "نعم، يمكنك الترقية في أي وقت وسيتم احتساب الفرق." },
    { q: "هل الكريديت يتراكم؟", a: "لا، الكريديت الغير مستخدم لا ينتقل للشهر التالي." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="الأسعار والباقات - Sity Experts"
        description="اختار الباقة المناسبة لاحتياجاتك واستمتع بخدمات احترافية"
        path="/pricing"
      />

      <DynamicNavbar />

      {/* Hero */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">الأسعار والباقات</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            اختار الباقة المناسبة لاحتياجاتك واستمتع بخدمات احترافية
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-muted/50 p-1 rounded-full">
            <button
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingCycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              onClick={() => setBillingCycle("monthly")}
            >
              شهري
            </button>
            <button
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingCycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              onClick={() => setBillingCycle("yearly")}
            >
              سنوي (خصم 20%)
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {displayPlans.map((plan, index) => {
              const Icon = plan.icon;
              const displayPrice = billingCycle === "yearly" && !plan.is_free 
                ? Math.round(plan.price * 0.8) 
                : plan.price;
              
              return (
                <div 
                  key={plan.name}
                  className={cn(
                    "p-8 rounded-3xl bg-card border-2 relative animate-fade-in transition-all",
                    plan.popular && "border-primary ring-2 ring-primary/20 scale-105"
                  )}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      الأكثر شعبية
                    </div>
                  )}
                  
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name_ar}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-foreground">{displayPrice.toLocaleString()}</span>
                    <span className="text-muted-foreground">ج.م / {plan.period}</span>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature: string) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                    <Link to="/register">{plan.cta}</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">أسئلة عن الأسعار</h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="p-6 rounded-2xl bg-card border">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}