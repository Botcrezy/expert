-- Portfolio service enhancements (retry): keep convert_paid_order_service_purchases return type jsonb

-- 1) Extend portfolio_services
ALTER TABLE public.portfolio_services
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS revisions_included integer,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Extend portfolio_projects
ALTER TABLE public.portfolio_projects
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) Add-ons table for services
CREATE TABLE IF NOT EXISTS public.portfolio_service_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.portfolio_services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_egp numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_service_addons_service_id ON public.portfolio_service_addons(service_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_service_addons_active ON public.portfolio_service_addons(service_id, is_active, sort_order);

ALTER TABLE public.portfolio_service_addons ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own service add-ons
DROP POLICY IF EXISTS "Owners can view own service addons" ON public.portfolio_service_addons;
CREATE POLICY "Owners can view own service addons"
ON public.portfolio_service_addons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_services s
    WHERE s.id = portfolio_service_addons.service_id
      AND s.freelancer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can create service addons" ON public.portfolio_service_addons;
CREATE POLICY "Owners can create service addons"
ON public.portfolio_service_addons
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portfolio_services s
    WHERE s.id = portfolio_service_addons.service_id
      AND s.freelancer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can update service addons" ON public.portfolio_service_addons;
CREATE POLICY "Owners can update service addons"
ON public.portfolio_service_addons
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_services s
    WHERE s.id = portfolio_service_addons.service_id
      AND s.freelancer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portfolio_services s
    WHERE s.id = portfolio_service_addons.service_id
      AND s.freelancer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can delete service addons" ON public.portfolio_service_addons;
CREATE POLICY "Owners can delete service addons"
ON public.portfolio_service_addons
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_services s
    WHERE s.id = portfolio_service_addons.service_id
      AND s.freelancer_id = auth.uid()
  )
);

-- Public can read active add-ons for active services
DROP POLICY IF EXISTS "Public can read active service addons" ON public.portfolio_service_addons;
CREATE POLICY "Public can read active service addons"
ON public.portfolio_service_addons
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.portfolio_services s
    WHERE s.id = portfolio_service_addons.service_id
      AND s.is_active = true
  )
);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_portfolio_service_addons_updated_at'
  ) THEN
    CREATE TRIGGER trg_portfolio_service_addons_updated_at
    BEFORE UPDATE ON public.portfolio_service_addons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) Purchase intent snapshots for add-ons and final price
ALTER TABLE public.purchase_intents
  ADD COLUMN IF NOT EXISTS addons_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_price_egp_snapshot numeric;

CREATE INDEX IF NOT EXISTS idx_purchase_intents_service_final_price ON public.purchase_intents(portfolio_service_id, total_price_egp_snapshot);

-- 5) Store add-ons snapshot on requests
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS service_addons_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 6) Update conversion function (keep RETURNS jsonb)
CREATE OR REPLACE FUNCTION public.convert_paid_order_service_purchases(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_intent public.purchase_intents%ROWTYPE;
  v_request_id uuid;
  v_request_number text;
  v_created integer := 0;
  v_final_price numeric;
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

    v_final_price := COALESCE(v_intent.total_price_egp_snapshot, v_intent.price_egp_snapshot, 0);

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
      payment_order_id,
      service_addons_snapshot
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
      v_final_price,
      'portfolio_purchase',
      v_order.id,
      COALESCE(v_intent.addons_snapshot, '[]'::jsonb)
    );

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
      v_final_price,
      true,
      'اتفاق ثابت: شراء خدمة من بورتفوليو فريلانسر. رقم الطلب: ' || v_order.order_number,
      NULL
    );

    -- Notify freelancer
    INSERT INTO public.notifications (user_id, type, title, body, reference_type, reference_id)
    VALUES (
      v_intent.freelancer_id,
      'service_purchase',
      'تم شراء خدمة منك (اتفاق ثابت)',
      COALESCE(v_intent.title_snapshot, ''),
      'request',
      v_request_id
    );

    -- Notify admins/team leaders
    INSERT INTO public.notifications (user_id, type, title, body, reference_type, reference_id)
    SELECT
      ur.user_id,
      'admin',
      'شراء خدمة جديد (اتفاق ثابت)',
      COALESCE(v_intent.title_snapshot, ''),
      'request',
      v_request_id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin'::public.app_role, 'team_leader'::public.app_role);

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
$function$;