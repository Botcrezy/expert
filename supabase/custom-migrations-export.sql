-- Custom migrations export (generated)
-- Use this file to apply the latest schema changes into a fresh project.
--
-- IMPORTANT:
-- - This file is designed to be idempotent (safe to run more than once).
-- - Prefer running it AFTER supabase/complete-schema.sql (+ restore-schema.sql if you use it).
--
-- Includes:
-- 1) order_items.request_id link to requests
-- 2) ensure freelancer role from freelancer_profiles
-- 3) auto-publish portfolio when identity verification approved (and is_public=true)
-- 4) purchase intents + service purchase conversion (orders -> requests)
-- 5) auto-assign preferred freelancer when request is approved
-- 6) auto-publish portfolio when is_public toggles on (and identity already approved)
-- 7) security hardening: tighten RLS for sensitive PII tables

-- =====================================================
-- 1) Link order items to requests (optional)
-- =====================================================
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE INDEX IF NOT EXISTS idx_order_items_request_id
ON public.order_items (request_id);

DO $$ BEGIN
  ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_request_id_fkey
  FOREIGN KEY (request_id) REFERENCES public.requests(id)
  ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================
-- 2) Ensure freelancer role is always present when freelancer_profile exists
-- =====================================================
CREATE OR REPLACE FUNCTION public.ensure_freelancer_role_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'freelancer'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_freelancer_role_from_profile ON public.freelancer_profiles;

CREATE TRIGGER trg_ensure_freelancer_role_from_profile
AFTER INSERT OR UPDATE OF user_id
ON public.freelancer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_freelancer_role_from_profile();


-- =====================================================
-- 3) Auto-publish freelancer portfolio when identity verification is approved
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_publish_portfolio_on_identity_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_type <> 'freelancer' THEN
    RETURN NEW;
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'approved' THEN
    UPDATE public.freelancer_portfolios
    SET status = 'published',
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND is_public = true
      AND COALESCE(status, 'draft') <> 'published';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_publish_portfolio_on_identity_approved ON public.identity_verifications;

CREATE TRIGGER trg_auto_publish_portfolio_on_identity_approved
AFTER UPDATE OF status
ON public.identity_verifications
FOR EACH ROW
EXECUTE FUNCTION public.auto_publish_portfolio_on_identity_approved();


-- =====================================================
-- 4) Purchase intents + service purchase conversion (orders -> requests)
-- =====================================================
-- 4.1) Purchase intents
CREATE TABLE IF NOT EXISTS public.purchase_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  freelancer_id uuid NOT NULL,
  portfolio_service_id uuid NOT NULL,
  title_snapshot text NOT NULL,
  description_snapshot text,
  price_egp_snapshot numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  order_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_intents_user_id ON public.purchase_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_freelancer_id ON public.purchase_intents(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_order_id ON public.purchase_intents(order_id);

ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "purchase_intents_owner_all"
  ON public.purchase_intents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "purchase_intents_admin_select"
  ON public.purchase_intents
  FOR SELECT
  USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4.2) Generic product to represent service purchases (one-time seed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE type = 'service_purchase') THEN
    INSERT INTO public.products (type, name, name_ar, description, price, credits, plan_id, is_active, sort_order)
    VALUES ('service_purchase', 'Service Purchase', 'شراء خدمة', 'Generic product used for portfolio service purchases', 0, NULL, NULL, true, 999);
  END IF;
END
$$;

-- 4.3) Link order_items to purchase intents
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS purchase_intent_id uuid;

CREATE INDEX IF NOT EXISTS idx_order_items_purchase_intent_id
ON public.order_items (purchase_intent_id);

DO $$ BEGIN
  ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_purchase_intent_id_fkey
  FOREIGN KEY (purchase_intent_id) REFERENCES public.purchase_intents(id)
  ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4.4) Service purchase metadata on requests
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS preferred_freelancer_id uuid;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS portfolio_service_id uuid;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS agreed_price_egp numeric;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS payment_order_id uuid;

CREATE INDEX IF NOT EXISTS idx_requests_preferred_freelancer_id ON public.requests(preferred_freelancer_id);
CREATE INDEX IF NOT EXISTS idx_requests_payment_order_id ON public.requests(payment_order_id);

-- 4.5) Convert a paid order's service items into requests (idempotent)
CREATE OR REPLACE FUNCTION public.convert_paid_order_service_purchases(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_intent public.purchase_intents%ROWTYPE;
  v_request_id uuid;
  v_request_number text;
  v_created integer := 0;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status <> 'paid'::public.order_status THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not paid');
  END IF;

  FOR v_item IN
    SELECT * FROM public.order_items WHERE order_id = _order_id AND purchase_intent_id IS NOT NULL
  LOOP
    IF v_item.request_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_intent FROM public.purchase_intents WHERE id = v_item.purchase_intent_id LIMIT 1;
    IF v_intent IS NULL THEN
      CONTINUE;
    END IF;

    v_request_number := 'REQ-' || lpad(nextval('public.request_number_seq')::text, 6, '0');
    v_request_id := gen_random_uuid();

    INSERT INTO public.requests (
      id,
      request_number,
      user_id,
      category_id,
      title,
      description,
      size,
      status,
      credits_cost,
      deadline,
      priority,
      files,
      admin_notes,
      preferred_freelancer_id,
      portfolio_service_id,
      agreed_price_egp,
      source,
      payment_order_id
    ) VALUES (
      v_request_id,
      v_request_number,
      v_intent.user_id,
      NULL,
      v_intent.title_snapshot,
      coalesce(v_intent.description_snapshot, ''),
      'micro'::public.task_size,
      'submitted'::public.request_status,
      0,
      NULL,
      'paid_service',
      '[]'::jsonb,
      'طلب خدمة مدفوعة من بروفايل فريلانسر. رقم الطلب: ' || v_order.order_number,
      v_intent.freelancer_id,
      v_intent.portfolio_service_id,
      v_intent.price_egp_snapshot,
      'portfolio_purchase',
      v_order.id
    );

    UPDATE public.order_items
    SET request_id = v_request_id
    WHERE id = v_item.id;

    UPDATE public.purchase_intents
    SET status = 'converted_to_request',
        order_id = v_order.id,
        updated_at = now()
    WHERE id = v_intent.id;

    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'created_requests', v_created);
