-- ============================================================
-- storage-buckets-policies.sql
-- ملف شامل لإنشاء جميع Storage Buckets + RLS Policies
-- ============================================================
--
-- الاستخدام:
--   1. افتح Supabase Dashboard → SQL Editor
--   2. انسخ محتوى هذا الملف
--   3. اضغط RUN
--
-- ملاحظات:
--   - الملف آمن للتشغيل عدة مرات (idempotent)
--   - يحذف جميع السياسات القديمة قبل إنشاء الجديدة
--   - يتعامل مع السياسات المكررة تلقائياً
--
-- ============================================================

------------------------------------------------------------
-- 0) تنظيف جميع السياسات القديمة من storage.objects
------------------------------------------------------------

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
  
  -- تنظيف سياسات storage.buckets أيضاً
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'buckets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.buckets', pol.policyname);
  END LOOP;
  
  RAISE NOTICE 'All old storage policies have been removed.';
END $$;

------------------------------------------------------------
-- 1) الدوال المساعدة المطلوبة
------------------------------------------------------------

-- دالة التحقق من الدور
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- دالة التحقق من صلاحيات الأدمن (مع parameter)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'team_leader')
$$;

-- دالة التحقق من صلاحيات الأدمن (بدون parameter - للاستخدام المباشر)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin(auth.uid());
$$;

-- دالة التحقق من ملكية الطلب
CREATE OR REPLACE FUNCTION public.is_request_owner(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = p_request_id
      AND r.user_id = auth.uid()
  );
$$;

-- دالة التحقق من تعيين الفريلانسر للطلب
CREATE OR REPLACE FUNCTION public.is_request_assigned_to_freelancer(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = p_request_id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  );
$$;

-- دالة التحقق من إمكانية عرض الطلب
CREATE OR REPLACE FUNCTION public.can_view_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin(auth.uid())
      OR public.is_request_owner(p_request_id)
      OR public.is_request_assigned_to_freelancer(p_request_id);
$$;

-- دالة التحقق من صلاحية قراءة ملفات الطلبات
CREATE OR REPLACE FUNCTION public.can_read_request_file(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_kind text;
  v_request_id uuid;
BEGIN
  -- Expected patterns:
  --   {userId}/requests/{requestId}/...
  --   {userId}/deliveries/{requestId}/...
  v_kind := split_part(p_object_name, '/', 2);
  IF v_kind NOT IN ('requests', 'deliveries') THEN
    RETURN false;
  END IF;

  BEGIN
    v_request_id := split_part(p_object_name, '/', 3)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  RETURN public.can_view_request(v_request_id);
END;
$$;

-- دالة التحقق من صلاحية قراءة ملفات التدريب
CREATE OR REPLACE FUNCTION public.can_read_training_file(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin(auth.uid())
      OR split_part(p_object_name, '/', 1) = auth.uid()::text;
$$;

------------------------------------------------------------
-- 1) إنشاء الـ Buckets
------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('request-files', 'request-files', false),
  ('training-files', 'training-files', false),
  ('identity-documents', 'identity-documents', false),
  ('course-resources', 'course-resources', true),
  ('brand-assets', 'brand-assets', false),
  ('deliveries', 'deliveries', false),
  ('portfolio-assets', 'portfolio-assets', true)
ON CONFLICT (id) DO UPDATE
SET
  name   = EXCLUDED.name,
  public = EXCLUDED.public;

------------------------------------------------------------
-- 2) تفعيل RLS على جداول التخزين
------------------------------------------------------------

DO $$
BEGIN
  EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot enable RLS on storage.objects - insufficient privileges';
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot enable RLS on storage.buckets - insufficient privileges';
END $$;

------------------------------------------------------------
-- 3) سياسات storage.buckets
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins manage all buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Anyone can list public buckets" ON storage.buckets;

CREATE POLICY "Admins manage all buckets"
ON storage.buckets
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can list public buckets"
ON storage.buckets
FOR SELECT
TO public
USING (public = true);

------------------------------------------------------------
-- 4) سياسات storage.objects - avatars (عام)
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins full access avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- الأدمن: وصول كامل
CREATE POLICY "Admins full access avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'avatars' AND public.is_admin(auth.uid()));

-- الجميع يمكنهم القراءة (باكيت عام)
CREATE POLICY "Public read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- المستخدم يرفع صورته الخاصة
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- المستخدم يحدث صورته الخاصة
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- المستخدم يحذف صورته الخاصة
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

------------------------------------------------------------
-- 5) سياسات storage.objects - request-files (خاص)
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins full access request files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their request files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload request files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update request files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own request files" ON storage.objects;

-- الأدمن: وصول كامل
CREATE POLICY "Admins full access request files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'request-files' AND public.is_admin(auth.uid()));

-- المستخدمون يقرأون ملفات الطلبات المرتبطة بهم
CREATE POLICY "Users can read their request files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-files'
  AND public.can_read_request_file(name)
);

