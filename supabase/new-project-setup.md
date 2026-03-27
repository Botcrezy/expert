# دليل إعداد مشروع Supabase جديد للمنصّة

> هذه الصفحة تشرح خطوة‑بخطوة كيف تنقل المنصّة إلى مشروع Supabase جديد (خارجي)، مع ضبط الجداول، الباكيتس، الـ RLS، الدوال (Edge Functions) والـ Secrets، ثم ربطها بالمنصّة (الفرونت إند).

> ملاحظة: هذا الدليل موجه لمشروع Supabase خارجي، لا يؤثر على Lovable Cloud المتصل بالمشروع هنا.

---

## 1. إنشاء مشروع Supabase جديد

1. ادخل لوحة تحكم Supabase.
2. أنشئ **مشروع جديد** New Project.
3. بعد الإنشاء، افتح **SQL Editor**.

سنحتاج لملفات من الريبو:

- `supabase/complete-schema.sql`  → الجداول + الدوال + التريجرز + RLS الأساسي
- `supabase/restore-schema.sql` → بيانات إضافية (CMS/Settings) (اختياري لكن مستحسن)
- `supabase/custom-migrations-export.sql` → كل التعديلات الجديدة/الإضافات فوق الـ schema الأساسي (مهم)
- `supabase/storage-buckets-policies.sql` → الباكيتس + سياسات RLS الخاصة بالملفات

---

## 2. استيراد السكيمة (الجداول والدوال)

1. افتح **SQL Editor** في مشروع Supabase الجديد.
2. شغّل الملفات بالترتيب التالي (كل ملف RUN لوحده):
   1) `supabase/complete-schema.sql`
   2) `supabase/restore-schema.sql` (اختياري لكن مستحسن)
   3) `supabase/custom-migrations-export.sql` (مهم: يجمع كل التحديثات الجديدة)

هذا سيقوم بـ:
- إنشاء جميع الجداول الأساسية.
- إنشاء/تحديث الدوال والتريجرز.
- إضافة أحدث التعديلات (purchase intents، أتمتة النشر، تشديد سياسات RLS للجداول الحساسة).

> لو ظهر خطأ من نوع "already exists" غالباً يمكن تجاهله على مشروع جديد، لأن الملفات مصممة تكون قابلة لإعادة التشغيل (idempotent) قدر الإمكان.

---

## 3. إعداد Storage Buckets + RLS

1. في Supabase Dashboard افتح **Storage** → **Buckets**.
2. أنشئ الباكيتس التالية بنفس الأسماء الموجودة في المشروع الحالي:

   - `avatars` (Public = Yes)
   - `request-files` (Public = No)
   - `training-files` (Public = No)
   - `identity-documents` (Public = No)
   - `course-resources` (Public = Yes)
   - `brand-assets` (Public = No)
   - `deliveries` (Public = No)

3. بعدها افتح **SQL Editor** مرة أخرى.
4. انسخ محتوى الملف:
   - `supabase/storage-buckets-policies.sql`
5. الصقه في SQL Editor ثم اضغط **RUN**.

هذا سيقوم بـ:
- تفعيل RLS على جداول `storage.objects` المرتبطة بالباكيتس.
- إنشاء سياسات القراءة/الكتابة الصحيحة لكل باكيت (ملفات الطلبات، التسليمات، التدريب، الهوية، إلخ).

> لو قمت بتعديل RLS يدوياً من قبل، راجع الملف قبل التشغيل لتتأكد أنه مناسب لبيئتك.

---

## 4. إعداد الـ Secrets (Environment) في Supabase

من لوحة Supabase الجديدة:

1. اذهب إلى **Project Settings → Configuration → Secrets (or Environment Variables)**.
2. أضف/حدّث القيم التالية:

### أسرار المنصّة العامة

- `SUPABASE_URL`  → رابط مشروع Supabase الجديد.
- `SUPABASE_ANON_KEY` → الـ anon key من Settings → API.
- `SUPABASE_PUBLISHABLE_KEY` → يمكن استخدام نفس الـ `anon key` أو قيمة مخصّصة حسب احتياجك.
- `SUPABASE_SERVICE_ROLE_KEY` → الـ Service role key (يُستخدم في Edge Functions فقط).

### أسرار Telegram

- `TELEGRAM_BOT_TOKEN` → التوكن من BotFather للبوت الرسمي للمنصّة.
- `TELEGRAM_ADMIN_USER_ID` → رقم الـ chat id الخاص بالأدمن (مثلاً: `7596246324`).

### أسرار Kashier Payment Gateway

- `KASHIER_MERCHANT_ID`  → MID من حساب Kashier.
- `KASHIER_API_KEY`      → API Key من Kashier.
- `KASHIER_SECRET_KEY`   → Secret Key من Kashier (للتوقيع على الـ webhook).

