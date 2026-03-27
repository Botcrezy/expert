-- Auto-publish portfolio when is_public toggles on and identity already approved
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
