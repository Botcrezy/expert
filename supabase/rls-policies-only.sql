-- rls-policies-only.sql
-- This file contains ONLY Row Level Security (RLS) setup for the platform.
-- You can run it safely multiple times on any project – it will drop / recreate
-- policies and (re)create helper functions used by those policies.

-----------------------------
-- Helper functions (idempotent)
-----------------------------

-- Roles helper – relies on existing public.app_role enum and public.user_roles table
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'team_leader');
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(_user_id, 'team_leader');
$$;

CREATE OR REPLACE FUNCTION public.is_freelancer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(_user_id, 'freelancer');
$$;

CREATE OR REPLACE FUNCTION public.is_client(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(_user_id, 'client');
$$;

-- Check if request is assigned to current freelancer
CREATE OR REPLACE FUNCTION public.is_request_assigned_to_freelancer(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = p_request_id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  );
$$;

-- Check if current user owns the request
CREATE OR REPLACE FUNCTION public.is_request_owner(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = p_request_id
      AND r.user_id = auth.uid()
  );
$$;

-- High‑level helper: can current user see this request?
CREATE OR REPLACE FUNCTION public.can_view_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.is_admin(auth.uid())
      OR public.is_request_owner(p_request_id)
      OR public.is_request_assigned_to_freelancer(p_request_id);
$$;

-----------------------------
-- assignments
-----------------------------
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.assignments;
CREATE POLICY "Admins can manage all assignments"
ON public.assignments
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.assignments;
CREATE POLICY "Admins can manage assignments"
ON public.assignments
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Freelancers can update only own assignments" ON public.assignments;
CREATE POLICY "Freelancers can update only own assignments"
ON public.assignments
FOR UPDATE
TO authenticated
USING (auth.uid() = freelancer_id)
WITH CHECK (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can view only own assignments" ON public.assignments;
CREATE POLICY "Freelancers can view only own assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can view own assignments" ON public.assignments;
CREATE POLICY "Freelancers can view own assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Users can view related assignments" ON public.assignments;
CREATE POLICY "Users can view related assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING ((freelancer_id = auth.uid()) OR is_admin(auth.uid()) OR is_request_owner(request_id));

-----------------------------
-- audit_logs
-----------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can create audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can create audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-----------------------------
-- brand_assignments
-----------------------------
ALTER TABLE public.brand_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all brand assignments" ON public.brand_assignments;
CREATE POLICY "Admins can manage all brand assignments"
ON public.brand_assignments
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Freelancers can view their brand assignments" ON public.brand_assignments;
CREATE POLICY "Freelancers can view their brand assignments"
ON public.brand_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

-----------------------------
-- brand_deliveries
-----------------------------
ALTER TABLE public.brand_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all brand deliveries" ON public.brand_deliveries;
CREATE POLICY "Admins can manage all brand deliveries"
ON public.brand_deliveries
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view approved deliveries" ON public.brand_deliveries;
CREATE POLICY "Clients can view approved deliveries"
ON public.brand_deliveries
FOR SELECT
TO authenticated
USING (
  is_visible_to_client = true
  AND EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_deliveries.brand_id
      AND brands.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Freelancers can create brand deliveries" ON public.brand_deliveries;
CREATE POLICY "Freelancers can create brand deliveries"
ON public.brand_deliveries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can view their brand deliveries" ON public.brand_deliveries;
CREATE POLICY "Freelancers can view their brand deliveries"
ON public.brand_deliveries
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

-----------------------------
-- brand_goals
-----------------------------
ALTER TABLE public.brand_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all brand goals" ON public.brand_goals;
CREATE POLICY "Admins can manage all brand goals"
ON public.brand_goals
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage their brand goals" ON public.brand_goals;
CREATE POLICY "Users can manage their brand goals"
ON public.brand_goals
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_goals.brand_id
      AND brands.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their brand goals" ON public.brand_goals;
CREATE POLICY "Users can view their brand goals"
ON public.brand_goals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_goals.brand_id
      AND brands.user_id = auth.uid()
  )
);

-----------------------------
-- brand_invoices
-----------------------------
ALTER TABLE public.brand_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all brand invoices" ON public.brand_invoices;
CREATE POLICY "Admins can manage all brand invoices"
ON public.brand_invoices
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their brand invoices" ON public.brand_invoices;
CREATE POLICY "Users can view their brand invoices"
ON public.brand_invoices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- brand_notes
-----------------------------
ALTER TABLE public.brand_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all brand notes" ON public.brand_notes;
CREATE POLICY "Admins can manage all brand notes"
ON public.brand_notes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view notes for their brands" ON public.brand_notes;
CREATE POLICY "Users can view notes for their brands"
ON public.brand_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_notes.brand_id
      AND brands.user_id = auth.uid()
  )
);

