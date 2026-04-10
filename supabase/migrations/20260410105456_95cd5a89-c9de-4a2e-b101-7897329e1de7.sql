
-- 1. Update all existing draft portfolios to published
UPDATE public.freelancer_portfolios
SET status = 'published', is_public = true, updated_at = now()
WHERE status != 'published' OR is_public != true;

-- 2. Create trigger function to auto-publish on INSERT
CREATE OR REPLACE FUNCTION public.auto_publish_portfolio_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.status := 'published';
  NEW.is_public := true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_publish_portfolio_on_insert
BEFORE INSERT ON public.freelancer_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.auto_publish_portfolio_on_insert();

-- 3. Replace the existing toggle trigger to remove identity verification requirement
CREATE OR REPLACE FUNCTION public.auto_publish_portfolio_on_public_toggle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Always publish when is_public is toggled on
  IF NEW.is_public IS TRUE AND COALESCE(NEW.status, 'draft') <> 'published' THEN
    NEW.status := 'published';
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