-- المستخدم يرفع ملفات في مجلده
CREATE POLICY "Users can upload request files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'request-files'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- المستخدم يحدث ملفاته
CREATE POLICY "Users can update request files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'request-files'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- المستخدم يحذف ملفاته
CREATE POLICY "Users can delete own request files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'request-files'
  AND split_part(name, '/', 1) = auth.uid()::text
);

------------------------------------------------------------
-- 6) سياسات storage.objects - training-files (خاص)
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins full access training files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read training files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own training files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own training files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own training files" ON storage.objects;

-- الأدمن: وصول كامل
CREATE POLICY "Admins full access training files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'training-files' AND public.is_admin(auth.uid()));

-- المستخدم يقرأ ملفات التدريب الخاصة به أو العامة
CREATE POLICY "Users can read training files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-files'
  AND public.can_read_training_file(name)
);

-- المستخدم يرفع ملفات التدريب في مجلده
CREATE POLICY "Users can upload own training files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-files'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- المستخدم يحدث ملفاته
CREATE POLICY "Users can update own training files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-files'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- المستخدم يحذف ملفاته
CREATE POLICY "Users can delete own training files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-files'
  AND split_part(name, '/', 1) = auth.uid()::text
);

------------------------------------------------------------
-- 7) سياسات storage.objects - identity-documents (خاص - حساس)
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins full access identity docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own identity docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own identity docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own identity docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own identity docs" ON storage.objects;

-- الأدمن: وصول كامل لمراجعة وثائق الهوية
CREATE POLICY "Admins full access identity docs"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'identity-documents' AND public.is_admin(auth.uid()));

-- المستخدم يقرأ وثائقه فقط
CREATE POLICY "Users can read own identity docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- المستخدم يرفع وثائقه فقط
CREATE POLICY "Users can upload own identity docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- المستخدم يحدث وثائقه
CREATE POLICY "Users can update own identity docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- المستخدم يحذف وثائقه
CREATE POLICY "Users can delete own identity docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

------------------------------------------------------------
-- 8) سياسات storage.objects - course-resources (عام للقراءة)
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins full access course resources" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage course resources" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read course resources" ON storage.objects;

-- الأدمن: وصول كامل للإدارة
CREATE POLICY "Admins full access course resources"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'course-resources' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'course-resources' AND public.is_admin(auth.uid()));

-- الجميع يمكنهم قراءة موارد الكورسات
CREATE POLICY "Anyone can read course resources"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-resources');

------------------------------------------------------------
-- 9) سياسات storage.objects - brand-assets (خاص)
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins full access brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Read brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Upload brand assets" ON storage.objects;

-- الأدمن: وصول كامل
CREATE POLICY "Admins full access brand assets"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'brand-assets' AND public.is_admin(auth.uid()));

-- المستخدم يقرأ أصول براندته (بناءً على user_id أو brand_id)
CREATE POLICY "Users can read own brand assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id::text = split_part(name, '/', 2)
        AND b.user_id = auth.uid()
    )
  )
);

-- المستخدم يرفع أصول براندته
CREATE POLICY "Users can upload own brand assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id::text = split_part(name, '/', 2)
        AND b.user_id = auth.uid()
    )
  )
);

-- المستخدم يحدث أصول براندته
CREATE POLICY "Users can update own brand assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id::text = split_part(name, '/', 2)
        AND b.user_id = auth.uid()
    )
  )
);

-- المستخدم يحذف أصول براندته
CREATE POLICY "Users can delete own brand assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id::text = split_part(name, '/', 2)
        AND b.user_id = auth.uid()
    )
  )
);

------------------------------------------------------------
-- 10) سياسات storage.objects - deliveries (خاص)
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins full access deliveries" ON storage.objects;
DROP POLICY IF EXISTS "Users can read delivery files for visible requests" ON storage.objects;
DROP POLICY IF EXISTS "Read delivery files" ON storage.objects;
DROP POLICY IF EXISTS "Freelancers can upload delivery files" ON storage.objects;
DROP POLICY IF EXISTS "Upload delivery files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update delivery files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete delivery files" ON storage.objects;

-- الأدمن: وصول كامل
CREATE POLICY "Admins full access deliveries"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'deliveries' AND public.is_admin(auth.uid()));

-- المستخدمون يقرأون ملفات التسليم للطلبات المرتبطة بهم
CREATE POLICY "Users can read delivery files for visible requests"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deliveries'
  AND (
    public.can_read_request_file(name)
    OR (
      split_part(name, '/', 2) IN ('requests', 'deliveries')
      AND EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id = split_part(name, '/', 3)::uuid
          AND (
            r.user_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.assignments a
              WHERE a.request_id = r.id
                AND a.freelancer_id = auth.uid()
                AND a.is_active = true
            )
          )
      )
    )
  )
);

-- الفريلانسرز يرفعون ملفات التسليم
CREATE POLICY "Freelancers can upload delivery files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deliveries'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- الفريلانسر يحدث ملفاته
CREATE POLICY "Users can update delivery files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deliveries'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- الفريلانسر يحذف ملفاته
CREATE POLICY "Users can delete delivery files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deliveries'
  AND split_part(name, '/', 1) = auth.uid()::text
);

