-- =====================================================
-- Sity Experts - Data Backup (LATEST)
-- =====================================================
-- الهدف:
-- هذا الملف صار "Bootstrap" موحّد يضمن تشغيل نفس ملفات المنصة الحالية
-- بدون ما ننسخ سكيمـا ضخمة هنا (وبالتالي بدون ما يتقادم بسرعة).
--
-- ✅ استخدمه فقط مع psql (لأن فيه أوامر \i).
-- ❌ لا يعمل داخل SQL Editor (لأن SQL Editor لا يدعم \i).
--
-- الاستخدام المقترح (psql):
--   psql "<DB_URL>" -f supabase/data-backup.sql
--
-- لو بتشتغل من SQL Editor:
--   شغّل الملفات بالترتيب التالي (بالكامل):
--     1) supabase/complete-schema.sql
--     2) supabase/restore-schema.sql
--     3) supabase/storage-buckets-policies.sql
--
-- ملاحظة مهمة عن الأخطاء الشائعة:
-- - لو قاعدة البيانات مش فاضية/فيها سكيمـا قديمة، ممكن يظهر تعارض في ENUMs/Views.
--   الأفضل دائمًا التشغيل على مشروع جديد/Database فاضية.
-- =====================================================

\set ON_ERROR_STOP off

-- 1) Schema + Functions + Triggers + RLS + Views + Initial data
\i supabase/complete-schema.sql

-- 2) Extra seed data (CMS pages + extra settings)
\i supabase/restore-schema.sql

-- 3) Storage buckets + storage.objects policies
\i supabase/storage-buckets-policies.sql

-- =====================================================
-- ✅ DONE
-- =====================================================


