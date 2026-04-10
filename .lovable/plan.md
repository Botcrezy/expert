

# خطة تطوير المنصة: Marketplace + تحسين صفحة الفريلانسرز

## ملخص
3 محاور رئيسية: تحسين صفحة الفريلانسرز العامة، إنشاء صفحة Marketplace عامة للمشاريع، وإضافة نظام تقديم الفريلانسرز على المشاريع.

---

## 1. تحسين صفحة الفريلانسرز العامة (`/freelancers`)

**الوضع الحالي:** صفحة بسيطة بكروت تعرض اسم وبايو ومهارات فقط.

**التحسينات:**
- تحويل الكروت لتصميم احترافي أكبر يعرض: صورة cover، عدد المشاريع في البورتفوليو، عدد الخدمات المتاحة
- إضافة فلاتر حسب التصنيف (categories) والتقييم
- عند الضغط على كارت فريلانسر، يفتح صفحة البورتفوليو `/u/{slug}` مباشرة
- جلب بيانات إضافية: عدد المشاريع (`portfolio_projects`) وعدد الخدمات (`portfolio_services`) لكل فريلانسر

---

## 2. صفحة Marketplace العامة (`/marketplace`)

**الفكرة:** صفحة عامة تعرض مشاريع العملاء المتاحة للتقديم (مثل مستقل/Upwork).

**التنفيذ:**
- إضافة عمود `publish_mode` لجدول `requests` بقيم: `'platform'` (يروح للمنصة مباشرة) أو `'marketplace'` (ينشر في الماركت بلايس)
- إنشاء صفحة `/marketplace` عامة تعرض الطلبات اللي `publish_mode = 'marketplace'` و `status = 'submitted'`
- كل كارت يعرض: عنوان المشروع، التصنيف، الحجم، الميزانية التقديرية، تاريخ النشر
- لا يعرض اسم العميل أو بياناته (حماية الخصوصية)
- زر "قدّم على المشروع" يفتح dialog للفريلانسر المسجل

---

## 3. نظام تقديم الفريلانسرز (Proposals)

**التنفيذ:**
- إنشاء جدول `marketplace_proposals` يحتوي:
  - `request_id`, `freelancer_id`, `cover_letter`, `proposed_price`, `proposed_days`, `status`, `created_at`
- عند إنشاء طلب جديد، العميل يختار: "إرسال للمنصة" أو "نشر في الماركت بلايس"
- الفريلانسر يقدر يقدم عرض (proposal) على أي مشروع في الماركت بلايس
- الأدمن يشوف العروض ويختار الأنسب ويعمل assignment
- إضافة صفحة للأدمن لإدارة العروض

---

## 4. تعديل صفحة إنشاء الطلب

**التعديل في `CreateRequest.tsx`:**
- إضافة خطوة أو خيار في الـ wizard: "كيف تريد نشر طلبك؟"
  - خيار 1: "إرسال للمنصة" (السلوك الحالي)
  - خيار 2: "نشر في الماركت بلايس" (الفريلانسرز يقدموا عليه)

---

## التفاصيل التقنية

### قاعدة البيانات (Migrations):
```sql
-- 1. إضافة publish_mode للطلبات
ALTER TABLE requests ADD COLUMN publish_mode text NOT NULL DEFAULT 'platform'
  CHECK (publish_mode IN ('platform', 'marketplace'));

-- 2. جدول العروض
CREATE TABLE marketplace_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  freelancer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cover_letter text,
  proposed_price numeric,
  proposed_days integer,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(request_id, freelancer_id)
);

ALTER TABLE marketplace_proposals ENABLE ROW LEVEL SECURITY;

-- RLS: فريلانسر يشوف عروضه فقط، أدمن يشوف الكل
-- Public: أي حد يشوف الطلبات marketplace فقط (بدون بيانات العميل)
```

### الملفات الجديدة:
- `src/pages/Marketplace.tsx` — صفحة الماركت بلايس العامة
- `src/pages/MarketplaceRequestDetails.tsx` — تفاصيل مشروع + نموذج التقديم
- `src/pages/admin/AdminProposals.tsx` — إدارة العروض للأدمن
- `src/pages/freelancer/FreelancerProposals.tsx` — عروض الفريلانسر

### الملفات المعدلة:
- `src/pages/FreelancersPage.tsx` — تحسين التصميم + فلاتر
- `src/pages/client/CreateRequest.tsx` — إضافة خيار publish_mode
- `src/App.tsx` — إضافة الراوتات الجديدة
- `src/components/layout/DynamicNavbar.tsx` — إضافة رابط "الماركت بلايس"
- `src/components/layout/FreelancerSidebar.tsx` — إضافة رابط "عروضي"
- `src/components/layout/AdminSidebar.tsx` — إضافة رابط "العروض"

