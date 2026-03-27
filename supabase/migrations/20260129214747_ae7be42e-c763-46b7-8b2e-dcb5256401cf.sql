-- 1) Log table for Telegram linking attempts (safe, append-only)
CREATE TABLE IF NOT EXISTS public.telegram_link_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  code text NULL,
  telegram_chat_id text NULL,
  telegram_user_id text NULL,
  telegram_username text NULL,
  status text NOT NULL DEFAULT 'failed',
  error_message text NULL
);

-- Basic status guard via trigger (avoid CHECK immutability pitfalls)
CREATE OR REPLACE FUNCTION public.validate_telegram_link_attempt_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('success', 'failed') THEN
    RAISE EXCEPTION 'Invalid status. Expected success|failed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_telegram_link_attempt_status ON public.telegram_link_attempts;
CREATE TRIGGER trg_validate_telegram_link_attempt_status
BEFORE INSERT OR UPDATE ON public.telegram_link_attempts
FOR EACH ROW
EXECUTE FUNCTION public.validate_telegram_link_attempt_status();

CREATE INDEX IF NOT EXISTS idx_telegram_link_attempts_created_at ON public.telegram_link_attempts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_link_attempts_chat_id ON public.telegram_link_attempts (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_attempts_code ON public.telegram_link_attempts (code);

-- 2) RLS: only admins can read; webhook (service role) can insert
ALTER TABLE public.telegram_link_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view telegram link attempts" ON public.telegram_link_attempts;
CREATE POLICY "Admins can view telegram link attempts"
ON public.telegram_link_attempts
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage telegram link attempts" ON public.telegram_link_attempts;
CREATE POLICY "Admins can manage telegram link attempts"
ON public.telegram_link_attempts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Allow inserts from any role used by backend functions (service role uses BYPASSRLS anyway)
DROP POLICY IF EXISTS "Allow insert telegram link attempts" ON public.telegram_link_attempts;
CREATE POLICY "Allow insert telegram link attempts"
ON public.telegram_link_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
