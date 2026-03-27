-- Security fix: minimize PII returned by public invoice lookup

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
    ELSE left(split_part(v_inv.client_email, '@', 1), 1) || '***@' || split_part(v_inv.client_email, '@', 2)
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
      -- Country can be identifying when paired with payment links; omit from public payload
      'country', NULL
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