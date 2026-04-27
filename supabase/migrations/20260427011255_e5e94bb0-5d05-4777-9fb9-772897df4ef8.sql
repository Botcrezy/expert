
-- =====================================================================
-- 1) Trigger function: auto-complete + pay freelancer when delivery approved
-- =====================================================================
CREATE OR REPLACE FUNCTION public.auto_pay_on_delivery_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_assignment public.assignments%ROWTYPE;
  v_amount numeric;
  v_current_balance numeric;
  v_new_balance numeric;
  v_already_paid boolean;
BEGIN
  -- Only act when status transitions to 'approved'
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Load the assignment
  SELECT * INTO v_assignment
  FROM public.assignments
  WHERE id = NEW.assignment_id;

  IF v_assignment.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_amount := COALESCE(v_assignment.payment_amount, 0);

  -- Idempotency: check if we've already paid for this assignment
  SELECT EXISTS(
    SELECT 1 FROM public.wallet_ledger
    WHERE reference_type = 'assignment'
      AND reference_id = v_assignment.id
      AND type = 'credit'
  ) INTO v_already_paid;

  -- Pay the freelancer
  IF NOT v_already_paid AND v_amount > 0 THEN
    SELECT COALESCE(balance_after, 0) INTO v_current_balance
    FROM public.wallet_ledger
    WHERE user_id = v_assignment.freelancer_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_current_balance := COALESCE(v_current_balance, 0);
    v_new_balance := v_current_balance + v_amount;

    INSERT INTO public.wallet_ledger (
      user_id, amount, balance_after, type, reason, reference_type, reference_id, created_by
    ) VALUES (
      v_assignment.freelancer_id,
      v_amount,
      v_new_balance,
      'credit',
      'دفعة تسليم معتمد',
      'assignment',
      v_assignment.id,
      COALESCE(NEW.qc_reviewer_id, auth.uid())
    );

    UPDATE public.freelancer_profiles
    SET total_earnings = COALESCE(total_earnings, 0) + v_amount,
        completed_tasks = COALESCE(completed_tasks, 0) + 1,
        updated_at = now()
    WHERE user_id = v_assignment.freelancer_id;
  END IF;

  -- Mark assignment completed
  UPDATE public.assignments
  SET completed_at = COALESCE(completed_at, now()),
      is_active = false
  WHERE id = v_assignment.id;

  -- Mark request completed
  UPDATE public.requests
  SET status = 'completed',
      updated_at = now()
  WHERE id = NEW.request_id
    AND status <> 'completed';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_pay_on_delivery_approved ON public.deliveries;
CREATE TRIGGER trg_auto_pay_on_delivery_approved
AFTER UPDATE OF status ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.auto_pay_on_delivery_approved();

-- Also handle INSERT case (delivery created already approved)
DROP TRIGGER IF EXISTS trg_auto_pay_on_delivery_approved_ins ON public.deliveries;
CREATE TRIGGER trg_auto_pay_on_delivery_approved_ins
AFTER INSERT ON public.deliveries
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION public.auto_pay_on_delivery_approved();

-- =====================================================================
-- 2) Backfill: pay & complete all historic approved deliveries
-- =====================================================================
DO $$
DECLARE
  r RECORD;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (a.id)
      a.id as assignment_id,
      a.freelancer_id,
      a.payment_amount,
      a.request_id,
      d.qc_reviewer_id
    FROM public.deliveries d
    JOIN public.assignments a ON a.id = d.assignment_id
    JOIN public.requests req ON req.id = d.request_id
    WHERE d.status = 'approved'
      AND COALESCE(a.payment_amount, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.wallet_ledger wl
        WHERE wl.reference_type = 'assignment'
          AND wl.reference_id = a.id
          AND wl.type = 'credit'
      )
    ORDER BY a.id, d.created_at DESC
  LOOP
    -- Pay
    SELECT COALESCE(balance_after, 0) INTO v_current_balance
    FROM public.wallet_ledger
    WHERE user_id = r.freelancer_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_current_balance := COALESCE(v_current_balance, 0);
    v_new_balance := v_current_balance + r.payment_amount;

    INSERT INTO public.wallet_ledger (
      user_id, amount, balance_after, type, reason, reference_type, reference_id, created_by
    ) VALUES (
      r.freelancer_id,
      r.payment_amount,
      v_new_balance,
      'credit',
      'دفعة تسليم معتمد (مرتجع)',
      'assignment',
      r.assignment_id,
      r.qc_reviewer_id
    );

    UPDATE public.freelancer_profiles
    SET total_earnings = COALESCE(total_earnings, 0) + r.payment_amount,
        completed_tasks = COALESCE(completed_tasks, 0) + 1,
        updated_at = now()
    WHERE user_id = r.freelancer_id;

    UPDATE public.assignments
    SET completed_at = COALESCE(completed_at, now()),
        is_active = false
    WHERE id = r.assignment_id;

    UPDATE public.requests
    SET status = 'completed', updated_at = now()
    WHERE id = r.request_id AND status <> 'completed';
  END LOOP;
END $$;
