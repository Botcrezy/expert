-- 1) Notify freelancer when a client submits/updates a request brief
CREATE OR REPLACE FUNCTION public.notify_freelancer_on_request_brief()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_id uuid;
  v_request_title text;
BEGIN
  SELECT a.freelancer_id INTO v_freelancer_id
  FROM public.assignments a
  WHERE a.request_id = NEW.request_id
    AND a.is_active = true
  ORDER BY a.assigned_at DESC
  LIMIT 1;

  IF v_freelancer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.title INTO v_request_title
  FROM public.requests r
  WHERE r.id = NEW.request_id;

  INSERT INTO public.notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (
    v_freelancer_id,
    'brief_submitted',
    'تم إرسال تفاصيل التنفيذ من العميل',
    COALESCE(v_request_title, ''),
    'request',
    NEW.request_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_freelancer_on_request_brief ON public.request_briefs;
CREATE TRIGGER trg_notify_freelancer_on_request_brief
AFTER INSERT OR UPDATE ON public.request_briefs
FOR EACH ROW
EXECUTE FUNCTION public.notify_freelancer_on_request_brief();


-- 2) Extend convert_paid_order_service_purchases to notify freelancer about the new purchase
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

    -- In-app notification for freelancer
    INSERT INTO public.notifications (user_id, type, title, body, reference_type, reference_id)
    VALUES (
      v_intent.freelancer_id,
      'service_purchase',
      'تم شراء خدمة منك (اتفاق ثابت)',
      COALESCE(v_intent.title_snapshot, ''),
      'request',
      v_request_id
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
$function$;