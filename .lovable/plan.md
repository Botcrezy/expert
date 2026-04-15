

# خطة إصلاح جميع المشاكل

## المشاكل المكتشفة

### 1. تحذير React: Badge component بدون forwardRef
- **الملف:** `src/components/ui/badge.tsx`
- **المشكلة:** مكون Badge معرّف كـ function عادية بدون `React.forwardRef`، مما يسبب تحذير في الـ console عند استخدامه في Marketplace
- **الحل:** تحويل Badge لاستخدام `React.forwardRef`

### 2. تحذير Vite: splitVendorChunk
- **الملف:** `vite.config.ts`
- **المشكلة:** استخدام `splitVendorChunk` مع object form من `manualChunks`
- **الحل:** إزالة `splitVendorChunk` أو التحويل إلى function form

### 3. تحذيرات أمان Supabase (linter)
- Security Definer View
- Function Search Path Mutable (2 functions)
- Public Bucket Allows Listing (3 buckets)
- Leaked Password Protection Disabled

**الحل:** إنشاء migration لإصلاح الـ views والـ functions، وتقييد listing على الـ buckets العامة

---

## التنفيذ

| # | الإصلاح | الملف |
|---|---------|-------|
| 1 | إضافة `forwardRef` لـ Badge | `badge.tsx` |
| 2 | إصلاح `splitVendorChunk` | `vite.config.ts` |
| 3 | إصلاح Security Definer View + Function Search Path | Migration SQL |
| 4 | تقييد bucket listing policies | Migration SQL |

