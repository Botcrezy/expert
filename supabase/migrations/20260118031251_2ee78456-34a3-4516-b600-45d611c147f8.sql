-- Prevent freelancers from submitting deliveries or messages after a request is completed

-- Deliveries: block any insert if the linked request is completed
CREATE OR REPLACE FUNCTION public.prevent_delivery_when_request_completed()
RETURNS TRIGGER AS $$
DECLARE
  req_status text;
BEGIN
  SELECT status INTO req_status
  FROM public.requests
  WHERE id = NEW.request_id;

  IF req_status = 'completed' THEN
    RAISE EXCEPTION 'Request is completed; no more deliveries allowed.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_delivery_when_request_completed ON public.deliveries;
CREATE TRIGGER trg_prevent_delivery_when_request_completed
BEFORE INSERT ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_delivery_when_request_completed();

-- Messages: block freelancer messages when request is completed
CREATE OR REPLACE FUNCTION public.prevent_freelancer_message_when_request_completed()
RETURNS TRIGGER AS $$
DECLARE
  req_status text;
  is_freelancer boolean;
BEGIN
  SELECT status INTO req_status
  FROM public.requests
  WHERE id = NEW.request_id;

  IF req_status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Only block if current user is the assigned freelancer on this request
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = NEW.request_id
      AND a.freelancer_id = auth.uid()
  ) INTO is_freelancer;

  IF is_freelancer THEN
    RAISE EXCEPTION 'Request is completed; freelancer chat is closed.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_freelancer_message_when_request_completed ON public.messages;
CREATE TRIGGER trg_prevent_freelancer_message_when_request_completed
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_freelancer_message_when_request_completed();