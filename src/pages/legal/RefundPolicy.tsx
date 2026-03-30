import { SEO } from "@/components/seo/SEO";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle, HelpCircle } from "lucide-react";

export default function RefundPolicy() {
  const { data: settings } = usePlatformSettings();
  const siteName = settings?.siteName || "Sity Experts";
  const supportEmail = settings?.supportEmail || "support@sityexperts.com";

  return (
    <>
      <SEO title={`سياسة الاسترداد | ${siteName}`} description={`سياسة الاسترداد والإرجاع لمنصة ${siteName}`} />
      <DynamicNavbar />
      <main className="min-h-screen bg-background" dir="rtl">
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <RotateCcw className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">سياسة الاسترداد والإرجاع</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              آخر تحديث: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="space-y-10">

            <Section icon={CheckCircle2} title="1. حالات الاسترداد الكامل">
              <p>يحق لك استرداد كامل الكريديتات في الحالات التالية:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-muted-foreground">
                <li>إلغاء الطلب <strong>قبل</strong> تعيين فريلانسر وبدء العمل.</li>
                <li>عدم تسليم العمل خلال الموعد المحدد دون إبداء أسباب مقبولة.</li>
                <li>العمل المُسلّم لا يتطابق تماماً مع وصف الطلب وتمت الموافقة على النزاع.</li>
                <li>خلل تقني في المنصة تسبب في خصم كريديتات بدون إنشاء طلب.</li>
              </ul>
            </Section>

            <Section icon={Clock} title="2. حالات الاسترداد الجزئي">
              <p>يتم استرداد جزء من الكريديتات في الحالات التالية:</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-right font-semibold text-foreground border-b">مرحلة الإلغاء</th>
                      <th className="p-3 text-right font-semibold text-foreground border-b">نسبة الاسترداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-3 border-b text-muted-foreground">قبل بدء العمل</td><td className="p-3 border-b text-success font-semibold">100%</td></tr>
                    <tr><td className="p-3 border-b text-muted-foreground">بعد البدء وقبل 25% إنجاز</td><td className="p-3 border-b text-warning font-semibold">75%</td></tr>
                    <tr><td className="p-3 border-b text-muted-foreground">بعد 25% وقبل 50% إنجاز</td><td className="p-3 border-b text-warning font-semibold">50%</td></tr>
                    <tr><td className="p-3 border-b text-muted-foreground">بعد 50% وقبل 75% إنجاز</td><td className="p-3 border-b text-destructive font-semibold">25%</td></tr>
                    <tr><td className="p-3 text-muted-foreground">بعد 75% أو التسليم</td><td className="p-3 text-destructive font-semibold">0% (نزاع فقط)</td></tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section icon={XCircle} title="3. حالات عدم الاسترداد">
              <p>لا يمكن الاسترداد في الحالات التالية:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-muted-foreground">
                <li>بعد اعتماد العميل للتسليم النهائي.</li>
                <li>مرور 14 يوماً على التسليم بدون فتح نزاع.</li>
                <li>الطلبات المُلغاة بسبب مخالفة العميل لشروط الاستخدام.</li>
                <li>كريديتات الاشتراك الشهري المنتهية الصلاحية.</li>
                <li>رسوم الاشتراك الشهري (يمكن إلغاء التجديد التلقائي فقط).</li>
                <li>طلبات التعديل التي تتجاوز نطاق الطلب الأصلي.</li>
              </ul>
            </Section>

            <Section icon={RotateCcw} title="4. إجراءات طلب الاسترداد">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>افتح <strong>نزاع</strong> من صفحة تفاصيل الطلب في لوحة التحكم.</li>
                <li>اشرح السبب بالتفصيل مع إرفاق أي مستندات داعمة.</li>
                <li>تقوم إدارة المنصة بمراجعة النزاع خلال <strong>5 أيام عمل</strong>.</li>
                <li>في حال الموافقة، يُعاد الكريديت إلى رصيدك خلال <strong>24 ساعة</strong>.</li>
                <li>في حال طلب استرداد نقدي (بدلاً من كريديت)، يتم التحويل خلال <strong>7-14 يوم عمل</strong>.</li>
              </ol>
            </Section>

            <Section icon={AlertTriangle} title="5. سياسة الاسترداد النقدي">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>الاسترداد النقدي متاح فقط لمشتريات الكريديت (وليس كريديتات الاشتراك).</li>
                <li>يجب طلب الاسترداد النقدي خلال 30 يوماً من تاريخ الشراء.</li>
                <li>يتم خصم رسوم بوابة الدفع (2-3%) من مبلغ الاسترداد.</li>
                <li>يتم الاسترداد بنفس طريقة الدفع الأصلية.</li>
                <li>لا يمكن الاسترداد النقدي إذا تم استخدام أي كريديتات من الحزمة المُشتراة.</li>
              </ul>
            </Section>

            <Section icon={HelpCircle} title="6. أسئلة شائعة عن الاسترداد">
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-foreground">هل يمكنني استرداد رسوم الاشتراك الشهري؟</p>
                  <p className="text-muted-foreground mt-1">لا، رسوم الاشتراك غير قابلة للاسترداد. لكن يمكنك إلغاء التجديد التلقائي في أي وقت والاستفادة من الاشتراك حتى نهاية الدورة.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">ماذا لو كان العمل سيئ الجودة؟</p>
                  <p className="text-muted-foreground mt-1">نراجع كل عمل قبل تسليمه (QC). إذا مرّ عمل بجودة أقل من المطلوب، افتح نزاعاً وسنراجعه فوراً.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">كم تستغرق عملية الاسترداد؟</p>
                  <p className="text-muted-foreground mt-1">استرداد الكريديت: فوري بعد الموافقة. الاسترداد النقدي: 7-14 يوم عمل.</p>
                </div>
              </div>
            </Section>

            <div className="p-6 rounded-2xl bg-muted/50 border text-center">
              <p className="text-muted-foreground mb-2">لطلب استرداد أو لأي استفسار:</p>
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