-----------------------------
-- brand_tasks
-----------------------------
ALTER TABLE public.brand_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all brand tasks" ON public.brand_tasks;
CREATE POLICY "Admins can manage all brand tasks"
ON public.brand_tasks
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view their brand tasks" ON public.brand_tasks;
CREATE POLICY "Clients can view their brand tasks"
ON public.brand_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = brand_tasks.brand_id
      AND brands.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Freelancers can update their assigned brand tasks" ON public.brand_tasks;
CREATE POLICY "Freelancers can update their assigned brand tasks"
ON public.brand_tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can view their assigned brand tasks" ON public.brand_tasks;
CREATE POLICY "Freelancers can view their assigned brand tasks"
ON public.brand_tasks
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

-----------------------------
-- brands
-----------------------------
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
CREATE POLICY "Admins can manage brands"
ON public.brands
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all brands" ON public.brands;
CREATE POLICY "Admins can update all brands"
ON public.brands
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all brands" ON public.brands;
CREATE POLICY "Admins can view all brands"
ON public.brands
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can create brands" ON public.brands;
CREATE POLICY "Users can create brands"
ON public.brands
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own brands" ON public.brands;
CREATE POLICY "Users can create their own brands"
ON public.brands
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own brands" ON public.brands;
CREATE POLICY "Users can update own brands"
ON public.brands
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
CREATE POLICY "Users can update their own brands"
ON public.brands
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own brands" ON public.brands;
CREATE POLICY "Users can view own brands"
ON public.brands
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;
CREATE POLICY "Users can view their own brands"
ON public.brands
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- categories
-----------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
CREATE POLICY "Anyone can view active categories"
ON public.categories
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- client_subscriptions
-----------------------------
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.client_subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
ON public.client_subscriptions
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.client_subscriptions;
CREATE POLICY "Admins can manage subscriptions"
ON public.client_subscriptions
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.client_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON public.client_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- cms_pages
-----------------------------
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all pages" ON public.cms_pages;
CREATE POLICY "Admins can manage all pages"
ON public.cms_pages
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage cms pages" ON public.cms_pages;
CREATE POLICY "Admins can manage cms pages"
ON public.cms_pages
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read published pages" ON public.cms_pages;
CREATE POLICY "Anyone can read published pages"
ON public.cms_pages
FOR SELECT
TO authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "Anyone can view published pages" ON public.cms_pages;
CREATE POLICY "Anyone can view published pages"
ON public.cms_pages
FOR SELECT
TO authenticated
USING (is_published = true);

-----------------------------
-- cms_sections
-----------------------------
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage cms sections" ON public.cms_sections;
CREATE POLICY "Admins can manage cms sections"
ON public.cms_sections
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage sections" ON public.cms_sections;
CREATE POLICY "Admins can manage sections"
ON public.cms_sections
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read active sections" ON public.cms_sections;
CREATE POLICY "Anyone can read active sections"
ON public.cms_sections
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    page_id IS NULL
    OR EXISTS (
      SELECT 1 FROM cms_pages
      WHERE cms_pages.id = cms_sections.page_id
        AND cms_pages.is_published = true
    )
  )
);

