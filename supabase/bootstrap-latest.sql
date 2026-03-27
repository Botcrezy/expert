-- =====================================================
-- Sity Experts - One-shot Bootstrap (psql)
-- =====================================================
-- الهدف: تشغيل المنصة كاملة (Schema + Seed + Storage Buckets/Policies)
-- في خطوة واحدة عن طريق psql.
--
-- ملاحظة: هذا الملف يستخدم أوامر psql (\i) لذلك لا يعمل داخل SQL Editor.
--
-- الاستخدام المقترح:
--   psql "<DB_URL>" -f supabase/bootstrap-latest.sql
--
-- =====================================================

\set ON_ERROR_STOP off

-- 1) Schema + Functions + Triggers + RLS + Views + Initial data
\i supabase/complete-schema.sql

-- 2) Extra seed data (CMS pages + extra settings)
\i supabase/restore-schema.sql

-- 3) Latest custom migrations (keeps schema up-to-date)
\i supabase/custom-migrations-export.sql

-- 4) Storage buckets + storage.objects policies
\i supabase/storage-buckets-policies.sql

-- =====================================================
-- ✅ DONE
-- =====================================================
