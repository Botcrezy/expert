-- Retry migration (previous attempt failed due to Postgres syntax: ADD CONSTRAINT IF NOT EXISTS is not supported)

-- 1) Purchase intents
CREATE TABLE IF NOT EXISTS public.purchase_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  freelancer_id uuid NOT NULL,
  portfolio_service_id uuid NOT NULL,
  title_snapshot text NOT NULL,
  description_snapshot text,
  price_egp_snapshot numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  order_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_intents_user_id ON public.purchase_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_freelancer_id ON public.purchase_intents(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_order_id ON public.purchase_intents(order_id);

ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "purchase_intents_owner_all"
  ON public.purchase_intents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "purchase_intents_admin_select"
  ON public.purchase_intents
  FOR SELECT
  USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Generic product to represent service purchases
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE type = 'service_purchase') THEN
    INSERT INTO public.products (type, name, name_ar, description, price, credits, plan_id, is_active, sort_order)
    VALUES ('service_purchase', 'Service Purchase', 'شراء خدمة', 'Generic product used for portfolio service purchases', 0, NULL, NULL, true, 999);
  END IF;
END
$$;

-- 3) Link order_items to purchase intents
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS purchase_intent_id uuid;

CREATE INDEX IF NOT EXISTS idx_order_items_purchase_intent_id
ON public.order_items (purchase_intent_id);

DO $$ BEGIN
  ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_purchase_intent_id_fkey
  FOREIGN KEY (purchase_intent_id) REFERENCES public.purchase_intents(id)
  ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4) Service purchase metadata on requests
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS preferred_freelancer_id uuid;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS portfolio_service_id uuid;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS agreed_price_egp numeric;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS payment_order_id uuid;

CREATE INDEX IF NOT EXISTS idx_requests_preferred_freelancer_id ON public.requests(preferred_freelancer_id);
CREATE INDEX IF NOT EXISTS idx_requests_payment_order_id ON public.requests(payment_order_id);

-- 5) Convert a paid order's service items into requests (idempotent)
CREATE OR REPLACE FUNCTION public.convert_paid_order_service_purchases(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_intent public.purchase_intents%ROWTYPE;
  v_request_id uuid;
  v_request_number text;
  v_created integer := 0;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status <> 'paid'::public.order_status THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not paid');
  END IF;

  FOR v_item IN
    SELECT * FROM public.order_items WHERE order_id = _order_id AND purchase_intent_id IS NOT NULL
  LOOP
    IF v_item.request_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_intent FROM public.purchase_intents WHERE id = v_item.purchase_intent_id LIMIT 1;
    IF v_intent IS NULL THEN
      CONTINUE;
    END IF;

    v_request_number := 'REQ-' || lpad(nextval('public.request_number_seq')::text, 6, '0');
    v_request_id := gen_random_uuid();

    INSERT INTO public.requests (
      id,
      request_number,
      user_id,
      category_id,
      title,
      description,
      size,
      status,
      credits_cost,
      deadline,
      priority,
      files,
      admin_notes,
      preferred_freelancer_id,
      portfolio_service_id,
      agreed_price_egp,
      source,
      payment_order_id
    ) VALUES (
      v_request_id,
      v_request_number,
      v_intent.user_id,
      NULL,
      v_intent.title_snapshot,
      coalesce(v_intent.description_snapshot, ''),
      'micro'::public.task_size,
      'submitted'::public.request_status,
      0,
      NULL,
      'paid_service',
      '[]'::jsonb,
      'طلب خدمة مدفوعة من بروفايل فريلانسر. رقم الطلب: ' || v_order.order_number,
      v_intent.freelancer_id,
      v_intent.portfolio_service_id,
      v_intent.price_egp_snapshot,
      'portfolio_purchase',
      v_order.id
    );

    UPDATE public.order_items
    SET request_id = v_request_id
    WHERE id = v_item.id;

    UPDATE public.purchase_intents
    SET status = 'converted_to_request',
        order_id = v_order.id,
        updated_at = now()
    WHERE id = v_intent.id;

    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'created_requests', v_created);
END;
$$;

-- 6) Auto-assign preferred freelancer when admin approves request (idempotent)
CREATE OR REPLACE FUNCTION public.auto_assign_preferred_freelancer_on_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_assignment boolean;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF NEW.preferred_freelancer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = NEW.id
      AND a.is_active = true
  ) INTO v_has_assignment;

  IF v_has_assignment THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.assignments (
    request_id,
    freelancer_id,
    is_active,
    payment_amount,
    suggested_payment,
    assigned_by,
    assigned_at
  ) VALUES (
    NEW.id,
    NEW.preferred_freelancer_id,
    true,
    0,
    NEW.agreed_price_egp,
    auth.uid(),
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_preferred_freelancer_on_approved ON public.requests;
CREATE TRIGGER trg_auto_assign_preferred_freelancer_on_approved
AFTER UPDATE OF status
ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_preferred_freelancer_on_approved();

-- 7) Updated-at trigger for purchase_intents
DROP TRIGGER IF EXISTS trg_purchase_intents_updated_at ON public.purchase_intents;
CREATE TRIGGER trg_purchase_intents_updated_at
BEFORE UPDATE ON public.purchase_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
