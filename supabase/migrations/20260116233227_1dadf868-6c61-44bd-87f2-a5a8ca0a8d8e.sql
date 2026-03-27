-- Create request briefs table for fixed-agreement (portfolio purchase) requests
CREATE TABLE IF NOT EXISTS public.request_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  brief_text text NOT NULL,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_request_briefs_request_id ON public.request_briefs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_briefs_client_id ON public.request_briefs(client_id);

-- RLS
ALTER TABLE public.request_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can read own request briefs" ON public.request_briefs;
CREATE POLICY "Clients can read own request briefs"
ON public.request_briefs
FOR SELECT
TO authenticated
USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can create own request briefs" ON public.request_briefs;
CREATE POLICY "Clients can create own request briefs"
ON public.request_briefs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can update own request briefs" ON public.request_briefs;
CREATE POLICY "Clients can update own request briefs"
ON public.request_briefs
FOR UPDATE
TO authenticated
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Freelancers can read assigned request briefs" ON public.request_briefs;
CREATE POLICY "Freelancers can read assigned request briefs"
ON public.request_briefs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = request_briefs.request_id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  )
);

DROP POLICY IF EXISTS "Admins can read all request briefs" ON public.request_briefs;
CREATE POLICY "Admins can read all request briefs"
ON public.request_briefs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_request_briefs_updated_at ON public.request_briefs;
CREATE TRIGGER update_request_briefs_updated_at
BEFORE UPDATE ON public.request_briefs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update conversion function: create assignment for portfolio purchases
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

    -- Auto-create assignment (pending admin approval)
    INSERT INTO public.assignments (
      request_id,
      freelancer_id,
      payment_amount,
      is_active,
      notes,
      freelancer_accepted
    ) VALUES (
      v_request_id,
      v_intent.freelancer_id,
      coalesce(v_intent.price_egp_snapshot, 0),
      true,
      'اتفاق ثابت: شراء خدمة من بورتفوليو فريلانسر. رقم الطلب: ' || v_order.order_number,
      NULL
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