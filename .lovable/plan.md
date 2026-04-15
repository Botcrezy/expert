

# خطة: عرض الروابط في Admin + مولد عروض بالذكاء الاصطناعي + ملاحظات للفريلانسر

## ملخص
3 محاور: (1) عرض delivery_links في صفحات الـ Admin (QC + تفاصيل الطلب)، (2) مولد عروض marketplace وهمية بالذكاء الاصطناعي للـ Admin، (3) إضافة ملاحظات وإرشادات للفريلانسر.

---

## 1. عرض روابط التسليم في لوحة الـ Admin

### تعديل `AdminQC.tsx`:
- في Review Dialog (سطر 307-323)، إضافة عرض `delivery_links` باستخدام `DeliveryLinksDisplay` بجانب عرض الملفات الحالي
- الـ Admin يشوف نوع كل رابط (Drive/GitHub/YouTube) مع زر فتح مباشر

### تعديل `AdminRequestDetails.tsx`:
- في قسم التسليمات، عرض الروابط المرفقة بنفس الطريقة

---

## 2. مولد عروض Marketplace بالذكاء الاصطناعي

### Edge Function جديدة `generate-fake-requests`:
- تستقبل عدد العروض المطلوبة (مثلاً 4)
- تستدعي Lovable AI Gateway لتوليد عروض متنوعة
- كل عرض يحتوي على: عنوان، وصف تفصيلي، ميزانية (6,000 - 14,000 ج.م)، حجم، تصنيف، أمثلة وروابط مشابهة
- تدخل العروض مباشرة في جدول `requests` بـ `publish_mode = 'marketplace'` و `status = 'submitted'`
- يتم إنشاء user وهمي أو استخدام حساب Admin كـ owner

### صفحة Admin جديدة أو قسم في Dashboard:
- زر "توليد عروض بالذكاء الاصطناعي" مع اختيار العدد (1-10)
- عرض نتيجة التوليد (العروض المولدة) قبل النشر أو بعده
- إضافة رابط في `AdminSidebar`

### تعديل `AdminSidebar.tsx`:
- إضافة عنصر جديد "مولد العروض" مع أيقونة Sparkles

---

## 3. ملاحظات وإرشادات للفريلانسر

### تعديل `FreelancerTaskDetails.tsx`:
- إضافة Alert box بملاحظات مهمة:
  - "يجب أن تكون روابط Google Drive عامة"
  - "لو العميل مش مديك تفاصيل كافية، اشتغل بإبداعك وسلم حاجة احترافية تعبر عن الفكرة"
  - "قدم شغل بسيط وشيك يوصل الفكرة بطريقة كويسة"

### تعديل `FreelancerProposalDetails.tsx`:
- نفس الملاحظات + إضافة:
  - "لو التفاصيل قليلة، نفذ رؤيتك المهنية مع الحفاظ على البساطة والاحترافية"

---

## التفاصيل التقنية

### Edge Function (`supabase/functions/generate-fake-requests/index.ts`):
- تستخدم `LOVABLE_API_KEY` + Lovable AI Gateway
- Tool calling لاستخراج JSON منظم
- تجلب التصنيفات من DB لتوزيع العروض عليها
- الميزانيات عشوائية بين 6,000 و 14,000 ج.م
- تضيف أمثلة وروابط مواقع/تطبيقات مشابهة في الوصف

### صفحة Admin جديدة (`src/pages/admin/AdminAIRequests.tsx`):
- واجهة بسيطة: عدد + زر توليد + عرض النتائج
- Route جديد في `App.tsx`

### الملفات المعدلة:
- `src/pages/admin/AdminQC.tsx` — عرض delivery_links
- `src/pages/admin/AdminRequestDetails.tsx` — عرض delivery_links
- `src/pages/freelancer/FreelancerTaskDetails.tsx` — ملاحظات
- `src/pages/freelancer/FreelancerProposalDetails.tsx` — ملاحظات
- `src/components/layout/AdminSidebar.tsx` — رابط جديد
- `src/App.tsx` — Route جديد

### الملفات الجديدة:
- `supabase/functions/generate-fake-requests/index.ts`
- `src/pages/admin/AdminAIRequests.tsx`

