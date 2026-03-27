-- Harden SECURITY DEFINER functions with explicit authorization checks

-- 1) create_request_with_credits: ensure caller matches p_user_id unless service_role
CREATE OR REPLACE FUNCTION public.create_request_with_credits(
  p_user_id uuid,
  p_request_id uuid,
  p_idempotency_key text,
  p_category_id uuid,
  p_title text,
  p_description text,
  p_size public.task_size,
  p_deadline timestamp with time zone,
  p_files jsonb
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing public.requests%ROWTYPE;
  v_required integer;
  v_sub public.client_subscriptions%ROWTYPE;
  v_wallet_balance integer;
  v_remaining integer;
  v_new_wallet_balance integer;
  v_request public.requests%ROWTYPE;
  v_role text;
BEGIN
  v_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  -- Authorization: require authenticated user matching p_user_id, or service_role.
  IF v_role <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  -- Idempotency: return existing request if key already used
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.requests
    WHERE user_id = p_user_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  v_required := CASE p_size
    WHEN 'micro' THEN 1
    WHEN 'small' THEN 3
    WHEN 'medium' THEN 5
    WHEN 'large' THEN 10
    ELSE 0
  END;

  IF v_required <= 0 THEN
    RAISE EXCEPTION 'Invalid task size';
  END IF;

  -- Lock active subscription row (if exists) to avoid race conditions
  SELECT * INTO v_sub
  FROM public.client_subscriptions
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  SELECT COALESCE(
    (SELECT balance_after
     FROM public.credits_ledger
     WHERE user_id = p_user_id
     ORDER BY created_at DESC
     LIMIT 1),
    0
  ) INTO v_wallet_balance;

  IF COALESCE(v_sub.credits_remaining, 0) + v_wallet_balance < v_required THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  BEGIN
    INSERT INTO public.requests (
      id,
      user_id,
      category_id,
      title,
      description,
      size,
      deadline,
      credits_cost,
      status,
      files,
      idempotency_key
    ) VALUES (
      p_request_id,
      p_user_id,
      p_category_id,
      p_title,
      NULLIF(p_description, ''),
      p_size,
      p_deadline,
      v_required,
      'submitted',
      p_files,
      p_idempotency_key
    )
    RETURNING * INTO v_request;
  EXCEPTION
    WHEN unique_violation THEN
      -- If another request with same (user_id, idempotency_key) was created concurrently
      IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing
        FROM public.requests
        WHERE user_id = p_user_id
          AND idempotency_key = p_idempotency_key
        LIMIT 1;

        IF FOUND THEN
          RETURN v_existing;
        END IF;
      END IF;
      RAISE;
  END;

  v_remaining := v_required;

  -- Deduct from subscription credits first
  IF v_sub.id IS NOT NULL AND COALESCE(v_sub.credits_remaining, 0) > 0 THEN
    IF v_sub.credits_remaining >= v_remaining THEN
      UPDATE public.client_subscriptions
      SET credits_remaining = credits_remaining - v_remaining,
          updated_at = now()
      WHERE id = v_sub.id;
      v_remaining := 0;
    ELSE
      UPDATE public.client_subscriptions
      SET credits_remaining = 0,
          updated_at = now()
      WHERE id = v_sub.id;
      v_remaining := v_remaining - v_sub.credits_remaining;
    END IF;
  END IF;

  -- Then deduct remaining from wallet credits (credits_ledger)
  IF v_remaining > 0 THEN
    v_new_wallet_balance := v_wallet_balance - v_remaining;

    INSERT INTO public.credits_ledger (
      user_id,
      type,
      amount,
      balance_after,
      reason,
      reference_type,
      reference_id
    ) VALUES (
      p_user_id,
      'request_debit',
      -v_remaining,
      v_new_wallet_balance,
      'خصم كريديت لإنشاء طلب ' || v_request.request_number,
      'request',
      v_request.id
    );
  END IF;

  -- Notify user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    reference_type,
    reference_id
  ) VALUES (
    p_user_id,
    'request',
    'تم استلام طلبك',
    'تم إنشاء الطلب رقم ' || v_request.request_number || ' بنجاح.',
    'request',
    v_request.id
  );

  RETURN v_request;
END;
$function$;


-- 2) fulfill_paid_order: allow only trigger context, service_role, admins, or the order owner
CREATE OR REPLACE FUNCTION public.fulfill_paid_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _order RECORD;
  _item RECORD;
  _product RECORD;
  _current_sub RECORD;
  _new_credits integer := 0;
  v_role text;
