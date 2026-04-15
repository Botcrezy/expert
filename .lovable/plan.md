

# خطة تنفيذ 8 ميزات رئيسية لمنصة Sity Experts

هذه خطة شاملة لتنفيذ الميزات المطلوبة على مراحل. كل مرحلة مستقلة ويمكن تنفيذها بالترتيب.

---

## المرحلة 1: نظام المراسلة المتقدم (Chat مع ملفات وصور)

**الوضع الحالي:** يوجد ChatBox يدعم رسائل نصية فقط مع حقل `attachments` (jsonb) في جدول `messages` لكنه غير مُفعّل في الواجهة.

**المطلوب:**
- تفعيل رفع الصور والملفات داخل الشات عبر Storage bucket `chat-attachments`
- عرض معاينة الصور والملفات المرفقة داخل فقاعات الرسائل
- دعم تسجيل صوتي (Web Audio API) ورفعه كملف
- تحديث `ChatBox.tsx` و `useMessages.tsx` لدعم المرفقات

**قاعدة البيانات:** إنشاء Storage bucket `chat-attachments` مع RLS policies

---

## المرحلة 2: نظام الطلبات المتكررة (Recurring Requests)

**المطلوب:**
- جدول جديد `recurring_requests` يحتوي على: `user_id`, `category_id`, `title`, `description`, `size`, `frequency` (weekly/monthly), `next_run_at`, `is_active`, `template_data` (jsonb)
- صفحة إدارة الطلبات المتكررة للعميل
- Edge Function `process-recurring-requests` تعمل بـ pg_cron لإنشاء الطلبات تلقائياً
- زر "تكرار هذا الطلب" في صفحة تفاصيل الطلب

---

## المرحلة 3: قوالب الطلبات الجاهزة (Request Templates)

**المطلوب:**
- جدول `request_templates`: `id`, `name`, `name_ar`, `category_id`, `description_template`, `size`, `is_active`, `sort_order`
- إدارة القوالب من لوحة الأدمن (`AdminRequestTemplates`)
- دمج القوالب في صفحة `CreateRequest.tsx` كخطوة اختيارية قبل اختيار التصنيف
- ملء البيانات تلقائياً عند اختيار قالب

---

## المرحلة 4: نظام المفضلات (Favorites)

**المطلوب:**
- جدول `favorite_freelancers`: `id`, `user_id`, `freelancer_id`, `created_at`
- زر قلب/نجمة في بروفايل الفريلانسر وفي الـ Marketplace
- صفحة "فريلانسرز مفضلين" في لوحة العميل
- إمكانية اختيار فريلانسر مفضل مباشرة عند إنشاء طلب جديد (ربط مع `preferred_freelancer_id`)

---

## المرحلة 5: Dashboard تحليلي متقدم للعميل

**المطلوب:**
- تطوير `ClientDashboard.tsx` بإضافة:
  - إجمالي الإنفاق (من credits_ledger)
  - متوسط وقت التسليم (من requests: created_at → completed)
  - أكثر التصنيفات طلباً (تجميع حسب category_id)
  - رسم بياني للطلبات شهرياً (recharts)
  - معدل الرضا (من التقييمات إن وجدت)
- لا حاجة لجداول جديدة — كل البيانات متاحة من الجداول الحالية

---

## المرحلة 6: توصيات فريلانسر بالذكاء الاصطناعي

**المطلوب:**
- Edge Function `suggest-freelancer-assignment` (موجودة بالفعل) — تحديثها لاستخدام Lovable AI Gateway
- عند إنشاء طلب أو موافقة الأدمن عليه، استدعاء الـ AI لاقتراح أفضل فريلانسر بناءً على:
  - تخصص الفريلانسر (skills)
  - التقييم (rating/stars)
  - التوفر (is_available)
  - عدد المهام الحالية
- عرض الاقتراح في لوحة الأدمن مع زر "تعيين المقترح"

---

## المرحلة 7: تحليل جودة التسليمات بالـ AI

**المطلوب:**
- Edge Function `ai-qc-check` تستقبل معلومات التسليم وتحلل:
  - هل الملفات المرفقة مطابقة للمطلوب (عدد، نوع)
  - تحليل نصي للوصف مقابل التسليم
- عرض نتيجة الفحص في صفحة QC للأدمن (`AdminQC.tsx`)
- جدول `ai_qc_results`: `delivery_id`, `score`, `issues` (jsonb), `checked_at`

---

## المرحلة 8: تقارير أداء الفريلانسر

**المطلوب:**
- صفحة `FreelancerPerformanceReport` في لوحة الأدمن
- حساب تلقائي من البيانات الحالية:
  - عدد المهام المكتملة شهرياً
  - متوسط وقت الاستجابة (من assignment → أول delivery)
  - معدل القبول من أول مرة vs المراجعات
  - معدل رضا العملاء
- تصدير التقرير كـ PDF
- إمكانية إرسال التقرير للفريلانسر عبر إشعار

---

## ملخص التغييرات التقنية

| المرحلة | جداول جديدة | Edge Functions | صفحات جديدة |
|---------|-------------|----------------|-------------|
| 1. الشات | Storage bucket | — | — (تعديل ChatBox) |
| 2. المتكررة | `recurring_requests` | `process-recurring-requests` | صفحة إدارة |
| 3. القوالب | `request_templates` | — | صفحة أدمن + تعديل CreateRequest |
| 4. المفضلات | `favorite_freelancers` | — | صفحة مفضلات + تعديلات |
| 5. التحليلات | — | — | تطوير ClientDashboard |
| 6. توصيات AI | — | تعديل existing | تعديل AdminRequestDetails |
| 7. QC بالـ AI | `ai_qc_results` | `ai-qc-check` | تعديل AdminQC |
| 8. تقارير | — | — | صفحة جديدة |

**الترتيب المقترح:** نبدأ بالمراحل 3 → 4 → 1 → 5 (الأسرع والأكثر تأثيراً)، ثم 2 → 6 → 7 → 8.

هل توافق على البدء بهذا الترتيب أم تفضل ترتيب مختلف؟