DROP POLICY IF EXISTS "Anyone can view active sections" ON public.cms_sections;
CREATE POLICY "Anyone can view active sections"
ON public.cms_sections
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- coupon_redemptions
-----------------------------
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins can manage all redemptions"
ON public.coupon_redemptions
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins can manage redemptions"
ON public.coupon_redemptions
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own redemptions"
ON public.coupon_redemptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- coupons
-----------------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can view active coupons" ON public.coupons;
CREATE POLICY "Authenticated users can view active coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- course_enrollments
-----------------------------
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.course_enrollments;
CREATE POLICY "Admins can manage enrollments"
ON public.course_enrollments
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can view own enrollments"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ce_delete_admin" ON public.course_enrollments;
CREATE POLICY "ce_delete_admin"
ON public.course_enrollments
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "ce_insert_own" ON public.course_enrollments;
CREATE POLICY "ce_insert_own"
ON public.course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ce_select_admin" ON public.course_enrollments;
CREATE POLICY "ce_select_admin"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "ce_select_own" ON public.course_enrollments;
CREATE POLICY "ce_select_own"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ce_update_admin" ON public.course_enrollments;
CREATE POLICY "ce_update_admin"
ON public.course_enrollments
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-----------------------------
-- credits_ledger
-----------------------------
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage credits" ON public.credits_ledger;
CREATE POLICY "Admins can manage credits"
ON public.credits_ledger
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all credits" ON public.credits_ledger;
CREATE POLICY "Admins can view all credits"
ON public.credits_ledger
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete credits" ON public.credits_ledger;
CREATE POLICY "Only admins can delete credits"
ON public.credits_ledger
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can insert credits" ON public.credits_ledger;
CREATE POLICY "Only admins can insert credits"
ON public.credits_ledger
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can update credits" ON public.credits_ledger;
CREATE POLICY "Only admins can update credits"
ON public.credits_ledger
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own credits" ON public.credits_ledger;
CREATE POLICY "Users can view own credits"
ON public.credits_ledger
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- deliveries
-----------------------------
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all deliveries" ON public.deliveries;
CREATE POLICY "Admins can manage all deliveries"
ON public.deliveries
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view deliveries for their requests" ON public.deliveries;
CREATE POLICY "Clients can view deliveries for their requests"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM requests r
    WHERE r.id = deliveries.request_id
      AND r.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Freelancers can manage own deliveries" ON public.deliveries;
CREATE POLICY "Freelancers can manage own deliveries"
ON public.deliveries
FOR ALL
TO authenticated
USING (auth.uid() = freelancer_id);

-----------------------------
-- disputes
-----------------------------
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all disputes" ON public.disputes;
CREATE POLICY "Admins can manage all disputes"
ON public.disputes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage disputes" ON public.disputes;
CREATE POLICY "Admins can manage disputes"
ON public.disputes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can create disputes" ON public.disputes;
CREATE POLICY "Users can create disputes"
ON public.disputes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = opened_by);

DROP POLICY IF EXISTS "Users can view own disputes" ON public.disputes;
CREATE POLICY "Users can view own disputes"
ON public.disputes
FOR SELECT
TO authenticated
USING (auth.uid() = opened_by);

