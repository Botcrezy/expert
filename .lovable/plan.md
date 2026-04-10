

# خطة التطوير والتحسين

## ملخص
تم تنفيذ: نظام Marketplace كامل مع صفحة عامة للمشاريع، نظام عروض الفريلانسرز، تحسين صفحة الخبراء، وتعديل إنشاء الطلبات.

---

## ✅ 1. صفحة الماركت بلايس (`/marketplace`)

- صفحة عامة تعرض مشاريع العملاء المتاحة للتقديم
- كل كارت يعرض: عنوان المشروع، التصنيف، الحجم، تاريخ النشر
- لا يعرض بيانات العميل (حماية الخصوصية)
- فلاتر بحث حسب الاسم والتصنيف

## ✅ 2. صفحة تفاصيل المشروع (`/marketplace/:id`)

- عرض تفاصيل المشروع كاملة
- نموذج تقديم عرض (خطاب تقديم، سعر مقترح، مدة)
- حماية: فقط الفريلانسرز يمكنهم التقديم

## ✅ 3. نظام العروض (Proposals)

- جدول `marketplace_proposals` مع RLS
- صفحة الأدمن لإدارة العروض (`/admin/proposals`)
- صفحة الفريلانسر لعرض عروضه (`/freelancer/proposals`)

## ✅ 4. تحسين صفحة الخبراء (`/freelancers`)

- تصميم احترافي بصور cover من البورتفوليو
- فلاتر حسب التصنيف والتقييم
- ربط مباشر بالبورتفوليو

## ✅ 5. تعديل إنشاء الطلب

- إضافة خيار `publish_mode` (منصة أو ماركت بلايس)
- تحديث Edge Function لدعم publish_mode

## ✅ 6. تحديث الـ Navigation

- إضافة روابط الماركت بلايس والخبراء في الـ Navbar
- إضافة "عروضي" في sidebar الفريلانسر
- إضافة "عروض الماركت بلايس" في sidebar الأدمن

---

## الملفات المتأثرة

### جديدة:
- `src/pages/Marketplace.tsx`
- `src/pages/MarketplaceRequestDetails.tsx`
- `src/pages/admin/AdminProposals.tsx`
- `src/pages/freelancer/FreelancerProposals.tsx`

### معدلة:
- `src/pages/FreelancersPage.tsx`
- `src/pages/client/CreateRequest.tsx`
- `src/App.tsx`
- `src/components/layout/DynamicNavbar.tsx`
- `src/components/layout/FreelancerSidebar.tsx`
- `src/components/layout/AdminSidebar.tsx`
- `supabase/functions/create-request/index.ts`

### قاعدة البيانات:
- `requests.publish_mode` (عمود جديد)
- `marketplace_proposals` (جدول جديد مع RLS)
