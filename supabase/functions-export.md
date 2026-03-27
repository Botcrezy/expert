# 📦 دليل نشر Edge Functions

## ما هي Edge Functions؟
Edge Functions هي وظائف خادم تعمل على الحافة (Edge) قريبة من المستخدمين، مما يوفر استجابة سريعة وأداء عالي.

---

## 🚀 طريقة النشر في Lovable Cloud

في Lovable Cloud، يتم نشر Edge Functions **تلقائياً** عند:
1. إنشاء ملف جديد في `supabase/functions/{function-name}/index.ts`
2. تعديل ملف موجود
3. بناء المشروع

**لا تحتاج لأي أوامر يدوية!**

---

## 📁 هيكل Edge Functions في المشروع

```
supabase/
├── config.toml                 # إعدادات المشروع
└── functions/
    ├── activate-free-plan/
    │   └── index.ts
    ├── admin-users/
    │   └── index.ts
    ├── create-request/
    │   └── index.ts
    ├── generate-invoice/
    │   └── index.ts
    ├── kashier-payment/
    │   └── index.ts
    ├── setup-admin/
    │   └── index.ts
    ├── telegram-send/
    │   └── index.ts
    ├── telegram-setup/
    │   └── index.ts
    └── telegram-webhook/
        └── index.ts
```

---

## 🔧 إنشاء Edge Function جديدة

### 1. الهيكل الأساسي

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Your logic here...
    const { data, error } = await supabase.from("table").select("*");

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 2. إضافة للـ config.toml

```toml
[functions.my-new-function]
verify_jwt = false
```

---

## 🔐 المتغيرات البيئية (Secrets)

### المتغيرات المتوفرة تلقائياً:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

### المتغيرات المخصصة:
- `KASHIER_MERCHANT_ID`
- `KASHIER_API_KEY`
- `KASHIER_SECRET_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_USER_ID`

---

## 📞 استدعاء Edge Functions

### من الـ Frontend:

```typescript
import { supabase } from "@/integrations/supabase/client";

// طريقة 1: باستخدام invoke
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { key: 'value' }
});

// طريقة 2: باستخدام fetch مباشرة
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/function-name`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: 'value' }),
  }
);
```

---

## 📋 قائمة Edge Functions الحالية

| الوظيفة | الوصف |
|---------|-------|
| `activate-free-plan` | تفعيل الباقة المجانية للمستخدمين الجدد |
| `admin-users` | إدارة المستخدمين من لوحة الأدمن |
| `create-request` | إنشاء طلب جديد مع خصم الكريديت |
| `generate-invoice` | إنشاء فاتورة PDF |
| `kashier-payment` | معالجة مدفوعات Kashier |
| `setup-admin` | إعداد أول مدير للنظام |
| `telegram-send` | إرسال رسائل Telegram |
| `telegram-setup` | إعداد بوت Telegram |
| `telegram-webhook` | استقبال رسائل Telegram |

---

## 🔄 النشر في مشروع Supabase خارجي

### الخطوة 1: تثبيت Supabase CLI

```bash
npm install -g supabase
```

### الخطوة 2: تسجيل الدخول

```bash
supabase login
```

### الخطوة 3: ربط المشروع

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### الخطوة 4: نشر جميع الوظائف

```bash
supabase functions deploy
```

### الخطوة 5: نشر وظيفة محددة

```bash
supabase functions deploy function-name
```

### الخطوة 6: إعداد الـ Secrets

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=your_token
supabase secrets set KASHIER_API_KEY=your_key
```

---

## ⚠️ ملاحظات مهمة

1. **لا تستخدم raw SQL** في Edge Functions
2. **استخدم Supabase Client** دائماً
3. **أضف CORS headers** لجميع الاستجابات
4. **سجل الأخطاء** باستخدام `console.error`
5. **verify_jwt = false** واستخدم التحقق في الكود

---

## 🛠️ استكشاف الأخطاء

### عرض السجلات:
```bash
supabase functions logs function-name
```

### إعادة النشر:
```bash
supabase functions deploy function-name --no-verify-jwt
```

---

## 📥 تصدير الوظائف

جميع ملفات Edge Functions موجودة في:
```
supabase/functions/
```

يمكنك نسخ المجلد بالكامل لأي مشروع Supabase آخر.
