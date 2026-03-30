import { SEO } from "@/components/seo/SEO";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Shield, Eye, Database, Lock, Globe, UserCheck, Bell, Trash2, Scale } from "lucide-react";

export default function PrivacyPolicy() {
  const { data: settings } = usePlatformSettings();
  const siteName = settings?.siteName || "Sity Experts";
  const supportEmail = settings?.supportEmail || "support@sityexperts.com";

  return (
    <>
      <SEO title={`سياسة الخصوصية | ${siteName}`} description={`سياسة الخصوصية وحماية البيانات لمنصة ${siteName}`} path="/privacy" />
      <DynamicNavbar />
      <main className="min-h-screen bg-background" dir="rtl">
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">سياسة الخصوصية</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              آخر تحديث: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="space-y-10">

            <Section icon={Eye} title="1. ما البيانات التي نجمعها">
              <h4 className="font-semibold text-foreground mt-2 mb-2">1.1 بيانات تقدمها لنا مباشرة:</h4>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>الاسم الكامل والبريد الإلكتروني ورقم الهاتف عند التسجيل.</li>
                <li>بيانات الهوية الوطنية عند التحقق من الهوية (الرقم القومي، صور البطاقة، صورة شخصية).</li>
                <li>بيانات الدفع والسحب (تفاصيل الحساب البنكي، المحفظة الإلكترونية).</li>
                <li>الملفات والمرفقات المرفوعة مع الطلبات.</li>
                <li>محادثات الدعم الفني والرسائل داخل المنصة.</li>
                <li>السيرة الذاتية والمهارات ومعرض الأعمال (للفريلانسرز).</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6 mb-2">1.2 بيانات نجمعها تلقائياً:</h4>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>عنوان IP ونوع المتصفح ونظام التشغيل.</li>
                <li>الصفحات التي تزورها ومدة الزيارة.</li>
                <li>ملفات تعريف الارتباط (Cookies) لتحسين تجربة المستخدم.</li>
                <li>سجلات الأمان (تسجيل الدخول، تغيير كلمة المرور، المعاملات المالية).</li>
              </ul>
            </Section>

            <Section icon={Database} title="2. كيف نستخدم بياناتك">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>تقديم وتحسين خدمات المنصة.</li>
                <li>معالجة الطلبات والمعاملات المالية.</li>
                <li>التحقق من الهوية والامتثال لمتطلبات البنك المركزي المصري.</li>
                <li>إرسال إشعارات مهمة حول حسابك وطلباتك.</li>
                <li>تحليل الاستخدام لتحسين تجربة المنصة.</li>
                <li>منع الاحتيال والحفاظ على أمان المنصة.</li>
                <li>الامتثال للمتطلبات القانونية والتنظيمية.</li>
                <li>التواصل معك بشأن العروض والتحديثات (يمكنك إلغاء الاشتراك في أي وقت).</li>
              </ul>
            </Section>

            <Section icon={Lock} title="3. حماية البيانات وأمانها">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>نستخدم تشفير SSL/TLS لحماية جميع البيانات أثناء النقل.</li>
                <li>البيانات مُخزّنة على خوادم آمنة مع تشفير في حالة السكون (at-rest encryption).</li>
                <li>الوصول للبيانات محصور بالموظفين المُصرّح لهم فقط.</li>
                <li>نطبق سياسات Row-Level Security (RLS) على قاعدة البيانات.</li>
                <li>نُجري مراجعات أمنية دورية ونحتفظ بسجلات التدقيق (Audit Logs).</li>
                <li>بيانات الهوية الوطنية مشفرة بشكل منفصل ولا يمكن الوصول إليها إلا لأغراض التحقق.</li>
                <li>لا نُخزّن بيانات بطاقات الدفع — تتم المعاملات عبر بوابات دفع معتمدة ومؤمنة (مثل Kashier).</li>
              </ul>
            </Section>

            <Section icon={Globe} title="4. مشاركة البيانات مع أطراف ثالثة">
              <p>لا نبيع بياناتك الشخصية أبداً. نشارك البيانات فقط في الحالات التالية:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-muted-foreground">
                <li><strong>مزودي الخدمة:</strong> بوابات الدفع، خدمات الاستضافة (Supabase)، خدمات البريد الإلكتروني — بالقدر الضروري فقط.</li>
                <li><strong>المتطلبات القانونية:</strong> إذا طُلب منا ذلك بموجب أمر قضائي أو قانون سارٍ.</li>
                <li><strong>حماية الحقوق:</strong> لمنع الاحتيال أو حماية حقوق المنصة أو مستخدميها.</li>
                <li><strong>بموافقتك:</strong> أي مشاركة أخرى تتم فقط بموافقتك الصريحة.</li>
              </ul>
              <p className="mt-4">
                نلتزم بعدم نقل البيانات خارج جمهورية مصر العربية إلا مع ضمانات حماية كافية وفقاً لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020.
              </p>
            </Section>

            <Section icon={UserCheck} title="5. حقوقك كمستخدم">
              <p>بموجب قانون حماية البيانات الشخصية المصري، لديك الحقوق التالية:</p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-muted-foreground">
                <li><strong>حق الوصول:</strong> طلب نسخة من بياناتك الشخصية المُخزّنة لدينا.</li>
                <li><strong>حق التصحيح:</strong> تعديل أي بيانات غير صحيحة أو غير مكتملة.</li>
                <li><strong>حق الحذف:</strong> طلب حذف بياناتك (مع مراعاة الالتزامات القانونية).</li>
                <li><strong>حق الاعتراض:</strong> الاعتراض على معالجة بياناتك لأغراض التسويق.</li>
                <li><strong>حق نقل البيانات:</strong> الحصول على بياناتك بصيغة قابلة للقراءة آلياً.</li>
                <li><strong>سحب الموافقة:</strong> سحب موافقتك في أي وقت (دون التأثير على قانونية المعالجة السابقة).</li>
              </ul>
              <p className="mt-4">
                لممارسة أي من هذه الحقوق، تواصل معنا على <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>. سنرد خلال 15 يوم عمل.
              </p>
            </Section>

            <Section icon={Bell} title="6. ملفات تعريف الارتباط (Cookies)">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>ملفات ضرورية:</strong> لتشغيل المنصة والحفاظ على جلسة تسجيل الدخول.</li>
                <li><strong>ملفات تحليلية:</strong> لفهم كيفية استخدام المنصة وتحسينها.</li>
                <li><strong>ملفات وظيفية:</strong> لحفظ تفضيلاتك (مثل اللغة والسمة).</li>
              </ul>
              <p className="mt-4">
                يمكنك إدارة تفضيلات ملفات تعريف الارتباط من إعدادات متصفحك. تعطيل الملفات الضرورية قد يؤثر على عمل المنصة.
              </p>
            </Section>

            <Section icon={Trash2} title="7. الاحتفاظ بالبيانات وحذفها">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>نحتفظ ببيانات الحساب طوال فترة نشاطه وبعد الإغلاق بـ 5 سنوات (متطلبات ضريبية).</li>
                <li>بيانات المعاملات المالية: 7 سنوات (متطلبات البنك المركزي المصري).</li>
                <li>سجلات التدقيق الأمنية: 3 سنوات.</li>
                <li>بيانات التحقق من الهوية: طوال فترة الحساب + سنة واحدة بعد الإغلاق.</li>
                <li>ملفات الطلبات المُسلّمة: سنة واحدة بعد اكتمال الطلب.</li>
                <li>يمكن طلب الحذف المُعجّل مع مراعاة الالتزامات القانونية.</li>
              </ul>
            </Section>

            <Section icon={Scale} title="8. الامتثال القانوني">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>نلتزم بقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020.</li>
                <li>نلتزم بتعليمات البنك المركزي المصري بشأن حماية بيانات العملاء المالية.</li>
                <li>نلتزم بقانون مكافحة جرائم تقنية المعلومات رقم 175 لسنة 2018.</li>
                <li>نُعيّن مسؤول حماية بيانات (DPO) للإشراف على الامتثال.</li>
              </ul>
            </Section>

            <Section icon={Bell} title="9. تحديثات السياسة">
              <p>
                نحتفظ بحق تعديل سياسة الخصوصية. سنُخطرك بالتعديلات الجوهرية عبر البريد الإلكتروني أو إشعار داخل المنصة قبل 30 يوماً من سريانها.
              </p>
            </Section>

            <div className="p-6 rounded-2xl bg-muted/50 border text-center">
              <p className="text-muted-foreground mb-2">لأي استفسارات حول سياسة الخصوصية:</p>
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