-----------------------------
-- freelancer_profiles
-----------------------------
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all freelancer profiles" ON public.freelancer_profiles;
CREATE POLICY "Admins can manage all freelancer profiles"
ON public.freelancer_profiles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Freelancers and admins can view profiles" ON public.freelancer_profiles;
CREATE POLICY "Freelancers and admins can view profiles"
ON public.freelancer_profiles
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Freelancers can insert own profile" ON public.freelancer_profiles;
CREATE POLICY "Freelancers can insert own profile"
ON public.freelancer_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Freelancers can manage their own profile" ON public.freelancer_profiles;
CREATE POLICY "Freelancers can manage their own profile"
ON public.freelancer_profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-----------------------------
-- header_footer_settings
-----------------------------
ALTER TABLE public.header_footer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage header footer" ON public.header_footer_settings;
CREATE POLICY "Admins can manage header footer"
ON public.header_footer_settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can modify header_footer_settings" ON public.header_footer_settings;
CREATE POLICY "Admins can modify header_footer_settings"
ON public.header_footer_settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read header_footer_settings" ON public.header_footer_settings;
CREATE POLICY "Anyone can read header_footer_settings"
ON public.header_footer_settings
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view active settings" ON public.header_footer_settings;
CREATE POLICY "Anyone can view active settings"
ON public.header_footer_settings
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- identity_verifications
-----------------------------
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage verifications" ON public.identity_verifications;
CREATE POLICY "Admins can manage verifications"
ON public.identity_verifications
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can create own verifications" ON public.identity_verifications;
CREATE POLICY "Users can create own verifications"
ON public.identity_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create verifications" ON public.identity_verifications;
CREATE POLICY "Users can create verifications"
ON public.identity_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending verifications" ON public.identity_verifications;
CREATE POLICY "Users can update own pending verifications"
ON public.identity_verifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can view own verifications" ON public.identity_verifications;
CREATE POLICY "Users can view own verifications"
ON public.identity_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "iv_insert_own" ON public.identity_verifications;
CREATE POLICY "iv_insert_own"
ON public.identity_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "iv_select_admin" ON public.identity_verifications;
CREATE POLICY "iv_select_admin"
ON public.identity_verifications
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "iv_select_own" ON public.identity_verifications;
CREATE POLICY "iv_select_own"
ON public.identity_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "iv_update_admin" ON public.identity_verifications;
CREATE POLICY "iv_update_admin"
ON public.identity_verifications
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-----------------------------
-- learning_lessons
-----------------------------
ALTER TABLE public.learning_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.learning_lessons;
CREATE POLICY "Admins can manage lessons"
ON public.learning_lessons
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active lessons" ON public.learning_lessons;
CREATE POLICY "Anyone can view active lessons"
ON public.learning_lessons
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- learning_modules
-----------------------------
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage modules" ON public.learning_modules;
CREATE POLICY "Admins can manage modules"
ON public.learning_modules
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active modules" ON public.learning_modules;
CREATE POLICY "Anyone can view active modules"
ON public.learning_modules
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- learning_tracks
-----------------------------
ALTER TABLE public.learning_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage tracks" ON public.learning_tracks;
CREATE POLICY "Admins can manage tracks"
ON public.learning_tracks
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active tracks" ON public.learning_tracks;
CREATE POLICY "Anyone can view active tracks"
ON public.learning_tracks
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- lesson_comments
-----------------------------
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON public.lesson_comments;
CREATE POLICY "Anyone can view comments"
ON public.lesson_comments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can add comments" ON public.lesson_comments;
CREATE POLICY "Authenticated users can add comments"
ON public.lesson_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.lesson_comments;
CREATE POLICY "Users can delete own comments"
ON public.lesson_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own comments" ON public.lesson_comments;
CREATE POLICY "Users can update own comments"
ON public.lesson_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- lesson_likes
-----------------------------
ALTER TABLE public.lesson_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view likes" ON public.lesson_likes;
CREATE POLICY "Anyone can view likes"
ON public.lesson_likes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can add likes" ON public.lesson_likes;
CREATE POLICY "Authenticated users can add likes"
ON public.lesson_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own likes" ON public.lesson_likes;
CREATE POLICY "Users can remove own likes"
ON public.lesson_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- messages
-----------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;
CREATE POLICY "Admins can manage all messages"
ON public.messages
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can send messages" ON public.messages;
CREATE POLICY "Admins can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid() AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can send messages for own requests" ON public.messages;
CREATE POLICY "Clients can send messages for own requests"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid() AND is_request_owner(request_id));