BEGIN
  v_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  -- Allow internal trigger execution (no JWT context), and service role.
  IF pg_trigger_depth() = 0 AND v_role <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  -- Get order details
  SELECT * INTO _order FROM orders WHERE id = _order_id;

  IF _order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Authorization for non-trigger execution:
  -- admins can fulfill any order; otherwise only the order owner.
  IF pg_trigger_depth() = 0 AND v_role <> 'service_role' THEN
    IF NOT public.is_admin(auth.uid()) AND auth.uid() <> _order.user_id THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  -- Idempotency
  IF EXISTS (
    SELECT 1 FROM credits_ledger
    WHERE reference_type = 'order' AND reference_id = _order_id
  ) OR EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE order_id = _order_id
  ) THEN
    RETURN;
  END IF;

  -- Process each order item
  FOR _item IN SELECT * FROM order_items WHERE order_id = _order_id LOOP
    SELECT * INTO _product FROM products WHERE id = _item.product_id;

    IF _product IS NULL THEN
      CONTINUE;
    END IF;

    -- Add credits from credit packs
    IF _product.type = 'credit_pack' AND _product.credits > 0 THEN
      _new_credits := _new_credits + (_product.credits * _item.quantity);
    END IF;

    -- Handle subscription products
    IF _product.type = 'subscription' AND _product.plan_id IS NOT NULL THEN
      UPDATE client_subscriptions
      SET is_active = false
      WHERE user_id = _order.user_id AND is_active = true;

      DECLARE
        _plan RECORD;
      BEGIN
        SELECT * INTO _plan FROM plans WHERE id = _product.plan_id;

        IF _plan IS NOT NULL THEN
          INSERT INTO client_subscriptions (
            user_id, plan_id, credits_remaining, starts_at, expires_at, is_active
          ) VALUES (
            _order.user_id,
            _product.plan_id,
            _plan.credits_per_month,
            now(),
            now() + interval '30 days',
            true
          );
        END IF;
      END;
    END IF;

    -- Handle course products
    IF _product.type = 'course' AND _product.track_id IS NOT NULL THEN
      UPDATE course_enrollments
      SET is_active = false
      WHERE user_id = _order.user_id AND track_id = _product.track_id;

      INSERT INTO course_enrollments (
        user_id, track_id, order_id, is_active, enrolled_at, progress_percentage
      ) VALUES (
        _order.user_id,
        _product.track_id,
        _order_id,
        true,
        now(),
        0
      );

      UPDATE learning_tracks
      SET enrollment_count = COALESCE(enrollment_count, 0) + 1
      WHERE id = _product.track_id;
    END IF;
  END LOOP;

  -- Add credits to user's subscription if any
  IF _new_credits > 0 THEN
    SELECT * INTO _current_sub
    FROM client_subscriptions
    WHERE user_id = _order.user_id AND is_active = true
    LIMIT 1;

    IF _current_sub IS NULL THEN
      INSERT INTO client_subscriptions (user_id, plan_id, credits_remaining, is_active)
      SELECT _order.user_id, id, _new_credits, true
      FROM plans WHERE is_free = true
      LIMIT 1;

      IF NOT FOUND THEN
        INSERT INTO client_subscriptions (user_id, plan_id, credits_remaining, is_active)
        SELECT _order.user_id, id, _new_credits, true
        FROM plans WHERE is_active = true
        ORDER BY sort_order
        LIMIT 1;
      END IF;
    ELSE
      UPDATE client_subscriptions
      SET credits_remaining = credits_remaining + _new_credits,
          updated_at = now()
      WHERE id = _current_sub.id;
    END IF;

    INSERT INTO credits_ledger (
      user_id, type, amount, balance_after, reason, reference_type, reference_id
    )
    SELECT
      _order.user_id,
      'credit',
      _new_credits,
      COALESCE(
        (SELECT credits_remaining FROM client_subscriptions
         WHERE user_id = _order.user_id AND is_active = true LIMIT 1),
        _new_credits
      ),
      'شراء كريديت - طلب #' || _order.order_number,
      'order',
      _order_id;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (
    _order.user_id,
    'order',
    'تم تأكيد طلبك',
    'تم تأكيد طلب الشراء رقم ' || _order.order_number || ' وإضافة الرصيد إلى حسابك',
    'order',
    _order_id
  );
END;
$function$;