------------------------------------------------------------
-- 11) سياسات storage.objects - portfolio-assets (عام للقراءة)
------------------------------------------------------------

DROP POLICY IF EXISTS "Admins full access portfolio assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read portfolio assets" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio assets: owner can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own portfolio assets" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio assets: owner can update" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio assets: owner can delete" ON storage.objects;

-- الأدمن: وصول كامل
CREATE POLICY "Admins full access portfolio assets"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'portfolio-assets' AND public.is_admin(auth.uid()));

-- الجميع يمكنهم رؤية البورتفوليو
CREATE POLICY "Public read portfolio assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'portfolio-assets');

-- المالك يرفع ملفات بورتفوليو
CREATE POLICY "Portfolio assets: owner can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- المالك يحدث ملفات بورتفوليو
CREATE POLICY "Portfolio assets: owner can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portfolio-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- المالك يحذف ملفات بورتفوليو
CREATE POLICY "Portfolio assets: owner can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'portfolio-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

------------------------------------------------------------
-- 12) التحقق النهائي من وجود الدوال
------------------------------------------------------------

DO $$
DECLARE
  missing_functions text := '';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    missing_functions := missing_functions || 'is_admin, ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    missing_functions := missing_functions || 'has_role, ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_read_request_file'
  ) THEN
    missing_functions := missing_functions || 'can_read_request_file, ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_read_training_file'
  ) THEN
    missing_functions := missing_functions || 'can_read_training_file, ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_view_request'
  ) THEN
    missing_functions := missing_functions || 'can_view_request, ';
  END IF;

  IF missing_functions <> '' THEN
    RAISE WARNING 'Missing helper functions: %. Storage policies may not work correctly!', rtrim(missing_functions, ', ');
  END IF;
END $$;

------------------------------------------------------------
-- ✅ تم بنجاح!
------------------------------------------------------------
--
-- ملخص الباكيتس (8 باكيتس):
-- ┌────────────────────┬─────────┬────────────────────────────────────┐
-- │ Bucket             │ Public  │ الوصف                              │
-- ├────────────────────┼─────────┼────────────────────────────────────┤
-- │ avatars            │ ✅ Yes  │ صور الملفات الشخصية                │
-- │ portfolio-assets   │ ✅ Yes  │ ملفات البورتفوليو العامة           │
-- │ course-resources   │ ✅ Yes  │ موارد الكورسات التعليمية           │
-- │ request-files      │ ❌ No   │ ملفات الطلبات (خاص)                │
-- │ training-files     │ ❌ No   │ ملفات التدريب (خاص)                │
-- │ identity-documents │ ❌ No   │ وثائق الهوية (حساس جداً)           │
-- │ brand-assets       │ ❌ No   │ أصول البراند (خاص)                 │
-- │ deliveries         │ ❌ No   │ ملفات التسليم (خاص)                │
-- └────────────────────┴─────────┴────────────────────────────────────┘
--
-- ملخص السياسات لكل باكيت:
-- ┌────────────────────┬────────┬────────┬────────┬────────┬────────┐
-- │ Bucket             │ SELECT │ INSERT │ UPDATE │ DELETE │ ALL    │
-- ├────────────────────┼────────┼────────┼────────┼────────┼────────┤
-- │ avatars            │ Public │ Owner  │ Owner  │ Owner  │ Admin  │
-- │ portfolio-assets   │ Public │ Owner  │ Owner  │ Owner  │ Admin  │
-- │ course-resources   │ Public │ -      │ -      │ -      │ Admin  │
-- │ request-files      │ Viewer │ Owner  │ Owner  │ Owner  │ Admin  │
-- │ training-files     │ Viewer │ Owner  │ Owner  │ Owner  │ Admin  │
-- │ identity-documents │ Owner  │ Owner  │ Owner  │ Owner  │ Admin  │
-- │ brand-assets       │ Owner  │ Owner  │ Owner  │ Owner  │ Admin  │
-- │ deliveries         │ Viewer │ Owner  │ Owner  │ Owner  │ Admin  │
-- └────────────────────┴────────┴────────┴────────┴────────┴────────┘
--
-- Legend:
--   Public = أي شخص (بدون تسجيل دخول)
--   Owner  = صاحب الملف فقط (auth.uid = folder[1])
--   Viewer = من لديه صلاحية عرض الطلب المرتبط
--   Admin  = الأدمن فقط (is_admin = true)
--
-- الدوال المساعدة المضمنة:
--   ✓ public.is_admin(uuid)
--   ✓ public.has_role(uuid, app_role)
--   ✓ public.is_request_owner(uuid)
--   ✓ public.is_request_assigned_to_freelancer(uuid)
--   ✓ public.can_view_request(uuid)
--   ✓ public.can_read_request_file(text)
--   ✓ public.can_read_training_file(text)
--
------------------------------------------------------------