DROP POLICY IF EXISTS "Clients can view messages for own requests" ON public.messages;
CREATE POLICY "Clients can view messages for own requests"
ON public.messages
FOR SELECT
TO authenticated
USING (is_request_owner(request_id));

DROP POLICY IF EXISTS "Freelancers can send messages for assigned requests" ON public.messages;
CREATE POLICY "Freelancers can send messages for assigned requests"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM assignments a
    WHERE a.request_id = messages.request_id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  )
);

DROP POLICY IF EXISTS "Freelancers can view messages for assigned requests" ON public.messages;
CREATE POLICY "Freelancers can view messages for assigned requests"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignments a
    WHERE a.request_id = messages.request_id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (can_view_request(request_id));

DROP POLICY IF EXISTS "Users can view messages for their requests" ON public.messages;
CREATE POLICY "Users can view messages for their requests"
ON public.messages
FOR SELECT
TO authenticated
USING (can_view_request(request_id));

-----------------------------
-- navigation_items
-----------------------------
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage nav items" ON public.navigation_items;
CREATE POLICY "Admins can manage nav items"
ON public.navigation_items
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage navigation items" ON public.navigation_items;
CREATE POLICY "Admins can manage navigation items"
ON public.navigation_items
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active nav items" ON public.navigation_items;
CREATE POLICY "Anyone can view active nav items"
ON public.navigation_items
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Navigation items are viewable by everyone" ON public.navigation_items;
CREATE POLICY "Navigation items are viewable by everyone"
ON public.navigation_items
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- newsletter_subscribers
-----------------------------
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can manage newsletter subscribers"
ON public.newsletter_subscribers
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can view newsletter subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Authenticated users can subscribe"
ON public.newsletter_subscribers
FOR INSERT
TO authenticated
WITH CHECK (true);

-----------------------------
-- notifications
-----------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-----------------------------
-- order_items
-----------------------------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items"
ON public.order_items
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.order_items;
CREATE POLICY "Users can view order items for their orders"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
  )
);

-----------------------------
-- orders
-----------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-----------------------------
-- plans
-----------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans"
ON public.plans
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;
CREATE POLICY "Anyone can view active plans"
ON public.plans
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- products
-----------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- profiles
-----------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-----------------------------
-- project_tasks
-----------------------------
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage project tasks" ON public.project_tasks;
CREATE POLICY "Admins can manage project tasks"
ON public.project_tasks
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view project tasks for their requests" ON public.project_tasks;
CREATE POLICY "Clients can view project tasks for their requests"
ON public.project_tasks
FOR SELECT
TO authenticated
USING (can_view_request(request_id));

DROP POLICY IF EXISTS "Freelancers can view their project tasks" ON public.project_tasks;
CREATE POLICY "Freelancers can view their project tasks"
ON public.project_tasks
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Freelancers can update their project tasks" ON public.project_tasks;
CREATE POLICY "Freelancers can update their project tasks"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = freelancer_id)
WITH CHECK (auth.uid() = freelancer_id);

-----------------------------
-- referral_rewards
-----------------------------
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage referral rewards" ON public.referral_rewards;
CREATE POLICY "Admins can manage referral rewards"
ON public.referral_rewards
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own referral rewards" ON public.referral_rewards;
CREATE POLICY "Users can view own referral rewards"
ON public.referral_rewards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- referrals
-----------------------------
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage referrals" ON public.referrals;
CREATE POLICY "Admins can manage referrals"
ON public.referrals
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-----------------------------
-- requests
-----------------------------
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage requests" ON public.requests;
CREATE POLICY "Admins can manage requests"
ON public.requests
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage own requests" ON public.requests;
CREATE POLICY "Users can manage own requests"
ON public.requests
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Freelancers can view assigned requests" ON public.requests;
CREATE POLICY "Freelancers can view assigned requests"
ON public.requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.request_id = requests.id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  )
);

