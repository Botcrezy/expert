-- Auto-publish freelancer portfolio when identity verification is approved
CREATE OR REPLACE FUNCTION public.auto_publish_portfolio_on_identity_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when freelancer identity becomes approved
  IF NEW.user_type <> 'freelancer' THEN
    RETURN NEW;
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'approved' THEN
    -- If the freelancer already chose to make it public, publish it automatically
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
