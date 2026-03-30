import { SEO } from "@/components/seo/SEO";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { FileText, Shield, AlertTriangle, Scale, Clock, Ban, CreditCard, Globe, Gavel } from "lucide-react";

export default function TermsOfService() {
  const { data: settings } = usePlatformSettings();
  const siteName = settings?.siteName || "Sity Experts";
  const supportEmail = settings?.supportEmail || "support@sityexperts.com";

  return (
    <>
      <SEO title={`شروط الاستخدام | ${siteName}`} description={`شروط وأحكام استخدام منصة ${siteName} للخدمات المُدارة`} />
      <DynamicNavbar />
      <main className="min-h-screen bg-background" dir="rtl">
        {/* Hero */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">شروط الاستخدام والأحكام</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              آخر تحديث: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="space-y-10">

            {/* 1 - مقدمة */}
            <Section icon={Globe} title="1. مقدمة وتعريفات">
              <p>
                مرحباً بكم في منصة <strong>{siteName}</strong> ("المنصة"، "نحن"، "لنا"). باستخدامك لهذه المنصة فإنك توافق على الالتزام بهذه الشروط والأحكام ("الشروط"). إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام المنصة.
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-muted-foreground">
                <li><strong>"العميل"</strong>: أي شخص أو جهة تطلب خدمة عبر المنصة.</li>
                <li><strong>"الفريلانسر"</strong>: مقدم الخدمة المسجل والمعتمد من المنصة.</li>
                <li><strong>"الطلب"</strong>: أي مهمة أو مشروع يتم إنشاؤه عبر المنصة.</li>
                <li><strong>"الكريديت"</strong>: وحدة الرصيد المستخدمة لطلب الخدمات.</li>
                <li><strong>"المحفظة"</strong>: الرصيد المالي للفريلانسر بالجنيه المصري.</li>
                <li><strong>"المنصة"</strong>: موقع وتطبيق {siteName} وجميع خدماته.</li>
              </ul>
            </Section>

            {/* 2 - الأهلية */}
            <Section icon={Shield} title="2. الأهلية والتسجيل">
              <p>لاستخدام المنصة يجب أن:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-muted-foreground">
                <li>يكون عمرك 18 سنة على الأقل أو لديك موافقة ولي الأمر.</li>
                <li>تقدم معلومات صحيحة ودقيقة عند التسجيل.</li>
                <li>تحافظ على سرية بيانات حسابك وكلمة المرور.</li>
                <li>تُخطرنا فوراً في حال أي استخدام غير مصرح لحسابك.</li>
                <li>تلتزم بإتمام التحقق من الهوية عند الطلب وفقاً لمتطلبات البنك المركزي المصري.</li>
              </ul>
              <p className="mt-4">
                يحق للمنصة رفض أو تعليق أو إنهاء أي حساب دون إبداء أسباب إذا ثبت مخالفة هذه الشروط.
              </p>
            </Section>

            {/* 3 - الخدمات */}
            <Section icon={Scale} title="3. طبيعة الخدمات">
              <p>
                {siteName} هي منصة خدمات مُدارة (Managed Services). نحن لسنا سوقاً حراً — نتحكم في جودة العمل ونُشرف على كل مرحلة:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-muted-foreground">
                <li>نستلم الطلب من العميل ونُحلله.</li>
                <li>نُعيّن الفريلانسر المناسب بناءً على التخصص والتقييم.</li>
                <li>نراجع العمل المُسلّم (مراجعة جودة QC) قبل تسليمه للعميل.</li>
                <li>نتعامل مع طلبات التعديل والنزاعات.</li>
                <li>لا يوجد تواصل مباشر بين العميل والفريلانسر — كل التواصل عبر المنصة.</li>
              </ul>
            </Section>

            {/* 4 - نظام الكريديت */}
            <Section icon={CreditCard} title="4. نظام الكريديت والدفع">
              <h4 className="font-semibold text-foreground mt-2 mb-2">4.1 للعملاء:</h4>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>يتم شراء الكريديتات مسبقاً أو عبر الاشتراك الشهري.</li>
                <li>كل طلب يخصم عدد كريديتات حسب حجم المهمة (Micro: 1, Small: 3, Medium: 5, Large: 10).</li>
                <li>الكريديتات المشتراة غير قابلة للاسترداد نقداً بعد الشراء.</li>
                <li>كريديتات الاشتراك الشهري تنتهي بنهاية دورة الاشتراك ولا تُرحّل.</li>
                <li>يتم تطبيق ضريبة القيمة المضافة (14%) على جميع المشتريات وفقاً للقانون المصري.</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6 mb-2">4.2 للفريلانسرز:</h4>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>يتم تحديد أسعار المهام بالجنيه المصري من قِبل إدارة المنصة.</li>
                <li>تُضاف الأرباح للمحفظة بعد اعتماد التسليم من فريق الجودة.</li>
                <li>الحد الأدنى للسحب: <strong>5,100 ج.م (ما يعادل 100 دولار أمريكي)</strong> وفقاً لتعليمات البنك المركزي المصري.</li>
                <li>يتم معالجة طلبات السحب خلال 24-48 ساعة عمل.</li>
                <li>الفريلانسر مسؤول عن الالتزامات الضريبية الخاصة به.</li>
              </ul>
            </Section>

            {/* 5 - الملكية الفكرية */}
            <Section icon={Gavel} title="5. حقوق الملكية الفكرية">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>جميع الأعمال المُسلّمة تنتقل ملكيتها الفكرية بالكامل للعميل بعد اعتماد التسليم والدفع.</li>
                <li>يُقر الفريلانسر بأن العمل المُقدّم أصلي وغير منسوخ ولا ينتهك حقوق أي طرف ثالث.</li>
                <li>لا يحق للفريلانسر استخدام الأعمال المُسلّمة في معرض أعماله دون إذن كتابي من العميل.</li>
                <li>يحتفظ {siteName} بحق استخدام نماذج مُعمّمة (anonymized) في المواد التسويقية.</li>
                <li>شعار وعلامة {siteName} التجارية مملوكة حصرياً للمنصة ولا يجوز استخدامها دون إذن.</li>
              </ul>
            </Section>

            {/* 6 - سياسة التعديلات والإلغاء */}
            <Section icon={Clock} title="6. سياسة التعديلات والإلغاء">
              <h4 className="font-semibold text-foreground mt-2 mb-2">6.1 التعديلات:</h4>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>لكل باقة عدد محدد من التعديلات المجانية.</li>
                <li>التعديلات الإضافية تخضع لرسوم إضافية.</li>
                <li>يجب طلب التعديل خلال 7 أيام من تاريخ التسليم.</li>
                <li>التعديلات يجب أن تكون ضمن نطاق الطلب الأصلي — التغييرات الجوهرية تُعد طلباً جديداً.</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6 mb-2">6.2 الإلغاء:</h4>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>يمكن إلغاء الطلب قبل بدء العمل واسترداد الكريديتات بالكامل.</li>
                <li>بعد بدء العمل، يتم استرداد نسبة حسب مرحلة التنفيذ.</li>
                <li>بعد التسليم لا يمكن الإلغاء — يمكن فتح نزاع.</li>
                <li>الاشتراكات الشهرية يمكن إلغاؤها في أي وقت ولكنها سارية حتى نهاية الدورة.</li>
              </ul>
            </Section>

            {/* 7 - السلوك المحظور */}
            <Section icon={Ban} title="7. السلوك المحظور">
              <p>يُحظر على المستخدمين:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-muted-foreground">
                <li>تقديم معلومات كاذبة أو مضللة.</li>
                <li>محاولة التواصل مع الطرف الآخر خارج المنصة للتحايل على الرسوم.</li>
                <li>رفع محتوى يخالف القانون أو يحتوي على مواد محمية بحقوق الطبع.</li>
                <li>استخدام المنصة لأغراض غير مشروعة أو احتيالية.</li>
                <li>محاولة اختراق أو إضعاف أنظمة المنصة الأمنية.</li>
                <li>إنشاء حسابات متعددة لنفس الشخص دون إذن.</li>
                <li>إساءة استخدام نظام النزاعات أو التقييمات.</li>
                <li>مشاركة بيانات حسابك مع أطراف ثالثة.</li>
              </ul>
            </Section>

            {/* 8 - النزاعات */}
            <Section icon={Scale} title="8. سياسة النزاعات">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>يمكن لأي طرف فتح نزاع خلال 14 يوماً من التسليم.</li>
                <li>تقوم إدارة المنصة بمراجعة النزاع والفصل فيه خلال 5 أيام عمل.</li>
                <li>قرار إدارة المنصة نهائي وملزم لجميع الأطراف.</li>
                <li>في حال ثبوت خطأ الفريلانسر، يُعاد الكريديت للعميل.</li>
                <li>في حال ثبوت سوء استخدام من العميل، يتم تعليق حسابه.</li>
                <li>النزاعات المتكررة قد تؤدي لحظر الحساب نهائياً.</li>
              </ul>
            </Section>

            {/* 9 - إخلاء المسؤولية */}
            <Section icon={AlertTriangle} title="9. إخلاء المسؤولية وتحديد المسؤولية">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>المنصة تُقدَّم "كما هي" دون ضمانات صريحة أو ضمنية.</li>
                <li>لا نضمن توفر المنصة بشكل مستمر أو خالٍ من الأخطاء.</li>
                <li>لا نتحمل مسؤولية أي أضرار غير مباشرة أو تبعية ناتجة عن استخدام المنصة.</li>
                <li>مسؤوليتنا القصوى لا تتجاوز قيمة المبالغ المدفوعة خلال آخر 12 شهراً.</li>
                <li>نبذل قصارى جهدنا لضمان جودة الخدمات لكننا لا نضمن نتائج محددة.</li>
                <li>نحتفظ بالحق في تعديل أو إيقاف أي خدمة في أي وقت مع إشعار مسبق معقول.</li>
              </ul>
            </Section>

            {/* 10 - القانون الحاكم */}
            <Section icon={Gavel} title="10. القانون الحاكم والاختصاص القضائي">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>تخضع هذه الشروط لقوانين جمهورية مصر العربية وتُفسَّر وفقاً لها.</li>
                <li>أي نزاع قانوني يخضع للاختصاص الحصري لمحاكم القاهرة، جمهورية مصر العربية.</li>
                <li>تلتزم المنصة بقوانين حماية المستهلك المصرية وقانون التجارة الإلكترونية.</li>
                <li>تلتزم المنصة بتعليمات البنك المركزي المصري المتعلقة بالمعاملات المالية الإلكترونية.</li>
              </ul>
            </Section>

            {/* 11 - تعديل الشروط */}
            <Section icon={FileText} title="11. تعديل الشروط">
              <p>
                نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بالتعديلات الجوهرية عبر البريد الإلكتروني أو إشعار داخل المنصة قبل 30 يوماً على الأقل من سريانها. استمرارك في استخدام المنصة بعد سريان التعديلات يُعد قبولاً لها.
              </p>
            </Section>

            {/* التواصل */}
            <div className="p-6 rounded-2xl bg-muted/50 border text-center">
              <p className="text-muted-foreground mb-2">لأي استفسارات حول هذه الشروط، تواصل معنا:</p>
              <a href={`mailto:${supportEmail}`} className="text-primary font-semibold hover:underline">{supportEmail}</a>
            </div>
          </div>
        </div>
      </main>
      <DynamicFooter />
    </>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="pr-[52px] text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