-----------------------------
-- settings
-----------------------------
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to settings" ON public.settings;
CREATE POLICY "Admins full access to settings"
ON public.settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read safe public settings" ON public.settings;
CREATE POLICY "Authenticated users can read safe public settings"
ON public.settings
FOR SELECT
TO authenticated
USING (is_public = true);

-----------------------------
-- site_settings
-----------------------------
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to site_settings" ON public.site_settings;
CREATE POLICY "Admins full access to site_settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view public site settings" ON public.site_settings;
CREATE POLICY "Anyone can view public site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (true);

-----------------------------
-- support_tickets
-----------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage support tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage support tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;
CREATE POLICY "Users can create support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- tasks
-----------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
CREATE POLICY "Admins can manage tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
CREATE POLICY "Users can view their tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- telegram_bot_messages
-----------------------------
ALTER TABLE public.telegram_bot_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage telegram bot messages" ON public.telegram_bot_messages;
CREATE POLICY "Admins can manage telegram bot messages"
ON public.telegram_bot_messages
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view telegram bot messages" ON public.telegram_bot_messages;
CREATE POLICY "Admins can view telegram bot messages"
ON public.telegram_bot_messages
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-----------------------------
-- telegram_link_codes
-----------------------------
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage telegram link codes" ON public.telegram_link_codes;
CREATE POLICY "Admins can manage telegram link codes"
ON public.telegram_link_codes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own telegram link codes" ON public.telegram_link_codes;
CREATE POLICY "Users can view own telegram link codes"
ON public.telegram_link_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- telegram_links
-----------------------------
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage telegram links" ON public.telegram_links;
CREATE POLICY "Admins can manage telegram links"
ON public.telegram_links
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own telegram links" ON public.telegram_links;
CREATE POLICY "Users can view own telegram links"
ON public.telegram_links
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- telegram_messages_log
-----------------------------
ALTER TABLE public.telegram_messages_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage telegram messages log" ON public.telegram_messages_log;
CREATE POLICY "Admins can manage telegram messages log"
ON public.telegram_messages_log
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view telegram messages log" ON public.telegram_messages_log;
CREATE POLICY "Admins can view telegram messages log"
ON public.telegram_messages_log
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-----------------------------
-- testimonials
-----------------------------
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
CREATE POLICY "Admins can manage testimonials"
ON public.testimonials
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view published testimonials" ON public.testimonials;
CREATE POLICY "Anyone can view published testimonials"
ON public.testimonials
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- ticket_replies
-----------------------------
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage ticket replies" ON public.ticket_replies;
CREATE POLICY "Admins can manage ticket replies"
ON public.ticket_replies
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view ticket replies for their tickets" ON public.ticket_replies;
CREATE POLICY "Users can view ticket replies for their tickets"
ON public.ticket_replies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_replies.ticket_id
      AND t.user_id = auth.uid()
  )
);

-----------------------------
-- training_assignments
-----------------------------
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage training assignments" ON public.training_assignments;
CREATE POLICY "Admins can manage training assignments"
ON public.training_assignments
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Freelancers can view their training assignments" ON public.training_assignments;
CREATE POLICY "Freelancers can view their training assignments"
ON public.training_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

-----------------------------
-- training_tasks
-----------------------------
ALTER TABLE public.training_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage training tasks" ON public.training_tasks;
CREATE POLICY "Admins can manage training tasks"
ON public.training_tasks
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active training tasks" ON public.training_tasks;
CREATE POLICY "Anyone can view active training tasks"
ON public.training_tasks
FOR SELECT
TO authenticated
USING (is_active = true);

