-- Fix linter: lock down function search_path
CREATE OR REPLACE FUNCTION public.validate_telegram_link_attempt_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('success', 'failed') THEN
    RAISE EXCEPTION 'Invalid status. Expected success|failed';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix linter: remove overly-permissive INSERT policy (backend service role bypasses RLS)
DROP POLICY IF EXISTS "Allow insert telegram link attempts" ON public.telegram_link_attempts;
