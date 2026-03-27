-- RLS policies extension file (2nd part)
-- This file contains the additional RLS policies that were added
-- via migrations for the remaining tables and storage buckets.

-- NEWSLETTER SUBSCRIBERS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins manage newsletter subscribers"
ON public.newsletter_subscribers
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage notifications"
ON public.notifications
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own orders"
ON public.orders
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users create own orders"
ON public.orders
FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage all orders"
ON public.orders
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- ORDER ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Admins manage order items"
ON public.order_items
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- PLANS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active plans"
ON public.plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage plans"
ON public.plans
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active products"
ON public.products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage products"
ON public.products
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- REQUESTS
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own requests"
ON public.requests
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR public.is_request_owner(id)
  OR public.is_request_assigned_to_freelancer(id)
);

CREATE POLICY "Clients create own requests"
ON public.requests
FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage all requests"
ON public.requests
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- PROJECT TASKS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View related project tasks"
ON public.project_tasks
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR freelancer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = project_tasks.request_id
      AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Freelancers update own project tasks"
ON public.project_tasks
FOR UPDATE
USING (
  freelancer_id = auth.uid() OR public.is_admin(auth.uid())
)
WITH CHECK (
  freelancer_id = auth.uid() OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins manage project tasks"
ON public.project_tasks
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- REFERRALS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referrals"
ON public.referrals
FOR SELECT
USING (referrer_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage referrals"
ON public.referrals
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- REFERRAL REWARDS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral rewards"
ON public.referral_rewards
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage referral rewards"
ON public.referral_rewards
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- SITE SETTINGS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site settings"
ON public.site_settings
FOR SELECT
USING (COALESCE(is_public, false) = true);

CREATE POLICY "Admins manage site settings"
ON public.site_settings
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- SUPPORT TICKETS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tickets"
ON public.support_tickets
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users create own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users update own tickets"
ON public.support_tickets
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage tickets"
ON public.support_tickets
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- TICKET REPLIES
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read replies of own tickets"
ON public.ticket_replies
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_replies.ticket_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users create replies on own tickets"
ON public.ticket_replies
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_replies.ticket_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage ticket replies"
ON public.ticket_replies
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read related tasks"
ON public.tasks
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "Users update own tasks"
ON public.tasks
FOR UPDATE
USING (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "Admins manage tasks"
ON public.tasks
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- TELEGRAM TABLES (admin-only)
ALTER TABLE public.telegram_bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage telegram bot messages"
ON public.telegram_bot_messages
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage telegram link codes"
ON public.telegram_link_codes
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage telegram links"
ON public.telegram_links
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage telegram messages log"
ON public.telegram_messages_log
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- TESTIMONIALS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read testimonials"
ON public.testimonials
FOR SELECT
USING (true);

CREATE POLICY "Admins manage testimonials"
ON public.testimonials
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- TRAINING TABLES
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_track_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Freelancers see own training assignments"
ON public.training_assignments
FOR SELECT
USING (freelancer_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage training assignments"
ON public.training_assignments
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public read active training tasks"
ON public.training_tasks
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage training tasks"
ON public.training_tasks
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users read own lesson progress"
ON public.user_lesson_progress
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users update own lesson progress"
ON public.user_lesson_progress
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage lesson progress"
ON public.user_lesson_progress
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users read own track progress"
ON public.user_track_progress
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users update own track progress"
ON public.user_track_progress
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage track progress"
ON public.user_track_progress
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- USER ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user roles"
ON public.user_roles
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- WALLET & WITHDRAWALS
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wallet ledger"
ON public.wallet_ledger
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage wallet ledger"
ON public.wallet_ledger
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users read own withdrawals"
ON public.withdrawals
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users create own withdrawals"
ON public.withdrawals
FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage withdrawals"
ON public.withdrawals
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- STORAGE BUCKETS & OBJECTS
-- NOTE: Wrapped in DO block with privilege fallback so it doesn't fail with
-- "must be owner of table objects" (42501) on environments where storage
-- tables are owned by the platform.
DO $$
BEGIN
  -- Enable RLS on storage tables where we have permission
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege THEN
    -- If we are not the owner, skip enabling RLS here
    NULL;
  END;

  -- Buckets list restriction
  BEGIN
    CREATE POLICY "Restrict storage buckets to known ones"
    ON storage.buckets
    FOR SELECT
    USING (id IN ('request-files', 'training-files', 'identity-documents', 'course-resources', 'brand-assets', 'deliveries', 'avatars'));

    CREATE POLICY "Admins manage storage buckets"
    ON storage.buckets
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  EXCEPTION WHEN insufficient_privilege THEN
    -- No ownership on storage.buckets: skip silently
    NULL;
  END;

  -- Request files
  BEGIN
    CREATE POLICY "Request files readable by allowed users"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'request-files'
      AND (
        public.is_admin(auth.uid())
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

    CREATE POLICY "Users upload request files to own folder"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'request-files'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Training files
  BEGIN
    CREATE POLICY "Read training files"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'training-files'
      AND (
        public.is_admin(auth.uid())
        OR split_part(name, '/', 1) = auth.uid()::text
      )
    );

    CREATE POLICY "Upload training files"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'training-files'
      AND (public.is_admin(auth.uid()) OR split_part(name, '/', 1) = auth.uid()::text)
    );
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Identity documents
  BEGIN
    CREATE POLICY "Read own identity documents"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'identity-documents'
      AND (public.is_admin(auth.uid()) OR split_part(name, '/', 1) = auth.uid()::text)
    );

    CREATE POLICY "Upload own identity documents"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'identity-documents'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Course resources
  BEGIN
    CREATE POLICY "Public read course resources"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'course-resources');

    CREATE POLICY "Admins manage course resources"
    ON storage.objects
    FOR ALL
    USING (bucket_id = 'course-resources' AND public.is_admin(auth.uid()))
    WITH CHECK (bucket_id = 'course-resources' AND public.is_admin(auth.uid()));
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Brand assets
  BEGIN
    CREATE POLICY "Read brand assets"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'brand-assets'
      AND (
        public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.brands b
          WHERE b.id::text = split_part(name, '/', 2)
            AND b.user_id = auth.uid()
        )
      )
    );

    CREATE POLICY "Upload brand assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'brand-assets'
      AND (
        public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.brands b
          WHERE b.id::text = split_part(name, '/', 2)
            AND b.user_id = auth.uid()
        )
      )
    );
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Deliveries
  BEGIN
    CREATE POLICY "Read delivery files"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'deliveries'
      AND (
        public.is_admin(auth.uid())
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

    CREATE POLICY "Upload delivery files"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'deliveries'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
