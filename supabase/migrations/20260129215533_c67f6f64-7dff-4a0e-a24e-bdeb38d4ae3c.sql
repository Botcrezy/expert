-- Fix wrong uniqueness constraint on telegram_links
-- The previous UNIQUE(user_id, is_active) prevents having both one active and one inactive row (is_active=false) per user.
-- We replace it with partial unique indexes that only enforce uniqueness for active links.

ALTER TABLE public.telegram_links
  DROP CONSTRAINT IF EXISTS telegram_links_user_id_is_active_key;

-- Ensure at most one active link per user
CREATE UNIQUE INDEX IF NOT EXISTS telegram_links_one_active_per_user
  ON public.telegram_links (user_id)
  WHERE is_active = true;

-- Ensure at most one active link per telegram chat
CREATE UNIQUE INDEX IF NOT EXISTS telegram_links_one_active_per_chat
  ON public.telegram_links (telegram_chat_id)
  WHERE is_active = true;

-- Ensure at most one active link per telegram user (if present)
CREATE UNIQUE INDEX IF NOT EXISTS telegram_links_one_active_per_telegram_user
  ON public.telegram_links (telegram_user_id)
  WHERE is_active = true AND telegram_user_id IS NOT NULL;

-- Make unlink function resilient and SECURITY DEFINER so it can always flip is_active safely under RLS
CREATE OR REPLACE FUNCTION public.unlink_telegram_account(p_user_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.telegram_links
  SET is_active = false,
      updated_at = now()
  WHERE user_id = p_user_id
    AND is_active = true;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'unlinked';
  ELSE
    RETURN QUERY SELECT false, 'not_linked';
  END IF;
END;
$$;