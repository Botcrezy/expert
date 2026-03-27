-- Fix Telegram linking RPC error: add no-arg is_admin() wrapper + harden generate_telegram_link_code authorization

-- 1) Provide a compatibility overload used by some functions: public.is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.is_admin(auth.uid());
$$;

-- 2) Update generate_telegram_link_code to use the uuid signature explicitly
CREATE OR REPLACE FUNCTION public.generate_telegram_link_code(
  p_user_id uuid,
  p_user_type text DEFAULT 'client'::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Authorization check: user must be requesting code for themselves or be an admin
  IF auth.uid() != p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'غير مصرح بإنشاء كود لمستخدم آخر';
  END IF;

  -- Validate user_type
  IF p_user_type NOT IN ('client', 'freelancer', 'admin') THEN
    p_user_type := 'client';
  END IF;

  -- Generate a random 6-character alphanumeric code
  v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  -- Set expiration to 10 minutes from now
  v_expires_at := now() + interval '10 minutes';

  -- Delete any existing unused codes for this user
  DELETE FROM public.telegram_link_codes
  WHERE user_id = p_user_id AND used_at IS NULL;

  -- Insert new code
  INSERT INTO public.telegram_link_codes (user_id, user_type, code, expires_at)
  VALUES (p_user_id, p_user_type, v_code, v_expires_at);

  RETURN v_code;
END;
$$;

-- 3) Ensure authenticated users can execute the RPC (web clients)
GRANT EXECUTE ON FUNCTION public.generate_telegram_link_code(uuid, text) TO authenticated;

-- Optional hardening: ensure anon cannot call it
REVOKE EXECUTE ON FUNCTION public.generate_telegram_link_code(uuid, text) FROM anon;