-- 3) release_task_payment: enforce admin based on auth.uid(); also bind p_admin_id to auth.uid() to prevent spoofing
CREATE OR REPLACE FUNCTION public.release_task_payment(p_task_id uuid, p_task_type text, p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_freelancer_id uuid;
  v_payment_amount numeric;
  v_current_balance numeric;
  v_new_balance numeric;
  v_request_id uuid;
BEGIN
  -- Must be called by authenticated admin; prevent spoofing of p_admin_id
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_admin_id IS NOT NULL AND p_admin_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin id mismatch');
  END IF;

  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can release task payments');
  END IF;

  IF p_task_type = 'assignment' THEN
    SELECT freelancer_id, payment_amount, request_id
    INTO v_freelancer_id, v_payment_amount, v_request_id
    FROM assignments
    WHERE id = p_task_id AND is_active = true;
  ELSIF p_task_type = 'project_task' THEN
    SELECT freelancer_id, payment_amount, request_id
    INTO v_freelancer_id, v_payment_amount, v_request_id
    FROM project_tasks
    WHERE id = p_task_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid task type');
  END IF;

  IF v_freelancer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or no freelancer assigned');
  END IF;

  IF v_payment_amount IS NULL OR v_payment_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment amount');
  END IF;

  SELECT COALESCE(balance_after, 0)
  INTO v_current_balance
  FROM wallet_ledger
  WHERE user_id = v_freelancer_id
  ORDER BY created_at DESC
  LIMIT 1;

  v_current_balance := COALESCE(v_current_balance, 0);
  v_new_balance := v_current_balance + v_payment_amount;

  INSERT INTO wallet_ledger (
    user_id,
    amount,
    balance_after,
    type,
    reason,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    v_freelancer_id,
    v_payment_amount,
    v_new_balance,
    'credit',
    'دفعة مهمة - ' || CASE WHEN p_task_type = 'assignment' THEN 'تعيين' ELSE 'مهمة فرعية' END,
    p_task_type,
    p_task_id,
    auth.uid()
  );

  UPDATE freelancer_profiles
  SET total_earnings = COALESCE(total_earnings, 0) + v_payment_amount
  WHERE user_id = v_freelancer_id;

  IF p_task_type = 'assignment' THEN
    UPDATE assignments
    SET completed_at = now()
    WHERE id = p_task_id;
  ELSIF p_task_type = 'project_task' THEN
    UPDATE project_tasks
    SET status = 'completed', completed_at = now()
    WHERE id = p_task_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'freelancer_id', v_freelancer_id,
    'amount', v_payment_amount,
    'new_balance', v_new_balance
  );
END;
$function$;


-- 4) update_track_progress trigger: ensure the caller can only update their own progress (or admin)
CREATE OR REPLACE FUNCTION public.update_track_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_track_id UUID;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_percentage NUMERIC(5,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid user_id';
  END IF;

  IF NEW.user_id <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT lm.track_id INTO v_track_id
  FROM learning_lessons ll
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE ll.id = NEW.lesson_id;

  IF v_track_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total_lessons
  FROM learning_lessons ll
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE lm.track_id = v_track_id AND ll.is_active = true;

  SELECT COUNT(*) INTO v_completed_lessons
  FROM user_lesson_progress ulp
  JOIN learning_lessons ll ON ulp.lesson_id = ll.id
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE ulp.user_id = NEW.user_id
    AND lm.track_id = v_track_id
    AND ulp.is_completed = true;

  v_percentage := CASE
    WHEN v_total_lessons > 0 THEN (v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100
    ELSE 0
  END;

  INSERT INTO user_track_progress (
    user_id,
    track_id,
    lessons_completed,
    total_lessons,
    progress_percentage,
    completed_at,
    last_accessed_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    v_track_id,
    v_completed_lessons,
    v_total_lessons,
    v_percentage,
    CASE WHEN v_percentage >= 100 THEN now() ELSE NULL END,
    now(),
    now()
  )
  ON CONFLICT (user_id, track_id)
  DO UPDATE SET
    lessons_completed = EXCLUDED.lessons_completed,
    total_lessons = EXCLUDED.total_lessons,
    progress_percentage = EXCLUDED.progress_percentage,
    completed_at = CASE
      WHEN EXCLUDED.progress_percentage >= 100 AND user_track_progress.completed_at IS NULL
      THEN now()
      ELSE user_track_progress.completed_at
    END,
    last_accessed_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$function$;