-- Portfolio slug history + redirect resolver

CREATE TABLE IF NOT EXISTS public.freelancer_portfolio_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.freelancer_portfolios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_slug_history_old_slug ON public.freelancer_portfolio_slug_history(old_slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_slug_history_new_slug ON public.freelancer_portfolio_slug_history(new_slug);

ALTER TABLE public.freelancer_portfolio_slug_history ENABLE ROW LEVEL SECURITY;

-- Only admins or the owner can view their slug history (not required for public redirect)
DROP POLICY IF EXISTS "View own portfolio slug history" ON public.freelancer_portfolio_slug_history;
CREATE POLICY "View own portfolio slug history"
ON public.freelancer_portfolio_slug_history
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "No direct writes to slug history" ON public.freelancer_portfolio_slug_history;
CREATE POLICY "No direct writes to slug history"
ON public.freelancer_portfolio_slug_history
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Record slug changes
CREATE OR REPLACE FUNCTION public.record_portfolio_slug_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    INSERT INTO public.freelancer_portfolio_slug_history(portfolio_id, user_id, old_slug, new_slug)
    VALUES (OLD.id, OLD.user_id, OLD.slug, NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_portfolio_slug_change ON public.freelancer_portfolios;
CREATE TRIGGER trg_record_portfolio_slug_change
AFTER UPDATE OF slug ON public.freelancer_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.record_portfolio_slug_change();

-- Sync portfolio slug with freelancer username (if portfolio exists)
CREATE OR REPLACE FUNCTION public.sync_portfolio_slug_from_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portfolio_id uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.username IS NULL OR NEW.username = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.username IS DISTINCT FROM OLD.username THEN
    SELECT id INTO v_portfolio_id
    FROM public.freelancer_portfolios
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF v_portfolio_id IS NOT NULL THEN
      UPDATE public.freelancer_portfolios
      SET slug = NEW.username
      WHERE id = v_portfolio_id
        AND slug IS DISTINCT FROM NEW.username;
      -- unique constraint on freelancer_portfolios.slug will enforce uniqueness
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_portfolio_slug_from_username ON public.freelancer_profiles;
CREATE TRIGGER trg_sync_portfolio_slug_from_username
AFTER UPDATE OF username ON public.freelancer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_portfolio_slug_from_username();

-- Public resolver: map old slug to new slug for redirects
CREATE OR REPLACE FUNCTION public.resolve_portfolio_slug(p_slug text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_exists boolean;
  v_new_slug text;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) < 2 OR length(trim(p_slug)) > 120 THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.freelancer_portfolios
    WHERE slug = p_slug
      AND status = 'published'
      AND is_public = true
  ) INTO v_exists;

  IF v_exists THEN
    RETURN p_slug;
  END IF;

  SELECT new_slug
  INTO v_new_slug
  FROM public.freelancer_portfolio_slug_history
  WHERE old_slug = p_slug
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_new_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_portfolio_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_portfolio_slug(text) TO anon, authenticated;