> تأكد أن أسماء الأسرار مطابقة تماماً لما هو مستخدم في ملفات الـ Edge Functions (`telegram-webhook`, `telegram-send`, `telegram-setup`, `kashier-payment`).

بعد الحفظ، أعد نشر الـ Functions (الخطوة التالية).

---

## 5. نشر الـ Edge Functions للمشروع الجديد

من جهازك المحلي (أو من أي بيئة فيها Supabase CLI):

1. ثبّت Supabase CLI إن لم يكن مثبّتاً:

```bash
npm install -g supabase
```

2. سجّل الدخول:

```bash
supabase login
```

3. اربط الريبو بالمشروع الجديد (Project ref من Settings → API):

```bash
supabase link --project-ref <NEW_PROJECT_REF>
```

4. تأكد من وجود هذه المجلدات في الريبو:

- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/telegram-setup/index.ts`
- `supabase/functions/telegram-send/index.ts`
- `supabase/functions/kashier-payment/index.ts`

5. أضف الأسرار إلى مشروع Supabase (لو لم تضفها من لوحة التحكم يمكن إضافتها بالـ CLI):

```bash
supabase secrets set \
  SUPABASE_URL="https://<NEW_PROJECT_REF>.supabase.co" \
  SUPABASE_ANON_KEY="<ANON_KEY>" \
  SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>" \
  TELEGRAM_BOT_TOKEN="<BOT_TOKEN>" \
  TELEGRAM_ADMIN_USER_ID="<ADMIN_CHAT_ID>" \
  KASHIER_MERCHANT_ID="<MID>" \
  KASHIER_API_KEY="<API_KEY>" \
  KASHIER_SECRET_KEY="<SECRET_KEY>"
```

6. انشر كل الدوال:

```bash
supabase functions deploy telegram-webhook telegram-setup telegram-send kashier-payment
```

> بعد النجاح، سيكون لديك مسارات الدوال الجديدة على مشروع Supabase الجديد.

---

## 6. ضبط Webhook الخاص بتليجرام على المشروع الجديد

بعد نشر الدوال وتأمين التوكن الصحيح:

1. احصل على رابط الـ webhook الجديد (يكون بالشكل):

```text
https://<NEW_PROJECT_REF>.supabase.co/functions/v1/telegram-webhook
```

2. استدعِ دالة الإعداد `telegram-setup` مع `setWebhook` (يمكن من Postman أو من داخل المنصّة عبر صفحة الإعدادات):

```json
POST /functions/v1/telegram-setup
{
  "action": "setWebhook",
  "webhook_url": "https://<NEW_PROJECT_REF>.supabase.co/functions/v1/telegram-webhook"
}
```

3. تأكد من الاتصال باستدعاء:

```json
POST /functions/v1/telegram-setup
{
  "action": "getWebhookInfo"
}
```

لو كان `ok: true` وظهر `url` الصحيح، يكون البوت متصل ✅.

---

## 7. ربط الفرونت إند بالمشروع الجديد (ملف .env)

في مشروع الفرونت إند (المنصّة):

1. افتح ملف البيئة المحلي (مثلاً `.env.local` أو ما يعادله في بيئتك) وحدث القيم:

```env
VITE_SUPABASE_PROJECT_ID="<NEW_PROJECT_REF>"
VITE_SUPABASE_URL="https://<NEW_PROJECT_REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<ANON_KEY أو PUBLISHABLE KEY>"
```

2. أعد تشغيل مشروع الفرونت إند.

3. تأكد من:
   - تسجيل الدخول/التسجيل يعملان.
   - إنشاء الطلبات (Requests) وتصفحها.
   - استقبال إشعارات Telegram لمن قام بالربط.
   - إنشاء طلب شراء (Order) وتجربة تحويل الدفع عبر Kashier (إن كان مفعّلاً).

---

## 8. التحقق النهائي

بعد الانتهاء من الخطوات:

1. **قاعدة البيانات**: افتح عدة جداول (مثل `requests`, `orders`, `telegram_links`) وتأكد من وجود البيانات الجديدة.
2. **الدوال (Functions)**:
   - جرّب إنشاء طلب من لوحة العميل.
   - تأكد من تنفيذ `fulfill_paid_order` عند نجاح الدفع.
3. **Telegram**:
   - اربط حساب تليجرام من المنصّة.
   - جرّب إرسال رسالة اختبار من لوحة الإدارة.
4. **Kashier**:
   - من لوحة الإدارة، جرّب زر "اختبار الاتصال" إن كان موجوداً.
   - نفّذ دفع تجريبي وتأكد أن حالة الطلب تتحول إلى `paid` وأن الكريديت يُضاف.

إذا احتجت تخصيصاً إضافياً أو تعديل RLS/جداول معينة، يفضل إنشاء ملف SQL جديد في مجلد `supabase/migrations/` ليكون كل تغيير موثق ويمكن تكراره على أي مشروع جديد لاحقاً.
