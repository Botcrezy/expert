-- ============================================================
-- إضافة Messages إلى Realtime Publication + تحسين السياسات
-- ============================================================

-- 1) تفعيل Realtime للرسائل
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 2) التأكد من وجود الدوال المساعدة (موجودة بالفعل في complete-schema.sql)
-- يمكن تجاهل الأخطاء إذا كانت موجودة

-- 3) حذف السياسات القديمة المكررة أو الزائدة
DROP POLICY IF EXISTS "Admins can send messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can send messages for own requests" ON public.messages;
DROP POLICY IF EXISTS "Clients can view messages for own requests" ON public.messages;
DROP POLICY IF EXISTS "Freelancers can send messages for assigned requests" ON public.messages;
DROP POLICY IF EXISTS "Freelancers can view messages for assigned requests" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages for their requests" ON public.messages;

-- 4) إنشاء سياسات RLS محسّنة للرسائل
-- سياسة SELECT: السماح بالقراءة للأدمن + مالك الطلب + الفريلانسر المعين
CREATE POLICY "Allow read messages for request participants"
ON public.messages
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_request_owner(request_id)
  OR public.is_request_assigned_to_freelancer(request_id)
);

-- سياسة INSERT: السماح بالإرسال للأدمن + مالك الطلب + الفريلانسر المعين
CREATE POLICY "Allow insert messages for request participants"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    public.is_admin(auth.uid())
    OR public.is_request_owner(request_id)
    OR public.is_request_assigned_to_freelancer(request_id)
  )
);