-----------------------------
-- user_lesson_progress
-----------------------------
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage user lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Admins can manage user lesson progress"
ON public.user_lesson_progress
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can view own lesson progress"
ON public.user_lesson_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can update own lesson progress"
ON public.user_lesson_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-----------------------------
-- user_roles
-----------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can manage user roles" ON public.user_roles;
CREATE POLICY "Only admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view user roles" ON public.user_roles;
CREATE POLICY "Admins can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-----------------------------
-- user_track_progress
-----------------------------
ALTER TABLE public.user_track_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage user track progress" ON public.user_track_progress;
CREATE POLICY "Admins can manage user track progress"
ON public.user_track_progress
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own track progress" ON public.user_track_progress;
CREATE POLICY "Users can view own track progress"
ON public.user_track_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own track progress" ON public.user_track_progress;
CREATE POLICY "Users can update own track progress"
ON public.user_track_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-----------------------------
-- wallet_ledger
-----------------------------
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage wallet ledger" ON public.wallet_ledger;
CREATE POLICY "Admins can manage wallet ledger"
ON public.wallet_ledger
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own wallet ledger" ON public.wallet_ledger;
CREATE POLICY "Users can view own wallet ledger"
ON public.wallet_ledger
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- withdrawals
-----------------------------
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can manage withdrawals"
ON public.withdrawals
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-----------------------------
-- storage.buckets
-----------------------------
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all buckets" ON storage.buckets;
CREATE POLICY "Admins manage all buckets"
ON storage.buckets
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can list public buckets" ON storage.buckets;
CREATE POLICY "Anyone can list public buckets"
ON storage.buckets
FOR SELECT
TO public
USING (public = true);

-----------------------------
-- storage.objects (request-files)
-----------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access request files" ON storage.objects;
CREATE POLICY "Admins full access request files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'request-files' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read their request files" ON storage.objects;
CREATE POLICY "Users can read their request files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-files'
  AND public.can_read_request_file(name)
);

DROP POLICY IF EXISTS "Users can upload request files" ON storage.objects;
CREATE POLICY "Users can upload request files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'request-files'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-----------------------------
-- storage.objects (training-files)
-----------------------------
DROP POLICY IF EXISTS "Admins full access training files" ON storage.objects;
CREATE POLICY "Admins full access training files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'training-files' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read training files" ON storage.objects;
CREATE POLICY "Users can read training files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-files'
  AND public.can_read_training_file(name)
);

DROP POLICY IF EXISTS "Users can upload own training files" ON storage.objects;
CREATE POLICY "Users can upload own training files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-files'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-----------------------------
-- storage.objects (identity-documents)
-----------------------------
DROP POLICY IF EXISTS "Admins full access identity docs" ON storage.objects;
CREATE POLICY "Admins full access identity docs"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'identity-documents' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read own identity docs" ON storage.objects;
CREATE POLICY "Users can read own identity docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload own identity docs" ON storage.objects;
CREATE POLICY "Users can upload own identity docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-----------------------------
-- storage.objects (course-resources)
-----------------------------
DROP POLICY IF EXISTS "Admins full access course resources" ON storage.objects;
CREATE POLICY "Admins full access course resources"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'course-resources' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read course resources" ON storage.objects;
CREATE POLICY "Anyone can read course resources"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-resources');

-----------------------------
-- storage.objects (brand-assets)
-----------------------------
DROP POLICY IF EXISTS "Admins full access brand assets" ON storage.objects;
CREATE POLICY "Admins full access brand assets"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'brand-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read own brand assets" ON storage.objects;
CREATE POLICY "Users can read own brand assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload own brand assets" ON storage.objects;
CREATE POLICY "Users can upload own brand assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-----------------------------
-- storage.objects (deliveries)
-----------------------------
DROP POLICY IF EXISTS "Admins full access deliveries" ON storage.objects;
CREATE POLICY "Admins full access deliveries"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'deliveries' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read delivery files for visible requests" ON storage.objects;
CREATE POLICY "Users can read delivery files for visible requests"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deliveries'
  AND public.can_read_request_file(name)
);

DROP POLICY IF EXISTS "Freelancers can upload delivery files" ON storage.objects;
CREATE POLICY "Freelancers can upload delivery files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deliveries'
  AND split_part(name, '/', 1) = auth.uid()::text
);

