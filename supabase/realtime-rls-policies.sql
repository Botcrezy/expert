-- ============================================================
-- RLS POLICIES FOR REALTIME ACCESS
-- ============================================================
-- Run this after enabling realtime on tables.
--
-- NOTE: Admin checks use security-definer function public.is_admin()
-- (which checks public.user_roles safely).
-- ============================================================

-- ------------------------------------------------------------
-- MESSAGES TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_messages_select" ON public.messages;
CREATE POLICY "realtime_messages_select" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.requests r
            WHERE r.id = messages.request_id
              AND r.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.request_id = messages.request_id
              AND a.freelancer_id = auth.uid()
              AND a.is_active = true
        )
        OR
        public.is_admin()
    );

-- ------------------------------------------------------------
-- NOTIFICATIONS TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_notifications_select" ON public.notifications;
CREATE POLICY "realtime_notifications_select" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- SUPPORT MESSAGES TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_support_messages_select" ON public.support_messages;
CREATE POLICY "realtime_support_messages_select" ON public.support_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.support_conversations sc
            WHERE sc.id = support_messages.conversation_id
              AND sc.user_id = auth.uid()
        )
        OR
        public.is_admin()
    );

-- ------------------------------------------------------------
-- REQUESTS TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_requests_select" ON public.requests;
CREATE POLICY "realtime_requests_select" ON public.requests
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.request_id = requests.id
              AND a.freelancer_id = auth.uid()
              AND a.is_active = true
        )
        OR
        public.is_admin()
    );

-- ------------------------------------------------------------
-- ASSIGNMENTS TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_assignments_select" ON public.assignments;
CREATE POLICY "realtime_assignments_select" ON public.assignments
    FOR SELECT
    USING (
        freelancer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.requests r
            WHERE r.id = assignments.request_id
              AND r.user_id = auth.uid()
        )
        OR
        public.is_admin()
    );

-- ------------------------------------------------------------
-- DELIVERIES TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_deliveries_select" ON public.deliveries;
CREATE POLICY "realtime_deliveries_select" ON public.deliveries
    FOR SELECT
    USING (
        freelancer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.requests r
            WHERE r.id = deliveries.request_id
              AND r.user_id = auth.uid()
        )
        OR
        public.is_admin()
    );

-- ------------------------------------------------------------
-- CREDITS LEDGER TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_credits_ledger_select" ON public.credits_ledger;
CREATE POLICY "realtime_credits_ledger_select" ON public.credits_ledger
    FOR SELECT
    USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- CLIENT SUBSCRIPTIONS TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_client_subscriptions_select" ON public.client_subscriptions;
CREATE POLICY "realtime_client_subscriptions_select" ON public.client_subscriptions
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- FREELANCER PROFILES TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_freelancer_profiles_select" ON public.freelancer_profiles;
CREATE POLICY "realtime_freelancer_profiles_select" ON public.freelancer_profiles
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_verified = true
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- PROFILES TABLE (contains PII -> not public)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_profiles_select" ON public.profiles;
CREATE POLICY "realtime_profiles_select" ON public.profiles
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- ORDERS TABLE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_orders_select" ON public.orders;
CREATE POLICY "realtime_orders_select" ON public.orders
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- BRAND TABLES
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_brands_select" ON public.brands;
CREATE POLICY "realtime_brands_select" ON public.brands
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.brand_assignments ba
            WHERE ba.brand_id = brands.id
              AND ba.freelancer_id = auth.uid()
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "realtime_brand_tasks_select" ON public.brand_tasks;
CREATE POLICY "realtime_brand_tasks_select" ON public.brand_tasks
    FOR SELECT
    USING (
        freelancer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.brands b
            WHERE b.id = brand_tasks.brand_id
              AND b.user_id = auth.uid()
        )
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- PAYMENT COLLECTION INVOICES
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_payment_collection_invoices_select" ON public.payment_collection_invoices;
CREATE POLICY "realtime_payment_collection_invoices_select" ON public.payment_collection_invoices
    FOR SELECT
    USING (
        freelancer_id = auth.uid()
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- TELEGRAM LINKS
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_telegram_links_select" ON public.telegram_links;
CREATE POLICY "realtime_telegram_links_select" ON public.telegram_links
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- SITE SETTINGS (Public read)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_site_settings_select" ON public.site_settings;
CREATE POLICY "realtime_site_settings_select" ON public.site_settings
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "realtime_header_footer_settings_select" ON public.header_footer_settings;
CREATE POLICY "realtime_header_footer_settings_select" ON public.header_footer_settings
    FOR SELECT
    USING (true);

-- ------------------------------------------------------------
-- IDENTITY VERIFICATIONS (PII -> owner or admin)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_identity_verifications_select" ON public.identity_verifications;
CREATE POLICY "realtime_identity_verifications_select" ON public.identity_verifications
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- COURSE ENROLLMENTS
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_course_enrollments_select" ON public.course_enrollments;
CREATE POLICY "realtime_course_enrollments_select" ON public.course_enrollments
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_admin()
    );

-- ------------------------------------------------------------
-- LESSON COMMENTS
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "realtime_lesson_comments_select" ON public.lesson_comments;
CREATE POLICY "realtime_lesson_comments_select" ON public.lesson_comments
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            JOIN public.learning_modules lm ON lm.track_id = ce.track_id
            JOIN public.learning_lessons ll ON ll.module_id = lm.id
            WHERE ll.id = lesson_comments.lesson_id
              AND ce.user_id = auth.uid()
        )
        OR public.is_admin()
    );
