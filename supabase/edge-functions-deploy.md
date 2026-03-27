# 🚀 دليل نشر Edge Functions في Supabase

## 📋 قائمة الـ Edge Functions في المشروع

| Function Name | الوصف | المتطلبات |
|---------------|-------|----------|
| `activate-free-plan` | تفعيل الباقات المجانية للعملاء | - |
| `admin-users` | إدارة المستخدمين (حظر، تحقق، حذف) | - |
| `create-request` | إنشاء طلبات جديدة مع خصم الكريديت | - |
| `generate-invoice` | إنشاء فواتير HTML للطلبات | - |
| `kashier-payment` | معالجة مدفوعات Kashier | `KASHIER_MERCHANT_ID`, `KASHIER_API_KEY`, `KASHIER_SECRET_KEY` |
| `setup-admin` | إعداد حساب المدير الأول | - |
| `telegram-send` | إرسال رسائل تليجرام | `TELEGRAM_BOT_TOKEN` |
| `telegram-setup` | إعداد بوت تليجرام | `TELEGRAM_BOT_TOKEN` |
| `telegram-webhook` | استقبال webhooks من تليجرام | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_USER_ID` |

---

## 🔐 Secret Keys المطلوبة

قبل نشر الـ Functions، تأكد من إضافة هذه الـ Secrets في Supabase:

### 1. Secrets تلقائية (موجودة افتراضياً)
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
```

### 2. Secrets يجب إضافتها يدوياً

#### Telegram Bot
```bash
# احصل على Token من @BotFather في تليجرام
TELEGRAM_BOT_TOKEN=your_bot_token_here

# معرف حساب الأدمن في تليجرام (أرقام فقط)
TELEGRAM_ADMIN_USER_ID=123456789
```

#### Kashier Payment Gateway
```bash
# من لوحة تحكم Kashier
KASHIER_MERCHANT_ID=MID-xxxxx
KASHIER_API_KEY=your_api_key
KASHIER_SECRET_KEY=your_secret_key
```

---

## 📦 نشر Edge Functions في Supabase خارجي

### الخطوة 1: تثبيت Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh

# npm (جميع الأنظمة)
npm install -g supabase
```

### الخطوة 2: تسجيل الدخول

```bash
supabase login
```

### الخطوة 3: ربط المشروع

```bash
# استبدل PROJECT_REF بـ Reference ID من Supabase Dashboard
supabase link --project-ref YOUR_PROJECT_REF
```

### الخطوة 4: إضافة Secrets

```bash
# Telegram
supabase secrets set TELEGRAM_BOT_TOKEN="your_token"
supabase secrets set TELEGRAM_ADMIN_USER_ID="your_id"

# Kashier
supabase secrets set KASHIER_MERCHANT_ID="MID-xxxxx"
supabase secrets set KASHIER_API_KEY="your_api_key"
supabase secrets set KASHIER_SECRET_KEY="your_secret_key"

# عرض الـ Secrets الحالية
supabase secrets list
```

### الخطوة 5: نشر Functions

```bash
# نشر جميع الـ Functions
supabase functions deploy

# أو نشر function محددة
supabase functions deploy activate-free-plan
supabase functions deploy admin-users
supabase functions deploy create-request
supabase functions deploy generate-invoice
supabase functions deploy kashier-payment
supabase functions deploy setup-admin
supabase functions deploy telegram-send
supabase functions deploy telegram-setup
supabase functions deploy telegram-webhook
```

---

## 🔧 إعداد Webhook لـ Telegram

بعد نشر الـ Functions، قم بإعداد الـ Webhook:

```bash
# URL الـ webhook
WEBHOOK_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-webhook

# تفعيل الـ Webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}"
```

أو من خلال الـ Function:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-setup" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "setWebhook",
    "webhook_url": "https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-webhook"
  }'
```

---

## 📝 ملاحظات مهمة

### 1. JWT Verification
جميع الـ Functions معدة بـ `verify_jwt = false` في `config.toml` لأن التحقق يتم داخل الكود.

### 2. CORS Headers
جميع الـ Functions تتضمن CORS headers للسماح بالاستدعاء من المتصفح.

### 3. Error Handling
جميع الـ Functions تتضمن معالجة شاملة للأخطاء مع Logging.

### 4. Idempotency
الـ Functions مثل `create-request` و `kashier-payment` تدعم Idempotency لمنع التكرار.

---

## 🧪 اختبار Functions

```bash
# اختبار activate-free-plan
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/activate-free-plan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"planId": "plan-uuid-here"}'

# اختبار setup-admin
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/setup-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "full_name": "مدير النظام"
  }'

# اختبار telegram-setup
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-setup" \
  -H "Content-Type: application/json" \
  -d '{"action": "getMe"}'
```

---

## 🔄 تحديث Functions

```bash
# تحديث function محددة
supabase functions deploy function-name

# تحديث الكل
supabase functions deploy
```

---

## 📊 مراقبة Logs

```bash
# مشاهدة logs لـ function محددة
supabase functions logs function-name

# مشاهدة جميع الـ logs
supabase functions logs
```

---

## ⚠️ استكشاف الأخطاء

### خطأ: Function not found
- تأكد من وجود ملف `index.ts` داخل مجلد الـ function
- تأكد من صحة اسم المجلد

### خطأ: Secret not found
- تأكد من إضافة الـ Secret عبر `supabase secrets set`
- تحقق من الاسم الصحيح للـ Secret

### خطأ: CORS
- تأكد من وجود CORS headers في الـ Response
- تأكد من معالجة OPTIONS request

### خطأ: Unauthorized
- تأكد من إرسال Authorization header
- تحقق من صلاحية الـ Token

---

## 📞 الدعم

للمساعدة:
- [Supabase Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Discord](https://discord.supabase.com)
