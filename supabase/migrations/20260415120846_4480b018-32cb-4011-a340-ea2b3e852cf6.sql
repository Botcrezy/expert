
CREATE OR REPLACE FUNCTION public.auto_assign_on_proposal_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_assignment boolean;
BEGIN
  -- Only act when status changes to accepted
  IF NEW.status <> 'accepted' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Check if request already has an active assignment
  SELECT EXISTS(
    SELECT 1 FROM public.assignments
    WHERE request_id = NEW.request_id AND is_active = true
  ) INTO v_has_assignment;

  IF v_has_assignment THEN
    RETURN NEW;
  END IF;

  -- Create assignment
  INSERT INTO public.assignments (
    request_id,
    freelancer_id,
    is_active,
    payment_amount,
    suggested_payment,
    assigned_at
  ) VALUES (
    NEW.request_id,
    NEW.freelancer_id,
    true,
    COALESCE(NEW.proposed_price, 0),
    NEW.proposed_price,
    now()
  );

  -- Update request status to assigned
  UPDATE public.requests
  SET status = 'assigned', updated_at = now()
  WHERE id = NEW.request_id
    AND status IN ('submitted', 'approved');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_on_proposal_accepted
  AFTER UPDATE ON public.marketplace_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_on_proposal_accepted();
