import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const clientUserId = '76096b98-e2d3-4a78-adac-88498932cdb1'

  const tasks = [
    {
      user_id: clientUserId,
      category_id: '5bcee35b-0c12-4f6c-b582-02ee1fd08870',
      title: 'تطوير لوحة تحكم إدارية لمتجر إلكتروني',
      description: 'المطلوب تطوير لوحة تحكم إدارية شاملة لمتجر إلكتروني تشمل:\n\n1. صفحة رئيسية بإحصائيات المبيعات والطلبات والأرباح مع رسوم بيانية تفاعلية\n2. إدارة المنتجات (إضافة/تعديل/حذف) مع دعم الصور المتعددة والأحجام والألوان\n3. إدارة الطلبات مع تتبع حالة كل طلب وإمكانية تحديث الحالة\n4. إدارة العملاء مع عرض سجل مشترياتهم\n5. نظام تقارير متقدم بالفلترة حسب التاريخ والفئة\n6. تصميم متجاوب مع جميع الشاشات\n\nالتقنيات المطلوبة: React.js + TypeScript + Tailwind CSS\nالتسليم: ملفات المشروع كاملة مع التوثيق',
      size: 'large',
      estimated_budget: 4300,
      publish_mode: 'platform',
      status: 'assigned',
      freelancer_id: '4be3f599-4f5c-4fad-b6c0-a6b6d925a2df',
      payment: 4300,
    },
    {
      user_id: clientUserId,
      category_id: '83477364-58a5-480a-9b16-862987c3d3dd',
      title: 'بناء صفحة هبوط احترافية لشركة عقارات',
      description: 'المطلوب تصميم وتطوير صفحة هبوط (Landing Page) احترافية لشركة عقارات تشمل:\n\n1. هيدر مع شعار الشركة وقائمة تنقل\n2. قسم Hero بصورة خلفية كبيرة مع عنوان جذاب وزر CTA\n3. قسم عرض العقارات المميزة بتصميم كروت\n4. قسم "لماذا تختارنا" مع أيقونات ونصوص\n5. قسم شهادات العملاء (Testimonials)\n6. نموذج اتصال متكامل\n7. فوتر بمعلومات التواصل وروابط السوشيال ميديا\n\nالتصميم يجب أن يكون عصري وفخم يعكس طبيعة القطاع العقاري',
      size: 'medium',
      estimated_budget: 2800,
      publish_mode: 'platform',
      status: 'assigned',
      freelancer_id: 'eb3404b4-3e7b-4503-a01d-cf219a042eab',
      payment: 2800,
    },
    {
      user_id: clientUserId,
      category_id: '5bcee35b-0c12-4f6c-b582-02ee1fd08870',
      title: 'تصميم موقع تعريفي لمكتب محاماة',
      description: 'المطلوب تصميم وتطوير موقع تعريفي متكامل لمكتب محاماة يشمل:\n\n1. الصفحة الرئيسية: عرض رسالة المكتب وأبرز الخدمات\n2. صفحة "من نحن": تاريخ المكتب وفريق المحامين\n3. صفحة الخدمات القانونية: قانون تجاري، عقاري، أحوال شخصية، إلخ\n4. صفحة المقالات القانونية (Blog)\n5. صفحة التواصل مع خريطة الموقع ونموذج اتصال\n6. تصميم كلاسيكي واحترافي يليق بطبيعة العمل القانوني\n\nالموقع يجب أن يكون متجاوب مع الهواتف المحمولة وسريع التحميل',
      size: 'medium',
      estimated_budget: 3200,
      publish_mode: 'platform',
      status: 'in_progress',
      freelancer_id: '5981f3e1-1ecc-4fd0-bf74-1e673015bba7',
      payment: 3200,
    },
    {
      user_id: clientUserId,
      category_id: '5bcee35b-0c12-4f6c-b582-02ee1fd08870',
      title: 'تطوير نظام حجز مواعيد لعيادة طبية',
      description: 'المطلوب تطوير نظام حجز مواعيد متكامل لعيادة طبية يشمل:\n\n1. واجهة المريض: حجز موعد جديد، عرض المواعيد السابقة والقادمة\n2. اختيار التخصص والطبيب والموعد المتاح\n3. تأكيد الحجز عبر البريد الإلكتروني\n4. لوحة تحكم الطبيب: عرض مواعيد اليوم والأسبوع\n5. إمكانية إلغاء أو تعديل المواعيد\n6. تقويم تفاعلي لعرض الأوقات المتاحة\n\nالتصميم يجب أن يكون بسيط وسهل الاستخدام مع ألوان هادئة ومريحة',
      size: 'large',
      estimated_budget: 3500,
      publish_mode: 'platform',
      status: 'assigned',
      freelancer_id: 'b6030822-63b3-47d8-82da-59b2b1e21f65',
      payment: 3500,
    },
    {
      user_id: clientUserId,
      category_id: '83477364-58a5-480a-9b16-862987c3d3dd',
      title: 'تصميم وبرمجة واجهة تطبيق توصيل طعام',
      description: 'المطلوب تصميم وبرمجة واجهة أمامية لتطبيق ويب لتوصيل الطعام تشمل:\n\n1. صفحة رئيسية بالمطاعم القريبة مع فلتر حسب النوع والتقييم\n2. صفحة تفاصيل المطعم مع قائمة الطعام والأسعار\n3. سلة المشتريات مع إمكانية التعديل\n4. صفحة الدفع والتأكيد\n5. تتبع الطلب بخريطة تفاعلية\n6. صفحة الملف الشخصي وسجل الطلبات\n7. تصميم عصري وجذاب مع Animations سلسة\n\nالمطلوب الـ Frontend فقط باستخدام React.js مع بيانات Mock',
      size: 'large',
      estimated_budget: 3800,
      publish_mode: 'platform',
      status: 'in_progress',
      freelancer_id: '4f29b66b-eb30-43dd-be83-afeddf4d9cb9',
      payment: 3800,
    },
    {
      user_id: clientUserId,
      category_id: 'a6ab827e-fdb9-4cee-b5a7-ec91e6d19d88',
      title: 'بناء نموذج تحليل بيانات مبيعات بالذكاء الاصطناعي',
      description: 'المطلوب بناء نموذج ذكاء اصطناعي لتحليل بيانات المبيعات والتنبؤ بالمبيعات المستقبلية:\n\n1. تنظيف وتحضير البيانات (Data Preprocessing)\n2. تحليل استكشافي شامل (EDA) مع رسوم بيانية توضيحية\n3. بناء نموذج تنبؤ بالمبيعات باستخدام Machine Learning\n4. مقارنة بين عدة نماذج واختيار الأفضل\n5. لوحة معلومات تفاعلية (Dashboard) لعرض النتائج\n6. تقرير تفصيلي بالنتائج والتوصيات\n\nالتقنيات: Python + Pandas + Scikit-learn + Plotly أو Streamlit\nالبيانات سيتم توفيرها بصيغة CSV',
      size: 'large',
      estimated_budget: 4200,
      publish_mode: 'platform',
      status: 'assigned',
      freelancer_id: '274dd2dd-f627-4597-9c60-1ea074d8dae6',
      payment: 4200,
    },
    {
      user_id: clientUserId,
      category_id: '7a504ab6-8bc1-46a0-93d4-a8f4569694ea',
      title: 'تطوير API متكامل لنظام إدارة مخزون',
      description: 'المطلوب تطوير RESTful API متكامل لنظام إدارة مخزون يشمل:\n\n1. إدارة المنتجات: CRUD كامل مع دعم الفئات والعلامات التجارية\n2. إدارة المخزون: تتبع الكميات، تنبيهات النقص التلقائية\n3. إدارة الموردين: بيانات الموردين وسجل التوريدات\n4. إدارة الطلبات: إنشاء أوامر شراء وتتبع حالتها\n5. نظام المصادقة والصلاحيات (JWT + Role-based)\n6. تقارير API: المنتجات الأكثر مبيعاً، حركة المخزون\n7. توثيق API باستخدام Swagger/OpenAPI\n\nالتقنيات المطلوبة: .NET أو Node.js مع قاعدة بيانات SQL',
      size: 'large',
      estimated_budget: 3600,
      publish_mode: 'platform',
      status: 'assigned',
      freelancer_id: '4fb6104e-0b84-4b2a-9983-ac35f7a81401',
      payment: 3600,
    },
    {
      user_id: clientUserId,
      category_id: 'b85c9aa5-c156-4edf-82c4-2eadf04bb521',
      title: 'بناء بوابة إلكترونية لجامعة',
      description: 'المطلوب بناء بوابة إلكترونية متكاملة لجامعة تشمل:\n\n1. الصفحة الرئيسية: أخبار الجامعة، أحداث قادمة، إعلانات مهمة\n2. صفحة الكليات والأقسام\n3. صفحة البرامج الأكاديمية ومتطلبات القبول\n4. نظام تسجيل دخول الطلاب وأعضاء هيئة التدريس\n5. لوحة تحكم الطالب: الجدول الدراسي، النتائج، الإشعارات\n6. نظام أخبار وأحداث قابل للإدارة\n7. تصميم رسمي واحترافي مع دعم كامل للعربية\n\nالتقنيات: Angular أو React مع تصميم متجاوب',
      size: 'large',
      estimated_budget: 3400,
      publish_mode: 'platform',
      status: 'in_progress',
      freelancer_id: '71e30544-17c0-4724-b594-0078dcce3a3c',
      payment: 3400,
    },
    {
      user_id: clientUserId,
      category_id: '83477364-58a5-480a-9b16-862987c3d3dd',
      title: 'تصميم واجهة مستخدم لتطبيق مالي',
      description: 'المطلوب تصميم واجهة مستخدم احترافية لتطبيق مالي (FinTech) يشمل:\n\n1. شاشة Dashboard: عرض الرصيد والمعاملات الأخيرة والإحصائيات\n2. شاشة التحويلات: إرسال واستلام الأموال\n3. شاشة سجل المعاملات مع فلترة متقدمة\n4. شاشة إعدادات الحساب والأمان\n5. شاشة البطاقات الافتراضية\n6. تصميم عصري ونظيف مع اهتمام بالتفاصيل\n7. Micro-interactions وAnimations محسّنة\n\nالتسليم: ملفات React/Next.js جاهزة للتكامل مع الباك إند',
      size: 'medium',
      estimated_budget: 2900,
      publish_mode: 'platform',
      status: 'assigned',
      freelancer_id: 'eb93816c-53e5-484b-a488-3dafe908f6e1',
      payment: 2900,
    },
    {
      user_id: clientUserId,
      category_id: '83477364-58a5-480a-9b16-862987c3d3dd',
      title: 'تطوير مدونة احترافية مع نظام إدارة محتوى',
      description: 'المطلوب تطوير مدونة احترافية مع نظام إدارة محتوى (CMS) يشمل:\n\n1. واجهة القراءة: صفحة رئيسية بأحدث المقالات، صفحة تفاصيل المقال\n2. نظام التصنيفات والوسوم (Tags)\n3. نظام بحث متقدم في المقالات\n4. لوحة تحكم الكاتب: محرر نصوص غني (Rich Text Editor)\n5. إدارة الصور والميديا\n6. نظام تعليقات بسيط\n7. SEO محسّن: Meta tags، Sitemap، Schema markup\n8. تصميم مدونة عصري مع أوضاع فاتح/داكن\n\nالتقنيات: React أو Next.js',
      size: 'medium',
      estimated_budget: 2600,
      publish_mode: 'platform',
      status: 'assigned',
      freelancer_id: '6347f69a-4787-43f7-a193-0a07e008f951',
      payment: 2600,
    },
    {
      user_id: clientUserId,
      category_id: '83477364-58a5-480a-9b16-862987c3d3dd',
      title: 'تحويل تصميم Figma لموقع شركة تقنية',
      description: 'المطلوب تحويل تصميم Figma جاهز إلى كود HTML/CSS/JS لموقع شركة تقنية:\n\n1. تحويل pixel-perfect لجميع الصفحات (6 صفحات)\n2. تطبيق Animations وTransitions كما في التصميم\n3. ضمان التوافق مع جميع المتصفحات الحديثة\n4. تحسين الأداء والسرعة (Lighthouse score 90+)\n5. تطبيق Responsive Design لجميع الشاشات\n6. استخدام Semantic HTML5\n7. كتابة CSS نظيف ومنظم (BEM أو Tailwind)\n\nالتصميم سيتم مشاركته عبر رابط Figma بعد التعيين',
      size: 'small',
      estimated_budget: 2400,
      publish_mode: 'platform',
      status: 'assigned',
      freelancer_id: '87c0bf6e-f074-44b1-ba86-2bbc8f2cb0b0',
      payment: 2400,
    },
    {
      user_id: clientUserId,
      category_id: '83477364-58a5-480a-9b16-862987c3d3dd',
      title: 'بناء متجر إلكتروني لبيع منتجات يدوية',
      description: 'المطلوب بناء متجر إلكتروني لبيع المنتجات اليدوية (Handmade) يشمل:\n\n1. صفحة رئيسية بمنتجات مميزة وعروض خاصة\n2. صفحة تصفح المنتجات مع فلترة حسب الفئة والسعر\n3. صفحة تفاصيل المنتج مع معرض صور وتقييمات\n4. سلة مشتريات وعملية شراء سلسة\n5. صفحة "قصتنا" تعرض قصة البراند\n6. تصميم دافئ وطبيعي يعكس طابع المنتجات اليدوية\n7. دعم كامل للغة العربية مع RTL\n\nالتقنيات: React أو Next.js + Tailwind CSS',
      size: 'medium',
      estimated_budget: 3100,
      publish_mode: 'platform',
      status: 'in_progress',
      freelancer_id: 'fe18918e-9dac-421f-8481-c966de1e59c3',
      payment: 3100,
    },
  ]

  const results = []

  for (const task of tasks) {
    // Insert request
    const creditsMap: Record<string, number> = { micro: 1, small: 3, medium: 5, large: 10 }
    const credits = creditsMap[task.size] || 5

    const { data: req, error: reqErr } = await supabase
      .from('requests')
      .insert({
        user_id: task.user_id,
        category_id: task.category_id,
        title: task.title,
        description: task.description,
        size: task.size,
        credits_cost: credits,
        estimated_budget: task.estimated_budget,
        publish_mode: task.publish_mode,
        status: task.status,
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .select('id, request_number')
      .single()

    if (reqErr) {
      results.push({ title: task.title, error: reqErr.message })
      continue
    }

    // Create assignment
    const { error: assignErr } = await supabase
      .from('assignments')
      .insert({
        request_id: req.id,
        freelancer_id: task.freelancer_id,
        is_active: true,
        payment_amount: task.payment,
        suggested_payment: task.payment,
      })

    results.push({
      title: task.title,
      request_number: req.request_number,
      request_id: req.id,
      freelancer: task.freelancer_id,
      assignError: assignErr?.message || null,
    })
  }

  return new Response(JSON.stringify({ success: true, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