END;
$$;

-- 4.6) Updated-at trigger for purchase_intents
DROP TRIGGER IF EXISTS trg_purchase_intents_updated_at ON public.purchase_intents;
CREATE TRIGGER trg_purchase_intents_updated_at
BEFORE UPDATE ON public.purchase_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =====================================================
-- 5) Auto-assign preferred freelancer when admin approves request
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_assign_preferred_freelancer_on_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_assignment boolean;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF NEW.preferred_freelancer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = NEW.id
      AND a.is_active = true
  ) INTO v_has_assignment;

  IF v_has_assignment THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.assignments (
    request_id,
    freelancer_id,
    is_active,
    payment_amount,
    suggested_payment,
    assigned_by,
    assigned_at
  ) VALUES (
    NEW.id,
    NEW.preferred_freelancer_id,
    true,
    0,
    NEW.agreed_price_egp,
    auth.uid(),
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_preferred_freelancer_on_approved ON public.requests;
CREATE TRIGGER trg_auto_assign_preferred_freelancer_on_approved
AFTER UPDATE OF status
ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_preferred_freelancer_on_approved();


-- =====================================================
-- 6) Auto-publish portfolio when is_public toggles on and identity already approved
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_publish_portfolio_on_public_toggle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.is_public IS NOT TRUE OR (OLD.is_public IS TRUE) THEN
    RETURN NEW;
  END IF;

  -- Only publish if identity verification is approved for this freelancer
  SELECT iv.status INTO v_status
  FROM public.identity_verifications iv
  WHERE iv.user_id = NEW.user_id
    AND iv.user_type = 'freelancer'
  ORDER BY iv.created_at DESC
  LIMIT 1;

  IF v_status = 'approved' AND COALESCE(NEW.status, 'draft') <> 'published' THEN
    NEW.status := 'published';
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_publish_portfolio_on_public_toggle ON public.freelancer_portfolios;
CREATE TRIGGER trg_auto_publish_portfolio_on_public_toggle
BEFORE UPDATE OF is_public
ON public.freelancer_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.auto_publish_portfolio_on_public_toggle();


-- =====================================================
-- 7) Security hardening: tighten RLS for sensitive PII tables
-- =====================================================
-- profiles (PII)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Remove duplicate / overly broad policies (RLS is OR-based; remove to avoid gaps)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users read own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users update own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admins read" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Keep anon blocked explicitly
DROP POLICY IF EXISTS profiles_block_anon ON public.profiles;
CREATE POLICY profiles_block_anon
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Authenticated: user can only access their own row
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage all profiles
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- identity_verifications (highly sensitive)
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications FORCE ROW LEVEL SECURITY;

-- Remove duplicates and unsafe update policies
DROP POLICY IF EXISTS "Users can view own verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can create own verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can create verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can update own pending verifications" ON public.identity_verifications;

DROP POLICY IF EXISTS identity_verifications_select_own ON public.identity_verifications;
DROP POLICY IF EXISTS identity_verifications_insert_own ON public.identity_verifications;
DROP POLICY IF EXISTS identity_verifications_update_own ON public.identity_verifications;

DROP POLICY IF EXISTS iv_select_own ON public.identity_verifications;
DROP POLICY IF EXISTS iv_insert_own ON public.identity_verifications;
DROP POLICY IF EXISTS iv_select_admin ON public.identity_verifications;
DROP POLICY IF EXISTS iv_update_admin ON public.identity_verifications;
DROP POLICY IF EXISTS "Admins can manage verifications" ON public.identity_verifications;

-- Keep anon blocked explicitly
DROP POLICY IF EXISTS identity_verifications_block_anon ON public.identity_verifications;
CREATE POLICY identity_verifications_block_anon
ON public.identity_verifications
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Authenticated: user can view only their own verification
DROP POLICY IF EXISTS identity_verifications_select_own ON public.identity_verifications;
CREATE POLICY identity_verifications_select_own
ON public.identity_verifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated: user can create only their own verification
DROP POLICY IF EXISTS identity_verifications_insert_own ON public.identity_verifications;
CREATE POLICY identity_verifications_insert_own
ON public.identity_verifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Authenticated: user can update only while status remains pending
-- (prevents user from self-approving or changing reviewed records)
DROP POLICY IF EXISTS identity_verifications_update_own_pending ON public.identity_verifications;
CREATE POLICY identity_verifications_update_own_pending
ON public.identity_verifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can fully manage
DROP POLICY IF EXISTS identity_verifications_admin_all ON public.identity_verifications;
CREATE POLICY identity_verifications_admin_all
ON public.identity_verifications
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- audit_logs (sensitive metadata)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Remove non-admin insert policy to prevent log forgery
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Ensure anon cannot access
DROP POLICY IF EXISTS audit_logs_block_anon ON public.audit_logs;
CREATE POLICY audit_logs_block_anon
ON public.audit_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Admin-only read
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admin-only insert (system/admin workflows)
DROP POLICY IF EXISTS "Only admins can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_admin ON public.audit_logs;
CREATE POLICY audit_logs_insert_admin
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

