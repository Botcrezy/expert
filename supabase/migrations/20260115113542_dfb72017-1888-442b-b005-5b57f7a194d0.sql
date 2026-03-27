-- =========================================================
-- Strict Privacy Hardening (Public pages + PII tables)
-- =========================================================

-- 1) Public-safe invoice lookup by token (no direct table exposure)
--    Returns minimal fields + masked client info + freelancer public info.
CREATE OR REPLACE FUNCTION public.get_payment_collection_invoice_public(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inv public.payment_collection_invoices%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_freelancer public.freelancer_profiles%ROWTYPE;
  v_masked_email text;
  v_masked_name text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 OR length(trim(p_token)) > 128 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_inv
  FROM public.payment_collection_invoices
  WHERE token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Never reveal full client PII in a public token flow.
  v_masked_email := CASE
    WHEN v_inv.client_email IS NULL OR position('@' in v_inv.client_email) = 0 THEN NULL
    ELSE
      left(split_part(v_inv.client_email, '@', 1), 1) || '***@' || split_part(v_inv.client_email, '@', 2)
  END;

  v_masked_name := CASE
    WHEN v_inv.client_name IS NULL THEN NULL
    WHEN length(v_inv.client_name) <= 2 THEN v_inv.client_name
    ELSE left(v_inv.client_name, 1) || '**'
  END;

  -- Freelancer public fields
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = v_inv.freelancer_id
  LIMIT 1;

  SELECT * INTO v_freelancer
  FROM public.freelancer_profiles
  WHERE user_id = v_inv.freelancer_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', v_inv.id,
    'invoice_number', v_inv.invoice_number,
    'amount', v_inv.amount,
    'description', v_inv.description,
    'expires_at', v_inv.expires_at,
    'status', v_inv.status,
    'paid_at', v_inv.paid_at,
    'payment_url', v_inv.payment_url,

    'client', jsonb_build_object(
      'name_masked', v_masked_name,
      'email_masked', v_masked_email,
      'country', v_inv.client_country
    ),

    'freelancer', jsonb_build_object(
      'user_id', v_inv.freelancer_id,
      'full_name', v_profile.full_name,
      'avatar_url', v_profile.avatar_url,
      'bio', v_freelancer.bio,
      'rating', v_freelancer.rating,
      'completed_tasks', v_freelancer.completed_tasks,
      'stars', v_freelancer.stars,
      'is_verified', v_freelancer.is_verified
    )
  );
END;
$$;

-- 2) Public-safe portfolio freelancer info by slug (no direct profiles SELECT in public pages)
CREATE OR REPLACE FUNCTION public.get_public_portfolio_page(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_port public.freelancer_portfolios%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_freelancer public.freelancer_profiles%ROWTYPE;
  v_email text;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) < 2 OR length(trim(p_slug)) > 120 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_port
  FROM public.freelancer_portfolios
  WHERE slug = p_slug
    AND status = 'published'
    AND is_public = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = v_port.user_id
  LIMIT 1;

  SELECT * INTO v_freelancer
  FROM public.freelancer_profiles
  WHERE user_id = v_port.user_id
  LIMIT 1;

  v_email := CASE WHEN coalesce(v_port.show_email, false) THEN v_profile.email ELSE NULL END;

  RETURN jsonb_build_object(
    'portfolio', to_jsonb(v_port),
    'freelancer', jsonb_build_object(
      'profile', jsonb_build_object(
        'user_id', v_port.user_id,
        'full_name', v_profile.full_name,
        'avatar_url', v_profile.avatar_url,
        'email', v_email
      ),
      'freelancer', jsonb_build_object(
        'bio', v_freelancer.bio,
        'rating', v_freelancer.rating,
        'completed_tasks', v_freelancer.completed_tasks,
        'experience', v_freelancer.experience,
        'hourly_rate', v_freelancer.hourly_rate,
        'portfolio_url', v_freelancer.portfolio_url,
        'is_verified', v_freelancer.is_verified,
        'stars', v_freelancer.stars
      )
    )
  );
END;
$$;

-- 3) Tighten RLS: profiles must never be readable publicly.
--    Keep functionality for logged-in users + admins.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

CREATE POLICY "Profiles: users read own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Profiles: users update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Profiles: users insert own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Profiles: admins read"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 4) Tighten RLS: freelancer_profiles should not be publicly readable.
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Freelancer profiles are viewable by everyone" ON public.freelancer_profiles;
DROP POLICY IF EXISTS "Public can view verified freelancer profiles" ON public.freelancer_profiles;

CREATE POLICY "Freelancer profiles: owner read"
ON public.freelancer_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Freelancer profiles: owner update"
ON public.freelancer_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Freelancer profiles: owner insert"
ON public.freelancer_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Freelancer profiles: admins read"
ON public.freelancer_profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5) Tighten RLS: payment_collection_invoices should NOT be publicly selectable.
ALTER TABLE public.payment_collection_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view invoice by token" ON public.payment_collection_invoices;

CREATE POLICY "Invoices: freelancer owner read"
ON public.payment_collection_invoices
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

CREATE POLICY "Invoices: freelancer owner write"
ON public.payment_collection_invoices
FOR UPDATE
TO authenticated
USING (auth.uid() = freelancer_id)
WITH CHECK (auth.uid() = freelancer_id);

CREATE POLICY "Invoices: admins read"
ON public.payment_collection_invoices
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 6) Keep public portfolio tables public as intended (no change here),
-- but ensure they are at least protected by existing RLS.
-- (No-op: only ensuring RLS is enabled)
ALTER TABLE public.freelancer_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_services ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- END
-- =========================================================