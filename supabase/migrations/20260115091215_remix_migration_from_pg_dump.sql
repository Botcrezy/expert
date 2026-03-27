CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'client',
    'freelancer',
    'team_leader',
    'admin'
);


--
-- Name: coupon_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.coupon_type AS ENUM (
    'percent',
    'fixed'
);


--
-- Name: delivery_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delivery_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'resubmitted'
);


--
-- Name: dispute_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dispute_status AS ENUM (
    'opened',
    'under_review',
    'resolved_refund',
    'resolved_reassign',
    'closed'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'cart',
    'pending_payment',
    'paid',
    'failed',
    'cancelled',
    'refunded'
);


--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'submitted',
    'needs_info',
    'approved',
    'assigned',
    'in_progress',
    'ready_for_qc',
    'qc_rejected',
    'delivered_to_client',
    'revision_requested',
    'completed',
    'cancelled'
);


--
-- Name: task_size; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_size AS ENUM (
    'micro',
    'small',
    'medium',
    'large'
);


--
-- Name: auto_fulfill_free_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_fulfill_free_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If the order total is 0 (fully covered by coupon), auto-approve
  IF NEW.total = 0 AND NEW.status = 'pending_payment' THEN
    NEW.status := 'paid';
    NEW.paid_at := now();
    NEW.payment_method := 'coupon';
    
    -- Fulfill the order
    PERFORM fulfill_paid_order(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: calculate_estimated_price(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_estimated_price(p_credits integer) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT (p_credits::numeric * COALESCE((SELECT (value::text)::numeric FROM public.site_settings WHERE key = 'credit_price_egp'), 50));
$$;


--
-- Name: can_read_request_file(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_read_request_file(p_object_name text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_kind text;
  v_request_id uuid;
BEGIN
  -- Expected patterns:
  --   {userId}/requests/{requestId}/...
  --   {userId}/deliveries/{requestId}/...
  v_kind := split_part(p_object_name, '/', 2);
  IF v_kind NOT IN ('requests', 'deliveries') THEN
    RETURN false;
  END IF;

  BEGIN
    v_request_id := split_part(p_object_name, '/', 3)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  RETURN public.can_view_request(v_request_id);
END;
$$;


--
-- Name: can_read_training_file(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_read_training_file(p_object_name text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.is_admin(auth.uid())
      or split_part(p_object_name, '/', 1) = auth.uid()::text;
$$;


--
-- Name: can_view_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_request(p_request_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_admin(auth.uid())
      OR public.is_request_owner(p_request_id)
      OR public.is_request_assigned_to_freelancer(p_request_id);
$$;


--
-- Name: cleanup_old_admin_setup_attempts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_admin_setup_attempts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.admin_setup_attempts
  WHERE attempt_time < now() - interval '24 hours';
END;
$$;


--
-- Name: create_product_for_paid_track(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_product_for_paid_track() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only create product if track is paid and no product exists
  IF NEW.is_free = false AND NEW.price IS NOT NULL AND NEW.price > 0 THEN
    -- Check if product already exists for this track
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE track_id = NEW.id) THEN
      INSERT INTO public.products (name, name_ar, description, price, type, track_id, is_active)
      VALUES (
        NEW.name || ' Course',
        'كورس ' || NEW.name_ar,
        NEW.description,
        NEW.price,
        'course',
        NEW.id,
        NEW.is_active
      );
    ELSE
      -- Update existing product
      UPDATE public.products 
      SET 
        name = NEW.name || ' Course',
        name_ar = 'كورس ' || NEW.name_ar,
        description = NEW.description,
        price = NEW.price,
        is_active = NEW.is_active
      WHERE track_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_number text NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    title text NOT NULL,
    description text,
    size public.task_size DEFAULT 'small'::public.task_size NOT NULL,
    status public.request_status DEFAULT 'submitted'::public.request_status NOT NULL,
    credits_cost integer DEFAULT 1 NOT NULL,
    deadline timestamp with time zone,
    priority text DEFAULT 'normal'::text,
    files jsonb DEFAULT '[]'::jsonb,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    idempotency_key text
);


--
-- Name: create_request_with_credits(uuid, uuid, text, uuid, text, text, public.task_size, timestamp with time zone, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_request_with_credits(p_user_id uuid, p_request_id uuid, p_idempotency_key text, p_category_id uuid, p_title text, p_description text, p_size public.task_size, p_deadline timestamp with time zone, p_files jsonb) RETURNS public.requests
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_existing public.requests%ROWTYPE;
  v_required integer;
  v_sub public.client_subscriptions%ROWTYPE;
  v_wallet_balance integer;
  v_remaining integer;
  v_new_wallet_balance integer;
  v_request public.requests%ROWTYPE;
BEGIN
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
$$;


--
-- Name: fulfill_paid_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fulfill_paid_order(_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _order RECORD;
  _item RECORD;
  _product RECORD;
  _current_sub RECORD;
  _new_credits integer := 0;
BEGIN
  -- Get order details
  SELECT * INTO _order FROM orders WHERE id = _order_id;
  
  IF _order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Check if already fulfilled (idempotency) - check for any fulfillment record
  IF EXISTS (
    SELECT 1 FROM credits_ledger 
    WHERE reference_type = 'order' AND reference_id = _order_id
  ) OR EXISTS (
    SELECT 1 FROM course_enrollments 
    WHERE order_id = _order_id
  ) THEN
    RETURN; -- Already processed
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
      -- Deactivate existing subscriptions
      UPDATE client_subscriptions 
      SET is_active = false 
      WHERE user_id = _order.user_id AND is_active = true;
      
      -- Get plan details
      DECLARE
        _plan RECORD;
      BEGIN
        SELECT * INTO _plan FROM plans WHERE id = _product.plan_id;
        
        IF _plan IS NOT NULL THEN
          -- Create new subscription
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
      -- Deactivate any existing enrollment for this track
      UPDATE course_enrollments 
      SET is_active = false 
      WHERE user_id = _order.user_id AND track_id = _product.track_id;
      
      -- Create new enrollment
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
      
      -- Update enrollment count on track
      UPDATE learning_tracks 
      SET enrollment_count = COALESCE(enrollment_count, 0) + 1
      WHERE id = _product.track_id;
    END IF;
  END LOOP;
  
  -- Add credits to user's subscription if any
  IF _new_credits > 0 THEN
    -- Get or create active subscription
    SELECT * INTO _current_sub 
    FROM client_subscriptions 
    WHERE user_id = _order.user_id AND is_active = true
    LIMIT 1;
    
    IF _current_sub IS NULL THEN
      -- Create a basic subscription for credits
      INSERT INTO client_subscriptions (user_id, plan_id, credits_remaining, is_active)
      SELECT _order.user_id, id, _new_credits, true
      FROM plans WHERE is_free = true
      LIMIT 1;
      
      -- If no free plan, get any plan
      IF NOT FOUND THEN
        INSERT INTO client_subscriptions (user_id, plan_id, credits_remaining, is_active)
        SELECT _order.user_id, id, _new_credits, true
        FROM plans WHERE is_active = true
        ORDER BY sort_order
        LIMIT 1;
      END IF;
    ELSE
      -- Add to existing subscription
      UPDATE client_subscriptions 
      SET credits_remaining = credits_remaining + _new_credits,
          updated_at = now()
      WHERE id = _current_sub.id;
    END IF;
    
    -- Record in credits ledger
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
  
  -- Send notification to user
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
$$;


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.order_number := 'ORD-' || LPAD(NEXTVAL('public.order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_payment_collection_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_payment_collection_invoice_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.invoice_number := 'INV-' || LPAD(NEXTVAL('public.payment_collection_invoice_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_request_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_request_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.request_number := 'REQ-' || LPAD(NEXTVAL('public.request_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_telegram_link_code(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_telegram_link_code(p_user_id uuid, p_user_type text DEFAULT 'client'::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Authorization check: user must be requesting code for themselves or be an admin
  IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح بإنشاء كود لمستخدم آخر';
  END IF;

  -- Validate user_type
  IF p_user_type NOT IN ('client', 'freelancer', 'admin') THEN
    p_user_type := 'client';
  END IF;

  -- Generate a random 6-character alphanumeric code
  v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  
  -- Set expiration to 10 minutes from now
  v_expires_at := now() + interval '10 minutes';
  
  -- Delete any existing unused codes for this user
  DELETE FROM public.telegram_link_codes 
  WHERE user_id = p_user_id AND used_at IS NULL;
  
  -- Insert new code
  INSERT INTO public.telegram_link_codes (user_id, user_type, code, expires_at)
  VALUES (p_user_id, p_user_type, v_code, v_expires_at);
  
  RETURN v_code;
END;
$$;


--
-- Name: generate_ticket_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ticket_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(NEXTVAL('public.ticket_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;


--
-- Name: get_client_orders(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_client_orders(p_user_id uuid) RETURNS TABLE(id uuid, user_id uuid, order_number text, status text, subtotal numeric, discount numeric, tax numeric, total numeric, coupon_id uuid, paid_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT 
    o.id,
    o.user_id,
    o.order_number,
    o.status::text,
    o.subtotal,
    o.discount,
    o.tax,
    o.total,
    o.coupon_id,
    o.paid_at,
    o.created_at,
    o.updated_at
  FROM orders o
  WHERE o.user_id = p_user_id
  ORDER BY o.created_at DESC;
$$;


--
-- Name: get_client_requests(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_client_requests(p_user_id uuid) RETURNS TABLE(id uuid, user_id uuid, request_number text, title text, description text, category_id uuid, size text, status text, priority text, deadline timestamp with time zone, credits_cost integer, files jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT 
    r.id,
    r.user_id,
    r.request_number,
    r.title,
    r.description,
    r.category_id,
    r.size::text,
    r.status::text,
    r.priority,
    r.deadline,
    r.credits_cost,
    r.files,
    r.created_at,
    r.updated_at
  FROM requests r
  WHERE r.user_id = p_user_id
  ORDER BY r.created_at DESC;
$$;


--
-- Name: get_freelancer_public_info(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_freelancer_public_info(p_user_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT jsonb_build_object(
    'id', id,
    'bio', bio,
    'portfolio_url', portfolio_url,
    'skills', skills,
    'rating', rating,
    'completed_tasks', completed_tasks,
    'is_verified', is_verified,
    'is_available', is_available
  )
  FROM public.freelancer_profiles 
  WHERE user_id = p_user_id AND is_verified = true;
$$;


--
-- Name: get_platform_stats_for_telegram(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_platform_stats_for_telegram() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT jsonb_build_object(
    'requests_today', (SELECT COUNT(*) FROM public.requests WHERE created_at >= CURRENT_DATE),
    'pending_requests', (SELECT COUNT(*) FROM public.requests WHERE status = 'submitted'),
    'pending_qc', (SELECT COUNT(*) FROM public.deliveries WHERE status = 'pending'),
    'active_disputes', (SELECT COUNT(*) FROM public.disputes WHERE status = 'opened'),
    'active_freelancers', (SELECT COUNT(*) FROM public.freelancer_profiles WHERE is_available = true),
    'total_users', (SELECT COUNT(*) FROM public.profiles)
  );
$$;


--
-- Name: get_user_display_name(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_display_name(p_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(full_name, 'مستخدم') 
  FROM public.profiles 
  WHERE user_id = p_user_id;
$$;


--
-- Name: get_verification_settings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_verification_settings() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT jsonb_build_object(
    'client_identity_required', COALESCE((SELECT (value::text)::boolean FROM settings WHERE key = 'client_identity_required'), false),
    'freelancer_identity_required', COALESCE((SELECT (value::text)::boolean FROM settings WHERE key = 'freelancer_identity_required'), false)
  );
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  desired_role public.app_role;
BEGIN
  -- Ensure profile exists / stays updated
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'مستخدم جديد'),
    NEW.email
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();

  -- Only allow safe roles from metadata
  desired_role := CASE
    WHEN (NEW.raw_user_meta_data ->> 'signup_role') = 'freelancer' THEN 'freelancer'::public.app_role
    WHEN (NEW.raw_user_meta_data ->> 'signup_role') = 'client' THEN 'client'::public.app_role
    ELSE 'client'::public.app_role
  END;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, desired_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: handle_order_paid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_order_paid() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When an order becomes paid, fulfill it.
  IF NEW.status = 'paid'::public.order_status AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.fulfill_paid_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'team_leader')
$$;


--
-- Name: is_request_assigned_to_freelancer(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_request_assigned_to_freelancer(p_request_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = p_request_id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  );
$$;


--
-- Name: is_request_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_request_owner(p_request_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = p_request_id
      AND r.user_id = auth.uid()
  );
$$;


--
-- Name: mark_info_request_answered(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_info_request_answered() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  update public.request_info_requests
  set status = 'answered'
  where id = new.info_request_id;
  return new;
end;
$$;


--
-- Name: notify_admin_new_support_conversation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_admin_new_support_conversation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_type_ar TEXT;
  v_body TEXT;
BEGIN
  -- Get user details
  SELECT full_name, email INTO v_user_name, v_user_email
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  v_user_name := COALESCE(v_user_name, 'مستخدم');
  v_user_email := COALESCE(v_user_email, 'غير معروف');
  
  -- Translate user type to Arabic
  v_user_type_ar := CASE 
    WHEN NEW.user_type = 'client' THEN 'عميل'
    WHEN NEW.user_type = 'freelancer' THEN 'فريلانسر'
    ELSE NEW.user_type
  END;
  
  -- Create rich notification body
  v_body := '💬 محادثة دعم جديدة من ' || v_user_name || ' (' || v_user_type_ar || ')' || E'\n' ||
            '📧 البريد: ' || v_user_email || E'\n' ||
            '📝 الموضوع: ' || COALESCE(NEW.subject, 'بدون عنوان');
  
  -- Insert notification for all admins
  INSERT INTO public.notifications (user_id, type, title, body, reference_type, reference_id)
  SELECT 
    ur.user_id,
    'support',
    '💬 محادثة دعم فني جديدة',
    v_body,
    'support_conversation',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'team_leader');
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_admin_new_support_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_admin_new_support_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
  v_conversation_subject TEXT;
  v_conversation_user_type TEXT;
  v_message_preview TEXT;
  v_body TEXT;
BEGIN
  -- Skip if sender is admin
  IF NEW.sender_type = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- Get sender details
  SELECT full_name, email INTO v_user_name, v_user_email
  FROM public.profiles
  WHERE user_id = NEW.sender_id;
  
  v_user_name := COALESCE(v_user_name, 'مستخدم');
  v_user_email := COALESCE(v_user_email, 'غير معروف');
  
  -- Get conversation details
  SELECT subject, user_type INTO v_conversation_subject, v_conversation_user_type
  FROM public.support_conversations
  WHERE id = NEW.conversation_id;
  
  v_conversation_subject := COALESCE(v_conversation_subject, 'محادثة دعم');
  
  -- Create message preview (first 100 characters)
  v_message_preview := CASE 
    WHEN LENGTH(NEW.message) > 100 THEN LEFT(NEW.message, 100) || '...'
    ELSE NEW.message
  END;
  
  -- Create rich notification body
  v_body := '👤 من: ' || v_user_name || ' (' || 
            CASE 
              WHEN NEW.sender_type = 'client' THEN 'عميل'
              WHEN NEW.sender_type = 'freelancer' THEN 'فريلانسر'
              ELSE NEW.sender_type
            END || ')' || E'\n' ||
            '📧 البريد: ' || v_user_email || E'\n' ||
            '📝 الموضوع: ' || v_conversation_subject || E'\n' ||
            '💬 الرسالة: ' || v_message_preview;
  
  -- Insert notification for all admins
  INSERT INTO public.notifications (user_id, type, title, body, reference_type, reference_id)
  SELECT 
    ur.user_id,
    'support',
    '📩 رسالة دعم فني جديدة',
    v_body,
    'support_conversation',
    NEW.conversation_id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'team_leader');
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_on_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE request_title TEXT;
BEGIN
  SELECT title INTO request_title FROM requests WHERE id = NEW.request_id;
  INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (NEW.freelancer_id, 'assignment', 'مهمة جديدة', 'تم تعيينك لمهمة جديدة: ' || request_title, 'request', NEW.request_id);
  RETURN NEW;
END;
$$;


--
-- Name: notify_on_new_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_new_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  request_owner_id UUID;
  freelancer_id UUID;
  request_title TEXT;
  sender_is_admin BOOLEAN;
BEGIN
  SELECT r.user_id, r.title INTO request_owner_id, request_title
  FROM requests r WHERE r.id = NEW.request_id;
  
  SELECT a.freelancer_id INTO freelancer_id
  FROM assignments a WHERE a.request_id = NEW.request_id AND a.is_active = true LIMIT 1;
  
  sender_is_admin := public.is_admin(NEW.sender_id);
  
  -- If sender is admin, notify both client and freelancer
  IF sender_is_admin THEN
    -- Notify client
    IF request_owner_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
      VALUES (request_owner_id, 'message', 'رسالة جديدة من المنصة', 'لديك رسالة جديدة في الطلب: ' || request_title, 'request', NEW.request_id);
    END IF;
    
    -- Notify freelancer
    IF freelancer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
      VALUES (freelancer_id, 'message', 'رسالة جديدة من المنصة', 'لديك رسالة جديدة في المهمة: ' || request_title, 'request', NEW.request_id);
    END IF;
  ELSE
    -- Client or freelancer sent message - notify admin
    -- (In a production system, you'd have an admin users list to notify)
    -- For now, just ensure the opposite party does NOT get notified (no direct communication)
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_on_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE freelancer_id UUID; status_text TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  
  CASE NEW.status
    WHEN 'approved' THEN status_text := 'تمت الموافقة على طلبك';
    WHEN 'assigned' THEN status_text := 'تم تعيين فريلانسر لطلبك';
    WHEN 'in_progress' THEN status_text := 'بدأ العمل على طلبك';
    WHEN 'delivered_to_client' THEN status_text := 'تم تسليم طلبك';
    WHEN 'completed' THEN status_text := 'تم إكمال طلبك بنجاح';
    WHEN 'cancelled' THEN status_text := 'تم إلغاء طلبك';
    WHEN 'revision_requested' THEN status_text := 'طُلب تعديل على طلبك';
    ELSE status_text := 'تم تحديث حالة طلبك';
  END CASE;
  
  INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (NEW.user_id, 'status_change', 'تحديث حالة الطلب', status_text, 'request', NEW.id);
  
  IF NEW.status IN ('revision_requested', 'qc_rejected') THEN
    SELECT a.freelancer_id INTO freelancer_id FROM assignments a WHERE a.request_id = NEW.id AND a.is_active = true LIMIT 1;
    IF freelancer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
      VALUES (freelancer_id, 'status_change', 'تحديث المهمة', status_text, 'request', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_on_wallet_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_wallet_transaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (NEW.user_id, 'payment', 
    CASE WHEN NEW.type = 'credit' THEN 'إيداع جديد' ELSE 'خصم من المحفظة' END,
    COALESCE(NEW.reason, 'تم تحديث رصيد محفظتك') || ' - ' || ABS(NEW.amount) || ' ج.م', 'wallet', NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: notify_on_withdrawal_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_withdrawal_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (NEW.user_id, 'payment',
    CASE 
      WHEN NEW.status = 'approved' THEN 'تمت الموافقة على طلب السحب'
      WHEN NEW.status = 'rejected' THEN 'تم رفض طلب السحب'
      WHEN NEW.status = 'completed' THEN 'تم تنفيذ طلب السحب'
      ELSE 'تحديث طلب السحب'
    END, 'طلب سحب بقيمة ' || NEW.amount || ' ج.م', 'withdrawal', NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: release_task_payment(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_task_payment(p_task_id uuid, p_task_type text, p_admin_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_freelancer_id uuid;
  v_payment_amount numeric;
  v_current_balance numeric;
  v_new_balance numeric;
  v_request_id uuid;
  v_result jsonb;
BEGIN
  -- Ensure only admins can release payments
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can release task payments');
  END IF;

  -- Get task details based on type
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

  -- Get current wallet balance
  SELECT COALESCE(balance_after, 0)
  INTO v_current_balance
  FROM wallet_ledger
  WHERE user_id = v_freelancer_id
  ORDER BY created_at DESC
  LIMIT 1;

  v_current_balance := COALESCE(v_current_balance, 0);
  v_new_balance := v_current_balance + v_payment_amount;

  -- Insert wallet ledger entry
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
    p_admin_id
  );

  -- Update freelancer total_earnings
  UPDATE freelancer_profiles
  SET total_earnings = COALESCE(total_earnings, 0) + v_payment_amount
  WHERE user_id = v_freelancer_id;

  -- Mark task as completed with payment released
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
$$;


--
-- Name: unlink_telegram_account(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlink_telegram_account(p_chat_id text) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Deactivate all links with this chat_id
  UPDATE public.telegram_links
  SET is_active = false, updated_at = now()
  WHERE telegram_chat_id = p_chat_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'لم يتم العثور على ربط لحسابك.'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'تم فصل الربط بنجاح'::TEXT;
END;
$$;


--
-- Name: update_conversation_last_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_last_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.support_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_track_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_track_progress() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_track_id UUID;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_percentage NUMERIC(5,2);
BEGIN
  -- Get track_id from the lesson
  SELECT lm.track_id INTO v_track_id
  FROM learning_lessons ll
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE ll.id = NEW.lesson_id;

  IF v_track_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total active lessons in track
  SELECT COUNT(*) INTO v_total_lessons
  FROM learning_lessons ll
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE lm.track_id = v_track_id AND ll.is_active = true;

  -- Count completed lessons by user in track
  SELECT COUNT(*) INTO v_completed_lessons
  FROM user_lesson_progress ulp
  JOIN learning_lessons ll ON ulp.lesson_id = ll.id
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE ulp.user_id = NEW.user_id 
    AND lm.track_id = v_track_id 
    AND ulp.is_completed = true;

  -- Calculate percentage
  v_percentage := CASE 
    WHEN v_total_lessons > 0 THEN (v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100 
    ELSE 0 
  END;

  -- Upsert track progress
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_message_sender(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_message_sender() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  sender_role app_role;
  request_owner_id UUID;
  assigned_freelancer_id UUID;
BEGIN
  -- Verify sender_id matches authenticated user
  IF NEW.sender_id != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'sender_id must match authenticated user';
  END IF;

  -- Get sender's role
  SELECT role INTO sender_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  
  -- Get request owner and assigned freelancer
  SELECT r.user_id INTO request_owner_id
  FROM requests r WHERE r.id = NEW.request_id;
  
  SELECT a.freelancer_id INTO assigned_freelancer_id
  FROM assignments a WHERE a.request_id = NEW.request_id AND a.is_active = true LIMIT 1;
  
  -- Allow admins to send messages to anyone
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- Client can only send messages if they own the request (chat with admin/platform)
  IF sender_role = 'client' THEN
    IF request_owner_id != auth.uid() THEN
      RAISE EXCEPTION 'You can only send messages to your own requests';
    END IF;
    RETURN NEW;
  END IF;
  
  -- Freelancer can only send messages if they are assigned to the request
  IF sender_role = 'freelancer' THEN
    IF assigned_freelancer_id != auth.uid() THEN
      RAISE EXCEPTION 'You can only send messages to requests you are assigned to';
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: verify_telegram_link_code(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_telegram_link_code(p_code text, p_telegram_chat_id text, p_telegram_user_id text DEFAULT NULL::text, p_telegram_username text DEFAULT NULL::text) RETURNS TABLE(success boolean, user_id uuid, user_type text, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_link_code RECORD;
BEGIN
  -- Find valid code
  SELECT * INTO v_link_code
  FROM public.telegram_link_codes
  WHERE code = upper(p_code)
    AND used_at IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'الكود غير صالح أو منتهي الصلاحية'::TEXT;
    RETURN;
  END IF;
  
  -- Deactivate any existing active links for this user
  UPDATE public.telegram_links
  SET is_active = false, updated_at = now()
  WHERE telegram_links.user_id = v_link_code.user_id AND is_active = true;
  
  -- Deactivate any existing links with this telegram_chat_id
  UPDATE public.telegram_links
  SET is_active = false, updated_at = now()
  WHERE telegram_chat_id = p_telegram_chat_id AND is_active = true;
  
  -- Create new link
  INSERT INTO public.telegram_links (
    user_id, 
    user_type,
    telegram_chat_id, 
    telegram_user_id, 
    telegram_username,
    is_active
  )
  VALUES (
    v_link_code.user_id,
    v_link_code.user_type,
    p_telegram_chat_id,
    p_telegram_user_id,
    p_telegram_username,
    true
  );
  
  -- Mark code as used
  UPDATE public.telegram_link_codes
  SET used_at = now()
  WHERE id = v_link_code.id;
  
  RETURN QUERY SELECT true, v_link_code.user_id, v_link_code.user_type, 'تم ربط الحساب بنجاح'::TEXT;
END;
$$;


--
-- Name: admin_setup_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_setup_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    attempt_time timestamp with time zone DEFAULT now() NOT NULL,
    success boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_bot_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_bot_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    welcome_message text DEFAULT 'مرحبًا! أنا المساعد الذكي للمنصّة، كيف أقدر أساعدك؟'::text,
    allowed_actions jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_type text NOT NULL,
    intent text,
    status text DEFAULT 'open'::text NOT NULL,
    topic text,
    last_action text,
    action_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_conversations_intent_check CHECK ((intent = ANY (ARRAY['support_ticket'::text, 'new_request'::text, 'account_update'::text, 'general_question'::text]))),
    CONSTRAINT ai_conversations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text]))),
    CONSTRAINT ai_conversations_user_type_check CHECK ((user_type = ANY (ARRAY['client'::text, 'freelancer'::text, 'admin'::text])))
);


--
-- Name: ai_knowledge_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    tags text[],
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_type text NOT NULL,
    content text NOT NULL,
    step_key text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_messages_sender_type_check CHECK ((sender_type = ANY (ARRAY['user'::text, 'bot'::text, 'admin'::text])))
);


--
-- Name: ai_support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_type text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'resolved'::text]))),
    CONSTRAINT ai_support_tickets_user_type_check CHECK ((user_type = ANY (ARRAY['client'::text, 'freelancer'::text])))
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    payment_amount numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    suggested_payment numeric DEFAULT 0,
    pricing_factors jsonb DEFAULT '{}'::jsonb,
    freelancer_accepted boolean,
    freelancer_accepted_at timestamp with time zone
);


--
-- Name: assignments_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.assignments_safe WITH (security_invoker='true') AS
 SELECT id,
    request_id,
    freelancer_id,
    assigned_at,
    started_at,
    completed_at,
    is_active,
    notes,
    assigned_by
   FROM public.assignments;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brand_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    assigned_by uuid,
    role text,
    status text DEFAULT 'active'::text,
    payment_amount numeric DEFAULT 0,
    notes text,
    assigned_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);


--
-- Name: brand_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    task_id uuid,
    freelancer_id uuid NOT NULL,
    files jsonb DEFAULT '[]'::jsonb,
    notes text,
    is_approved boolean DEFAULT false,
    is_visible_to_client boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: brand_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: brand_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    user_id uuid NOT NULL,
    invoice_number text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    payment_method text,
    payment_reference text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: brand_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    note text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: brand_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    assignment_id uuid,
    freelancer_id uuid,
    title text NOT NULL,
    description text,
    requirements text,
    status text DEFAULT 'pending'::text,
    deadline timestamp with time zone,
    payment_amount numeric DEFAULT 0,
    delivery_notes text,
    delivery_files jsonb DEFAULT '[]'::jsonb,
    admin_notes text,
    qc_notes text,
    qc_reviewed_at timestamp with time zone,
    qc_reviewer_id uuid,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    industry text,
    logo_url text,
    colors jsonb DEFAULT '{}'::jsonb,
    fonts jsonb DEFAULT '{}'::jsonb,
    social_links jsonb DEFAULT '{}'::jsonb,
    website text,
    status text DEFAULT 'pending'::text,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_suspended boolean DEFAULT false,
    suspended_at timestamp with time zone,
    suspended_by uuid,
    suspension_reason text,
    CONSTRAINT brands_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'active'::text])))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    icon text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id uuid
);


--
-- Name: client_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    credits_remaining integer DEFAULT 0 NOT NULL,
    revisions_used integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cms_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    title_ar text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb,
    meta_title text,
    meta_description text,
    is_published boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    page_blocks jsonb DEFAULT '[]'::jsonb,
    og_image text,
    schema_type text DEFAULT 'WebPage'::text,
    is_in_menu boolean DEFAULT false,
    menu_order integer DEFAULT 0
);


--
-- Name: cms_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid,
    key text NOT NULL,
    title text,
    title_ar text,
    content text,
    content_ar text,
    image_url text,
    settings jsonb DEFAULT '{}'::jsonb,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupon_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    type public.coupon_type DEFAULT 'percent'::public.coupon_type NOT NULL,
    value numeric(10,2) NOT NULL,
    min_order_amount numeric(10,2) DEFAULT 0,
    max_uses integer,
    uses_count integer DEFAULT 0 NOT NULL,
    max_uses_per_user integer DEFAULT 1,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    first_time_only boolean DEFAULT false NOT NULL,
    allowed_products uuid[] DEFAULT '{}'::uuid[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    track_id uuid NOT NULL,
    order_id uuid,
    enrolled_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    progress_percentage integer DEFAULT 0,
    completed_at timestamp with time zone
);


--
-- Name: credits_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credits_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    type text NOT NULL,
    reference_id uuid,
    reference_type text,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    status public.delivery_status DEFAULT 'pending'::public.delivery_status NOT NULL,
    files jsonb DEFAULT '[]'::jsonb,
    notes text,
    qc_reviewer_id uuid,
    qc_notes text,
    qc_reviewed_at timestamp with time zone,
    revision_number integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    opened_by uuid NOT NULL,
    status public.dispute_status DEFAULT 'opened'::public.dispute_status NOT NULL,
    reason text NOT NULL,
    resolution text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: freelancer_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freelancer_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    issuer text,
    issue_date date,
    expiry_date date,
    credential_id text,
    credential_url text,
    file_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: freelancer_portfolios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freelancer_portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    slug text NOT NULL,
    title text,
    subtitle text,
    headline text,
    bio text,
    avatar_url text,
    hero_settings jsonb,
    template_id uuid,
    completion_percentage numeric(5,2) DEFAULT 0,
    is_public boolean DEFAULT true NOT NULL,
    client_view_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cover_image text,
    show_email boolean DEFAULT false,
    show_phone boolean DEFAULT false,
    status text DEFAULT 'draft'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text
);


--
-- Name: freelancer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freelancer_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bio text,
    skills jsonb DEFAULT '[]'::jsonb,
    portfolio_url text,
    hourly_rate numeric(10,2),
    is_verified boolean DEFAULT false NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    verification_status text DEFAULT 'pending'::text,
    total_earnings numeric(12,2) DEFAULT 0 NOT NULL,
    completed_tasks integer DEFAULT 0 NOT NULL,
    rating numeric(3,2) DEFAULT 0,
    categories uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    experience text,
    withdrawal_methods jsonb DEFAULT '[]'::jsonb,
    stars integer DEFAULT 0,
    training_completed integer DEFAULT 0,
    cv_url text,
    linkedin_url text,
    github_url text,
    additional_info jsonb DEFAULT '{}'::jsonb,
    identity_verified boolean DEFAULT false,
    username text
);


--
-- Name: freelancer_public_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.freelancer_public_profiles WITH (security_invoker='true') AS
 SELECT id,
    encode(sha256(((user_id)::text)::bytea), 'hex'::text) AS display_id,
    bio,
    skills,
    categories,
    rating,
    completed_tasks,
    is_verified,
    is_available
   FROM public.freelancer_profiles fp
  WHERE ((is_verified = true) AND (is_available = true));


--
-- Name: freelancer_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freelancer_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    level text,
    category text,
    years_experience integer,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: header_footer_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.header_footer_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_type text NOT NULL,
    design_variant text DEFAULT 'default'::text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: identity_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_type text DEFAULT 'client'::text NOT NULL,
    full_name text NOT NULL,
    national_id text NOT NULL,
    date_of_birth date,
    gender text,
    nationality text DEFAULT 'مصري'::text,
    address text NOT NULL,
    city text NOT NULL,
    governorate text,
    postal_code text,
    id_front_url text NOT NULL,
    id_back_url text NOT NULL,
    selfie_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: learning_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    title text NOT NULL,
    title_ar text NOT NULL,
    content text,
    content_ar text,
    video_url text,
    resources jsonb DEFAULT '[]'::jsonb,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    duration_minutes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    video_type text DEFAULT 'youtube'::text,
    video_file_url text
);


--
-- Name: learning_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    track_id uuid NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    required_stars integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: learning_tracks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    level text DEFAULT 'beginner'::text NOT NULL,
    icon text,
    cover_image text,
    is_active boolean DEFAULT true,
    required_stars integer DEFAULT 0,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    price numeric(10,2) DEFAULT 0,
    is_free boolean DEFAULT true,
    enrollment_count integer DEFAULT 0,
    video_intro_url text,
    video_intro_type text DEFAULT 'youtube'::text,
    audience text DEFAULT 'all'::text,
    target_categories text[],
    CONSTRAINT learning_tracks_audience_check CHECK ((audience = ANY (ARRAY['all'::text, 'freelancers'::text, 'clients'::text, 'both'::text])))
);


--
-- Name: lesson_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_type text DEFAULT 'client'::text NOT NULL,
    content text NOT NULL,
    parent_id uuid,
    is_admin_reply boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lesson_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: navigation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navigation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location text DEFAULT 'header'::text NOT NULL,
    label text NOT NULL,
    label_ar text NOT NULL,
    url text NOT NULL,
    target text DEFAULT '_self'::text,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    visibility text DEFAULT 'all'::text NOT NULL,
    icon text,
    description text,
    CONSTRAINT navigation_items_visibility_check CHECK ((visibility = ANY (ARRAY['all'::text, 'guest'::text, 'authenticated'::text])))
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    source text DEFAULT 'footer'::text
);


--
-- Name: notification_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_key text NOT NULL,
    description text,
    channel_in_app boolean DEFAULT true NOT NULL,
    channel_telegram boolean DEFAULT false NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    reference_type text,
    reference_id uuid,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    user_id uuid NOT NULL,
    status public.order_status DEFAULT 'cart'::public.order_status NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    tax numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    coupon_id uuid,
    payment_method text,
    payment_reference text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_receipt_url text
);


--
-- Name: orders_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.orders_safe WITH (security_invoker='true') AS
 SELECT id,
    user_id,
    order_number,
    status,
    subtotal,
    discount,
    tax,
    total,
    coupon_id,
    paid_at,
    created_at,
    updated_at
   FROM public.orders;


--
-- Name: payment_collection_invoice_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_collection_invoice_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_collection_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_collection_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text,
    freelancer_id uuid NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    client_country text,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text,
    token text NOT NULL,
    kashier_order_id text,
    kashier_transaction_id text,
    payment_url text,
    expires_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    flagged boolean DEFAULT false,
    flagged_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_collection_invoices_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_collection_invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: payment_collection_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_collection_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    is_enabled boolean DEFAULT false,
    usage_purpose text,
    expected_monthly_amount text,
    has_international_clients boolean,
    agreed_to_terms boolean DEFAULT false,
    agreed_at timestamp with time zone,
    suspended_by uuid,
    suspended_at timestamp with time zone,
    suspension_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    credits_per_month integer DEFAULT 0 NOT NULL,
    max_task_size public.task_size DEFAULT 'medium'::public.task_size NOT NULL,
    revisions_limit integer DEFAULT 1 NOT NULL,
    sla_hours integer,
    qc_level text DEFAULT 'standard'::text,
    priority_assignment boolean DEFAULT false NOT NULL,
    is_free boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    freelancer_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    project_type text,
    images jsonb DEFAULT '[]'::jsonb,
    external_link text,
    is_visible boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    tools_used text[],
    completion_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: portfolio_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    section_key text NOT NULL,
    title text,
    settings jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    freelancer_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    price_egp numeric(10,2) NOT NULL,
    estimated_days integer,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: portfolio_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    preview_image_url text,
    default_settings jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    credits integer DEFAULT 0,
    plan_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    track_id uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    email text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_banned boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    address text,
    city text,
    governorate text,
    date_of_birth date,
    national_id text,
    identity_verified boolean DEFAULT false
);


--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    freelancer_id uuid,
    title text NOT NULL,
    description text,
    requirements text,
    status text DEFAULT 'pending'::text,
    deadline timestamp with time zone,
    payment_amount numeric DEFAULT 0,
    delivery_notes text,
    delivery_files jsonb,
    admin_notes text,
    assigned_at timestamp with time zone,
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    suggested_payment numeric DEFAULT 0,
    pricing_factors jsonb DEFAULT '{}'::jsonb,
    freelancer_accepted boolean,
    freelancer_accepted_at timestamp with time zone,
    CONSTRAINT project_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'assigned'::text, 'in_progress'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: referral_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_type text NOT NULL,
    referral_count integer DEFAULT 0 NOT NULL,
    rewards_earned integer DEFAULT 0 NOT NULL,
    last_reward_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referral_rewards_user_type_check CHECK ((user_type = ANY (ARRAY['client'::text, 'freelancer'::text])))
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid,
    referrer_type text NOT NULL,
    referral_code text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT referrals_referrer_type_check CHECK ((referrer_type = ANY (ARRAY['client'::text, 'freelancer'::text]))),
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'expired'::text])))
);


--
-- Name: request_info_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_info_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    info_request_id uuid NOT NULL,
    client_id uuid NOT NULL,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: request_info_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_info_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    title text,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: request_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.request_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: request_public_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_public_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    token text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: request_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    client_id uuid NOT NULL,
    quality integer NOT NULL,
    speed integer NOT NULL,
    communication integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_ratings_communication_check CHECK (((communication >= 1) AND (communication <= 5))),
    CONSTRAINT request_ratings_quality_check CHECK (((quality >= 1) AND (quality <= 5))),
    CONSTRAINT request_ratings_speed_check CHECK (((speed >= 1) AND (speed <= 5)))
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb,
    type text DEFAULT 'string'::text NOT NULL,
    group_name text DEFAULT 'general'::text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_public boolean DEFAULT true
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb,
    category text DEFAULT 'general'::text,
    is_public boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_type text NOT NULL,
    subject text,
    request_id uuid,
    status text DEFAULT 'open'::text,
    priority text DEFAULT 'normal'::text,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT support_conversations_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT support_conversations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'pending'::text]))),
    CONSTRAINT support_conversations_user_type_check CHECK ((user_type = ANY (ARRAY['client'::text, 'freelancer'::text])))
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_type text NOT NULL,
    message text NOT NULL,
    attachments jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT support_messages_sender_type_check CHECK ((sender_type = ANY (ARRAY['client'::text, 'freelancer'::text, 'admin'::text])))
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    request_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text NOT NULL,
    created_by uuid NOT NULL,
    assigned_to uuid,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'doing'::text, 'done'::text])))
);


--
-- Name: telegram_bot_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_bot_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_key character varying(100) NOT NULL,
    message_template text NOT NULL,
    description character varying(255),
    variables text[] DEFAULT ARRAY[]::text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audience text DEFAULT 'client'::text,
    event_key text,
    CONSTRAINT telegram_bot_messages_audience_check CHECK ((audience = ANY (ARRAY['client'::text, 'freelancer'::text, 'admin'::text, 'all'::text])))
);


--
-- Name: telegram_link_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_link_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_type text DEFAULT 'client'::text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_link_codes_user_type_check CHECK ((user_type = ANY (ARRAY['client'::text, 'freelancer'::text, 'admin'::text])))
);


--
-- Name: telegram_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_type text DEFAULT 'client'::text NOT NULL,
    telegram_chat_id text NOT NULL,
    telegram_user_id text,
    telegram_username text,
    is_active boolean DEFAULT true NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_links_user_type_check CHECK ((user_type = ANY (ARRAY['client'::text, 'freelancer'::text, 'admin'::text])))
);


--
-- Name: telegram_messages_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_messages_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    telegram_chat_id text,
    message_type text NOT NULL,
    message_text text,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_template_variables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_template_variables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audience text NOT NULL,
    message_key text NOT NULL,
    variable_name text NOT NULL,
    description text,
    sample_value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_template_variables_audience_check CHECK ((audience = ANY (ARRAY['client'::text, 'freelancer'::text, 'admin'::text, 'all'::text])))
);


--
-- Name: telegram_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_key text NOT NULL,
    audience text DEFAULT 'all'::text NOT NULL,
    template_text text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_templates_audience_check CHECK ((audience = ANY (ARRAY['client'::text, 'freelancer'::text, 'admin'::text, 'all'::text])))
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text,
    content text NOT NULL,
    avatar_url text,
    rating integer DEFAULT 5,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT testimonials_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: ticket_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid,
    freelancer_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    delivery_notes text,
    delivery_files jsonb,
    admin_feedback text,
    stars_earned integer DEFAULT 0,
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT training_assignments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'in_progress'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: training_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    requirements text,
    category_id uuid,
    difficulty text DEFAULT 'easy'::text,
    credits_reward integer DEFAULT 0,
    stars_reward integer DEFAULT 1,
    deadline_hours integer DEFAULT 24,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    module_id uuid,
    lesson_id uuid,
    track_id uuid,
    is_mandatory boolean DEFAULT false,
    min_stars_required integer DEFAULT 0,
    audience text DEFAULT 'freelancers'::text,
    target_categories text[],
    is_category_specific boolean DEFAULT false,
    CONSTRAINT training_tasks_audience_check CHECK ((audience = ANY (ARRAY['all'::text, 'freelancers'::text]))),
    CONSTRAINT training_tasks_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))
);


--
-- Name: user_lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    is_completed boolean DEFAULT false,
    watched_seconds integer DEFAULT 0,
    total_seconds integer DEFAULT 0,
    watch_percentage numeric(5,2) DEFAULT 0,
    last_watched_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'client'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_track_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_track_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    track_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    progress_percentage numeric(5,2) DEFAULT 0,
    current_module_id uuid,
    current_lesson_id uuid,
    certificate_issued boolean DEFAULT false,
    certificate_issued_at timestamp with time zone,
    certificate_number text,
    lessons_completed integer DEFAULT 0,
    total_lessons integer DEFAULT 0,
    last_accessed_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: wallet_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    type text NOT NULL,
    reference_id uuid,
    reference_type text,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    payment_details jsonb,
    processed_by uuid,
    processed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_setup_attempts admin_setup_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_setup_attempts
    ADD CONSTRAINT admin_setup_attempts_pkey PRIMARY KEY (id);


--
-- Name: ai_bot_settings ai_bot_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_bot_settings
    ADD CONSTRAINT ai_bot_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_knowledge_base ai_knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_knowledge_base
    ADD CONSTRAINT ai_knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_support_tickets ai_support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_support_tickets
    ADD CONSTRAINT ai_support_tickets_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: brand_assignments brand_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_assignments
    ADD CONSTRAINT brand_assignments_pkey PRIMARY KEY (id);


--
-- Name: brand_deliveries brand_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_deliveries
    ADD CONSTRAINT brand_deliveries_pkey PRIMARY KEY (id);


--
-- Name: brand_goals brand_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_goals
    ADD CONSTRAINT brand_goals_pkey PRIMARY KEY (id);


--
-- Name: brand_invoices brand_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_invoices
    ADD CONSTRAINT brand_invoices_pkey PRIMARY KEY (id);


--
-- Name: brand_notes brand_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_notes
    ADD CONSTRAINT brand_notes_pkey PRIMARY KEY (id);


--
-- Name: brand_tasks brand_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_tasks
    ADD CONSTRAINT brand_tasks_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: client_subscriptions client_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: cms_pages cms_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_pkey PRIMARY KEY (id);


--
-- Name: cms_pages cms_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_slug_key UNIQUE (slug);


--
-- Name: cms_sections cms_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_sections
    ADD CONSTRAINT cms_sections_pkey PRIMARY KEY (id);


--
-- Name: coupon_redemptions coupon_redemptions_coupon_id_user_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_id_user_id_order_id_key UNIQUE (coupon_id, user_id, order_id);


--
-- Name: coupon_redemptions coupon_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_user_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_user_id_track_id_key UNIQUE (user_id, track_id);


--
-- Name: credits_ledger credits_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits_ledger
    ADD CONSTRAINT credits_ledger_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: freelancer_certificates freelancer_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_certificates
    ADD CONSTRAINT freelancer_certificates_pkey PRIMARY KEY (id);


--
-- Name: freelancer_portfolios freelancer_portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_portfolios
    ADD CONSTRAINT freelancer_portfolios_pkey PRIMARY KEY (id);


--
-- Name: freelancer_portfolios freelancer_portfolios_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_portfolios
    ADD CONSTRAINT freelancer_portfolios_slug_key UNIQUE (slug);


--
-- Name: freelancer_portfolios freelancer_portfolios_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_portfolios
    ADD CONSTRAINT freelancer_portfolios_user_unique UNIQUE (user_id);


--
-- Name: freelancer_profiles freelancer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_profiles
    ADD CONSTRAINT freelancer_profiles_pkey PRIMARY KEY (id);


--
-- Name: freelancer_profiles freelancer_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_profiles
    ADD CONSTRAINT freelancer_profiles_user_id_key UNIQUE (user_id);


--
-- Name: freelancer_skills freelancer_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_skills
    ADD CONSTRAINT freelancer_skills_pkey PRIMARY KEY (id);


--
-- Name: header_footer_settings header_footer_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.header_footer_settings
    ADD CONSTRAINT header_footer_settings_pkey PRIMARY KEY (id);


--
-- Name: header_footer_settings header_footer_settings_setting_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.header_footer_settings
    ADD CONSTRAINT header_footer_settings_setting_type_key UNIQUE (setting_type);


--
-- Name: identity_verifications identity_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_verifications
    ADD CONSTRAINT identity_verifications_pkey PRIMARY KEY (id);


--
-- Name: learning_lessons learning_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_lessons
    ADD CONSTRAINT learning_lessons_pkey PRIMARY KEY (id);


--
-- Name: learning_modules learning_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_modules
    ADD CONSTRAINT learning_modules_pkey PRIMARY KEY (id);


--
-- Name: learning_tracks learning_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_tracks
    ADD CONSTRAINT learning_tracks_pkey PRIMARY KEY (id);


--
-- Name: lesson_comments lesson_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_comments
    ADD CONSTRAINT lesson_comments_pkey PRIMARY KEY (id);


--
-- Name: lesson_likes lesson_likes_lesson_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_likes
    ADD CONSTRAINT lesson_likes_lesson_id_user_id_key UNIQUE (lesson_id, user_id);


--
-- Name: lesson_likes lesson_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_likes
    ADD CONSTRAINT lesson_likes_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: navigation_items navigation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigation_items
    ADD CONSTRAINT navigation_items_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notification_rules notification_rules_event_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT notification_rules_event_key_unique UNIQUE (event_key);


--
-- Name: notification_rules notification_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT notification_rules_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_collection_invoices payment_collection_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_invoices
    ADD CONSTRAINT payment_collection_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: payment_collection_invoices payment_collection_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_invoices
    ADD CONSTRAINT payment_collection_invoices_pkey PRIMARY KEY (id);


--
-- Name: payment_collection_invoices payment_collection_invoices_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_invoices
    ADD CONSTRAINT payment_collection_invoices_token_key UNIQUE (token);


--
-- Name: payment_collection_settings payment_collection_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_settings
    ADD CONSTRAINT payment_collection_settings_pkey PRIMARY KEY (id);


--
-- Name: payment_collection_settings payment_collection_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_settings
    ADD CONSTRAINT payment_collection_settings_user_id_key UNIQUE (user_id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: portfolio_projects portfolio_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_projects
    ADD CONSTRAINT portfolio_projects_pkey PRIMARY KEY (id);


--
-- Name: portfolio_sections portfolio_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_sections
    ADD CONSTRAINT portfolio_sections_pkey PRIMARY KEY (id);


--
-- Name: portfolio_services portfolio_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_services
    ADD CONSTRAINT portfolio_services_pkey PRIMARY KEY (id);


--
-- Name: portfolio_templates portfolio_templates_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_templates
    ADD CONSTRAINT portfolio_templates_key_key UNIQUE (key);


--
-- Name: portfolio_templates portfolio_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_templates
    ADD CONSTRAINT portfolio_templates_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: referral_rewards referral_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_code_key UNIQUE (referral_code);


--
-- Name: request_info_replies request_info_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_info_replies
    ADD CONSTRAINT request_info_replies_pkey PRIMARY KEY (id);


--
-- Name: request_info_requests request_info_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_info_requests
    ADD CONSTRAINT request_info_requests_pkey PRIMARY KEY (id);


--
-- Name: request_public_links request_public_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_public_links
    ADD CONSTRAINT request_public_links_pkey PRIMARY KEY (id);


--
-- Name: request_public_links request_public_links_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_public_links
    ADD CONSTRAINT request_public_links_token_key UNIQUE (token);


--
-- Name: request_ratings request_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_ratings
    ADD CONSTRAINT request_ratings_pkey PRIMARY KEY (id);


--
-- Name: request_ratings request_ratings_request_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_ratings
    ADD CONSTRAINT request_ratings_request_id_client_id_key UNIQUE (request_id, client_id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: requests requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_request_number_key UNIQUE (request_number);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_key UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: support_conversations support_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: telegram_bot_messages telegram_bot_messages_message_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bot_messages
    ADD CONSTRAINT telegram_bot_messages_message_key_key UNIQUE (message_key);


--
-- Name: telegram_bot_messages telegram_bot_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bot_messages
    ADD CONSTRAINT telegram_bot_messages_pkey PRIMARY KEY (id);


--
-- Name: telegram_link_codes telegram_link_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_link_codes
    ADD CONSTRAINT telegram_link_codes_code_key UNIQUE (code);


--
-- Name: telegram_link_codes telegram_link_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_link_codes
    ADD CONSTRAINT telegram_link_codes_pkey PRIMARY KEY (id);


--
-- Name: telegram_links telegram_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_links
    ADD CONSTRAINT telegram_links_pkey PRIMARY KEY (id);


--
-- Name: telegram_links telegram_links_user_id_is_active_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_links
    ADD CONSTRAINT telegram_links_user_id_is_active_key UNIQUE (user_id, is_active);


--
-- Name: telegram_messages_log telegram_messages_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_messages_log
    ADD CONSTRAINT telegram_messages_log_pkey PRIMARY KEY (id);


--
-- Name: telegram_template_variables telegram_template_variables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_template_variables
    ADD CONSTRAINT telegram_template_variables_pkey PRIMARY KEY (id);


--
-- Name: telegram_templates telegram_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_templates
    ADD CONSTRAINT telegram_templates_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: ticket_replies ticket_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_replies
    ADD CONSTRAINT ticket_replies_pkey PRIMARY KEY (id);


--
-- Name: training_assignments training_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_assignments
    ADD CONSTRAINT training_assignments_pkey PRIMARY KEY (id);


--
-- Name: training_tasks training_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_tasks
    ADD CONSTRAINT training_tasks_pkey PRIMARY KEY (id);


--
-- Name: user_lesson_progress user_lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: user_lesson_progress user_lesson_progress_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_track_progress user_track_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_progress
    ADD CONSTRAINT user_track_progress_pkey PRIMARY KEY (id);


--
-- Name: user_track_progress user_track_progress_user_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_progress
    ADD CONSTRAINT user_track_progress_user_id_track_id_key UNIQUE (user_id, track_id);


--
-- Name: wallet_ledger wallet_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_pkey PRIMARY KEY (id);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_setup_attempts_ip_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_setup_attempts_ip_time ON public.admin_setup_attempts USING btree (ip_address, attempt_time DESC);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_cms_pages_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_pages_slug ON public.cms_pages USING btree (slug);


--
-- Name: idx_cms_sections_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_sections_key ON public.cms_sections USING btree (key);


--
-- Name: idx_freelancer_portfolios_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_freelancer_portfolios_slug ON public.freelancer_portfolios USING btree (slug);


--
-- Name: idx_freelancer_portfolios_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_freelancer_portfolios_status ON public.freelancer_portfolios USING btree (status);


--
-- Name: idx_freelancer_profiles_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_freelancer_profiles_username ON public.freelancer_profiles USING btree (username) WHERE (username IS NOT NULL);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_request_id ON public.messages USING btree (request_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_payment_collection_invoices_freelancer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_collection_invoices_freelancer_id ON public.payment_collection_invoices USING btree (freelancer_id);


--
-- Name: idx_payment_collection_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_collection_invoices_status ON public.payment_collection_invoices USING btree (status);


--
-- Name: idx_payment_collection_invoices_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_collection_invoices_token ON public.payment_collection_invoices USING btree (token);


--
-- Name: idx_payment_collection_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_collection_settings_user_id ON public.payment_collection_settings USING btree (user_id);


--
-- Name: idx_portfolio_projects_freelancer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_projects_freelancer ON public.portfolio_projects USING btree (freelancer_id);


--
-- Name: idx_portfolio_projects_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_projects_visible ON public.portfolio_projects USING btree (is_visible);


--
-- Name: idx_portfolio_services_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_services_active ON public.portfolio_services USING btree (is_active);


--
-- Name: idx_portfolio_services_freelancer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_services_freelancer ON public.portfolio_services USING btree (freelancer_id);


--
-- Name: idx_referrals_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);


--
-- Name: idx_referrals_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);


--
-- Name: idx_support_conversations_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_request_id ON public.support_conversations USING btree (request_id);


--
-- Name: idx_support_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_status ON public.support_conversations USING btree (status);


--
-- Name: idx_support_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_conversations_user_id ON public.support_conversations USING btree (user_id);


--
-- Name: idx_support_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_conversation_id ON public.support_messages USING btree (conversation_id);


--
-- Name: idx_support_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_created_at ON public.support_messages USING btree (created_at DESC);


--
-- Name: idx_tasks_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignment_id ON public.tasks USING btree (assignment_id);


--
-- Name: idx_tasks_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_request_id ON public.tasks USING btree (request_id);


--
-- Name: idx_telegram_link_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_link_codes_code ON public.telegram_link_codes USING btree (code);


--
-- Name: idx_telegram_link_codes_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_link_codes_expires ON public.telegram_link_codes USING btree (expires_at);


--
-- Name: idx_telegram_links_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_links_active ON public.telegram_links USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_telegram_links_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_links_chat_id ON public.telegram_links USING btree (telegram_chat_id);


--
-- Name: idx_telegram_links_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_links_user_id ON public.telegram_links USING btree (user_id);


--
-- Name: idx_telegram_messages_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_messages_log_created ON public.telegram_messages_log USING btree (created_at DESC);


--
-- Name: idx_telegram_messages_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_messages_log_user ON public.telegram_messages_log USING btree (user_id);


--
-- Name: requests_user_idempotency_key_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX requests_user_idempotency_key_unique ON public.requests USING btree (user_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: ai_knowledge_base ai_knowledge_base_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ai_knowledge_base_set_updated_at BEFORE UPDATE ON public.ai_knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders auto_fulfill_free_order_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_fulfill_free_order_trigger BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.auto_fulfill_free_order();


--
-- Name: learning_tracks create_product_for_paid_track_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_product_for_paid_track_trigger AFTER INSERT OR UPDATE ON public.learning_tracks FOR EACH ROW EXECUTE FUNCTION public.create_product_for_paid_track();


--
-- Name: orders generate_order_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON public.orders FOR EACH ROW WHEN (((new.order_number IS NULL) OR (new.order_number = ''::text))) EXECUTE FUNCTION public.generate_order_number();


--
-- Name: payment_collection_invoices generate_payment_collection_invoice_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_payment_collection_invoice_number_trigger BEFORE INSERT ON public.payment_collection_invoices FOR EACH ROW EXECUTE FUNCTION public.generate_payment_collection_invoice_number();


--
-- Name: requests generate_request_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_request_number_trigger BEFORE INSERT ON public.requests FOR EACH ROW WHEN (((new.request_number IS NULL) OR (new.request_number = ''::text))) EXECUTE FUNCTION public.generate_request_number();


--
-- Name: support_tickets generate_ticket_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_ticket_number_trigger BEFORE INSERT ON public.support_tickets FOR EACH ROW WHEN (((new.ticket_number IS NULL) OR (new.ticket_number = ''::text))) EXECUTE FUNCTION public.generate_ticket_number();


--
-- Name: support_conversations notify_admin_support_conversation_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_admin_support_conversation_trigger AFTER INSERT ON public.support_conversations FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_support_conversation();


--
-- Name: support_messages notify_admin_support_message_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_admin_support_message_trigger AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_support_message();


--
-- Name: assignments on_assignment_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_assignment_created AFTER INSERT ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.notify_on_assignment();


--
-- Name: assignments on_assignment_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_assignment_notify AFTER INSERT ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.notify_on_assignment();


--
-- Name: messages on_new_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();


--
-- Name: messages on_new_message_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_message_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();


--
-- Name: orders on_order_paid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_paid AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_order_paid();


--
-- Name: requests on_request_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_request_status_change AFTER UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.notify_on_status_change();


--
-- Name: requests on_request_status_change_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_request_status_change_notify AFTER UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.notify_on_status_change();


--
-- Name: wallet_ledger on_wallet_transaction_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_wallet_transaction_notify AFTER INSERT ON public.wallet_ledger FOR EACH ROW EXECUTE FUNCTION public.notify_on_wallet_transaction();


--
-- Name: withdrawals on_withdrawal_status_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_withdrawal_status_notify AFTER UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.notify_on_withdrawal_update();


--
-- Name: freelancer_certificates set_freelancer_certificates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_freelancer_certificates_updated_at BEFORE UPDATE ON public.freelancer_certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: freelancer_portfolios set_freelancer_portfolios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_freelancer_portfolios_updated_at BEFORE UPDATE ON public.freelancer_portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: freelancer_skills set_freelancer_skills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_freelancer_skills_updated_at BEFORE UPDATE ON public.freelancer_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders set_order_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();


--
-- Name: portfolio_sections set_portfolio_sections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_portfolio_sections_updated_at BEFORE UPDATE ON public.portfolio_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: portfolio_templates set_portfolio_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_portfolio_templates_updated_at BEFORE UPDATE ON public.portfolio_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: requests set_request_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_request_number BEFORE INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.generate_request_number();


--
-- Name: support_tickets set_ticket_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_ticket_number BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();


--
-- Name: orders trg_handle_order_paid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_handle_order_paid AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_order_paid();


--
-- Name: request_info_replies trg_mark_info_request_answered; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mark_info_request_answered AFTER INSERT ON public.request_info_replies FOR EACH ROW EXECUTE FUNCTION public.mark_info_request_answered();


--
-- Name: user_lesson_progress trigger_update_track_progress; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_track_progress AFTER INSERT OR UPDATE ON public.user_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.update_track_progress();


--
-- Name: brands update_brands_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_subscriptions update_client_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_client_subscriptions_updated_at BEFORE UPDATE ON public.client_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cms_pages update_cms_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cms_pages_updated_at BEFORE UPDATE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cms_sections update_cms_sections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cms_sections_updated_at BEFORE UPDATE ON public.cms_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_messages update_conversation_last_message_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversation_last_message_trigger AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();


--
-- Name: freelancer_profiles update_freelancer_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_freelancer_profiles_updated_at BEFORE UPDATE ON public.freelancer_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: identity_verifications update_identity_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_identity_verifications_updated_at BEFORE UPDATE ON public.identity_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learning_lessons update_learning_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learning_lessons_updated_at BEFORE UPDATE ON public.learning_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learning_modules update_learning_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learning_modules_updated_at BEFORE UPDATE ON public.learning_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learning_tracks update_learning_tracks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learning_tracks_updated_at BEFORE UPDATE ON public.learning_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_collection_invoices update_payment_collection_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_collection_invoices_updated_at BEFORE UPDATE ON public.payment_collection_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_collection_settings update_payment_collection_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_collection_settings_updated_at BEFORE UPDATE ON public.payment_collection_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: portfolio_projects update_portfolio_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_portfolio_projects_updated_at BEFORE UPDATE ON public.portfolio_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: portfolio_services update_portfolio_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_portfolio_services_updated_at BEFORE UPDATE ON public.portfolio_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_tasks update_project_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: referral_rewards update_referral_rewards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_referral_rewards_updated_at BEFORE UPDATE ON public.referral_rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: requests update_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_conversations update_support_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_conversations_updated_at BEFORE UPDATE ON public.support_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_bot_messages update_telegram_bot_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_bot_messages_updated_at BEFORE UPDATE ON public.telegram_bot_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_links update_telegram_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_links_updated_at BEFORE UPDATE ON public.telegram_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_lesson_progress update_track_progress_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_track_progress_trigger AFTER INSERT OR UPDATE OF is_completed ON public.user_lesson_progress FOR EACH ROW WHEN ((new.is_completed = true)) EXECUTE FUNCTION public.update_track_progress();


--
-- Name: training_tasks update_training_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_training_tasks_updated_at BEFORE UPDATE ON public.training_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages validate_message_sender_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_message_sender_trigger BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.validate_message_sender();


--
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;


--
-- Name: ai_support_tickets ai_support_tickets_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_support_tickets
    ADD CONSTRAINT ai_support_tickets_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: assignments assignments_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES auth.users(id);


--
-- Name: assignments assignments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: brand_assignments brand_assignments_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_assignments
    ADD CONSTRAINT brand_assignments_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: brand_deliveries brand_deliveries_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_deliveries
    ADD CONSTRAINT brand_deliveries_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: brand_deliveries brand_deliveries_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_deliveries
    ADD CONSTRAINT brand_deliveries_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.brand_tasks(id) ON DELETE CASCADE;


--
-- Name: brand_goals brand_goals_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_goals
    ADD CONSTRAINT brand_goals_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: brand_invoices brand_invoices_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_invoices
    ADD CONSTRAINT brand_invoices_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: brand_notes brand_notes_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_notes
    ADD CONSTRAINT brand_notes_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: brand_tasks brand_tasks_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_tasks
    ADD CONSTRAINT brand_tasks_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.brand_assignments(id) ON DELETE SET NULL;


--
-- Name: brand_tasks brand_tasks_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_tasks
    ADD CONSTRAINT brand_tasks_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: brands brands_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: client_subscriptions client_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: client_subscriptions client_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_subscriptions
    ADD CONSTRAINT client_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cms_sections cms_sections_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_sections
    ADD CONSTRAINT cms_sections_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.cms_pages(id) ON DELETE CASCADE;


--
-- Name: coupon_redemptions coupon_redemptions_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_redemptions coupon_redemptions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: coupon_redemptions coupon_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: course_enrollments course_enrollments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: course_enrollments course_enrollments_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.learning_tracks(id) ON DELETE CASCADE;


--
-- Name: credits_ledger credits_ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits_ledger
    ADD CONSTRAINT credits_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: credits_ledger credits_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits_ledger
    ADD CONSTRAINT credits_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES auth.users(id);


--
-- Name: deliveries deliveries_qc_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_qc_reviewer_id_fkey FOREIGN KEY (qc_reviewer_id) REFERENCES auth.users(id);


--
-- Name: deliveries deliveries_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: disputes disputes_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES auth.users(id);


--
-- Name: disputes disputes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: disputes disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: freelancer_portfolios freelancer_portfolios_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_portfolios
    ADD CONSTRAINT freelancer_portfolios_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.portfolio_templates(id) ON DELETE SET NULL;


--
-- Name: freelancer_profiles freelancer_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_profiles
    ADD CONSTRAINT freelancer_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: learning_lessons learning_lessons_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_lessons
    ADD CONSTRAINT learning_lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.learning_modules(id) ON DELETE CASCADE;


--
-- Name: learning_modules learning_modules_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_modules
    ADD CONSTRAINT learning_modules_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.learning_tracks(id) ON DELETE CASCADE;


--
-- Name: lesson_comments lesson_comments_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_comments
    ADD CONSTRAINT lesson_comments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.learning_lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_comments lesson_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_comments
    ADD CONSTRAINT lesson_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lesson_comments(id) ON DELETE CASCADE;


--
-- Name: lesson_likes lesson_likes_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_likes
    ADD CONSTRAINT lesson_likes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.learning_lessons(id) ON DELETE CASCADE;


--
-- Name: messages messages_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);


--
-- Name: navigation_items navigation_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navigation_items
    ADD CONSTRAINT navigation_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.navigation_items(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_collection_invoices payment_collection_invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_invoices
    ADD CONSTRAINT payment_collection_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: payment_collection_invoices payment_collection_invoices_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_invoices
    ADD CONSTRAINT payment_collection_invoices_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_collection_settings payment_collection_settings_suspended_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_settings
    ADD CONSTRAINT payment_collection_settings_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES auth.users(id);


--
-- Name: payment_collection_settings payment_collection_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_collection_settings
    ADD CONSTRAINT payment_collection_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: portfolio_sections portfolio_sections_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_sections
    ADD CONSTRAINT portfolio_sections_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.freelancer_portfolios(id) ON DELETE CASCADE;


--
-- Name: products products_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: products products_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.learning_tracks(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_tasks project_tasks_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES auth.users(id);


--
-- Name: project_tasks project_tasks_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: request_info_replies request_info_replies_info_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_info_replies
    ADD CONSTRAINT request_info_replies_info_request_id_fkey FOREIGN KEY (info_request_id) REFERENCES public.request_info_requests(id) ON DELETE CASCADE;


--
-- Name: request_info_requests request_info_requests_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_info_requests
    ADD CONSTRAINT request_info_requests_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: request_public_links request_public_links_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_public_links
    ADD CONSTRAINT request_public_links_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: request_ratings request_ratings_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_ratings
    ADD CONSTRAINT request_ratings_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: requests requests_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: requests requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: support_conversations support_conversations_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;


--
-- Name: support_messages support_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.support_conversations(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: ticket_replies ticket_replies_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_replies
    ADD CONSTRAINT ticket_replies_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_replies ticket_replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_replies
    ADD CONSTRAINT ticket_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: training_assignments training_assignments_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_assignments
    ADD CONSTRAINT training_assignments_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: training_assignments training_assignments_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_assignments
    ADD CONSTRAINT training_assignments_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: training_assignments training_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_assignments
    ADD CONSTRAINT training_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.training_tasks(id) ON DELETE CASCADE;


--
-- Name: training_tasks training_tasks_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_tasks
    ADD CONSTRAINT training_tasks_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: training_tasks training_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_tasks
    ADD CONSTRAINT training_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: training_tasks training_tasks_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_tasks
    ADD CONSTRAINT training_tasks_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.learning_lessons(id);


--
-- Name: training_tasks training_tasks_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_tasks
    ADD CONSTRAINT training_tasks_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.learning_modules(id);


--
-- Name: training_tasks training_tasks_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_tasks
    ADD CONSTRAINT training_tasks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.learning_tracks(id);


--
-- Name: user_lesson_progress user_lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.learning_lessons(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_track_progress user_track_progress_current_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_progress
    ADD CONSTRAINT user_track_progress_current_lesson_id_fkey FOREIGN KEY (current_lesson_id) REFERENCES public.learning_lessons(id);


--
-- Name: user_track_progress user_track_progress_current_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_progress
    ADD CONSTRAINT user_track_progress_current_module_id_fkey FOREIGN KEY (current_module_id) REFERENCES public.learning_modules(id);


--
-- Name: user_track_progress user_track_progress_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_progress
    ADD CONSTRAINT user_track_progress_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.learning_tracks(id) ON DELETE CASCADE;


--
-- Name: wallet_ledger wallet_ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: wallet_ledger wallet_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: withdrawals withdrawals_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);


--
-- Name: withdrawals withdrawals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: request_info_requests Admins can create info requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create info requests" ON public.request_info_requests FOR INSERT WITH CHECK ((public.is_admin(auth.uid()) AND public.can_view_request(request_id)));


--
-- Name: notifications Admins can create notifications for anyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create notifications for anyone" ON public.notifications FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: request_info_requests Admins can delete info requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete info requests" ON public.request_info_requests FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: newsletter_subscribers Admins can delete newsletter subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete newsletter subscribers" ON public.newsletter_subscribers FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: newsletter_subscribers Admins can delete subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete subscribers" ON public.newsletter_subscribers FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: payment_collection_invoices Admins can insert invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert invoices" ON public.payment_collection_invoices FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: assignments Admins can manage all assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all assignments" ON public.assignments TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: brand_assignments Admins can manage all brand assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all brand assignments" ON public.brand_assignments USING (public.is_admin(auth.uid()));


--
-- Name: brand_deliveries Admins can manage all brand deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all brand deliveries" ON public.brand_deliveries USING (public.is_admin(auth.uid()));


--
-- Name: brand_goals Admins can manage all brand goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all brand goals" ON public.brand_goals USING (public.is_admin(auth.uid()));


--
-- Name: brand_invoices Admins can manage all brand invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all brand invoices" ON public.brand_invoices USING (public.is_admin(auth.uid()));


--
-- Name: brand_notes Admins can manage all brand notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all brand notes" ON public.brand_notes USING (public.is_admin(auth.uid()));


--
-- Name: brand_tasks Admins can manage all brand tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all brand tasks" ON public.brand_tasks USING (public.is_admin(auth.uid()));


--
-- Name: deliveries Admins can manage all deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all deliveries" ON public.deliveries USING (public.is_admin(auth.uid()));


--
-- Name: disputes Admins can manage all disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all disputes" ON public.disputes USING (public.is_admin(auth.uid()));


--
-- Name: freelancer_profiles Admins can manage all freelancer profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all freelancer profiles" ON public.freelancer_profiles USING (public.is_admin(auth.uid()));


--
-- Name: messages Admins can manage all messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all messages" ON public.messages USING (public.is_admin(auth.uid()));


--
-- Name: notifications Admins can manage all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all notifications" ON public.notifications USING (public.is_admin(auth.uid()));


--
-- Name: order_items Admins can manage all order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all order items" ON public.order_items USING (public.is_admin(auth.uid()));


--
-- Name: orders Admins can manage all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all orders" ON public.orders USING (public.is_admin(auth.uid()));


--
-- Name: cms_pages Admins can manage all pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all pages" ON public.cms_pages USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can manage all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all profiles" ON public.profiles USING (public.is_admin(auth.uid()));


--
-- Name: coupon_redemptions Admins can manage all redemptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all redemptions" ON public.coupon_redemptions USING (public.is_admin(auth.uid()));


--
-- Name: ticket_replies Admins can manage all replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all replies" ON public.ticket_replies USING (public.is_admin(auth.uid()));


--
-- Name: requests Admins can manage all requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all requests" ON public.requests USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.is_admin(auth.uid()));


--
-- Name: site_settings Admins can manage all settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all settings" ON public.site_settings USING (public.is_admin(auth.uid()));


--
-- Name: client_subscriptions Admins can manage all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all subscriptions" ON public.client_subscriptions USING (public.is_admin(auth.uid()));


--
-- Name: tasks Admins can manage all tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tasks" ON public.tasks USING (public.is_admin(auth.uid()));


--
-- Name: support_tickets Admins can manage all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets USING (public.is_admin(auth.uid()));


--
-- Name: assignments Admins can manage assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage assignments" ON public.assignments USING (public.is_admin(auth.uid()));


--
-- Name: telegram_bot_messages Admins can manage bot messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage bot messages" ON public.telegram_bot_messages USING (public.is_admin(auth.uid()));


--
-- Name: brands Admins can manage brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage brands" ON public.brands USING (public.is_admin(auth.uid()));


--
-- Name: categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.categories USING (public.is_admin(auth.uid()));


--
-- Name: cms_pages Admins can manage cms pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cms pages" ON public.cms_pages USING (public.is_admin(auth.uid()));


--
-- Name: cms_sections Admins can manage cms sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cms sections" ON public.cms_sections USING (public.is_admin(auth.uid()));


--
-- Name: coupons Admins can manage coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage coupons" ON public.coupons USING (public.is_admin(auth.uid()));


--
-- Name: credits_ledger Admins can manage credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage credits" ON public.credits_ledger USING (public.is_admin(auth.uid()));


--
-- Name: disputes Admins can manage disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage disputes" ON public.disputes USING (public.is_admin(auth.uid()));


--
-- Name: course_enrollments Admins can manage enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage enrollments" ON public.course_enrollments USING (public.is_admin(auth.uid()));


--
-- Name: header_footer_settings Admins can manage header footer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage header footer" ON public.header_footer_settings USING (public.is_admin(auth.uid()));


--
-- Name: learning_lessons Admins can manage lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage lessons" ON public.learning_lessons USING (public.is_admin(auth.uid()));


--
-- Name: learning_modules Admins can manage modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage modules" ON public.learning_modules USING (public.is_admin(auth.uid()));


--
-- Name: navigation_items Admins can manage nav items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage nav items" ON public.navigation_items USING (public.is_admin(auth.uid()));


--
-- Name: navigation_items Admins can manage navigation items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage navigation items" ON public.navigation_items TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: notification_rules Admins can manage notification rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notification rules" ON public.notification_rules TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can manage notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notifications" ON public.notifications USING (public.is_admin(auth.uid()));


--
-- Name: plans Admins can manage plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage plans" ON public.plans USING (public.is_admin(auth.uid()));


--
-- Name: products Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.products USING (public.is_admin(auth.uid()));


--
-- Name: project_tasks Admins can manage project tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage project tasks" ON public.project_tasks USING (public.is_admin(auth.uid()));


--
-- Name: coupon_redemptions Admins can manage redemptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage redemptions" ON public.coupon_redemptions USING (public.is_admin(auth.uid()));


--
-- Name: referrals Admins can manage referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage referrals" ON public.referrals USING (public.is_admin(auth.uid()));


--
-- Name: referral_rewards Admins can manage rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage rewards" ON public.referral_rewards USING (public.is_admin(auth.uid()));


--
-- Name: cms_sections Admins can manage sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sections" ON public.cms_sections USING (public.is_admin(auth.uid()));


--
-- Name: site_settings Admins can manage site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage site settings" ON public.site_settings USING (public.is_admin(auth.uid()));


--
-- Name: newsletter_subscribers Admins can manage subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers USING (public.is_admin(auth.uid()));


--
-- Name: client_subscriptions Admins can manage subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage subscriptions" ON public.client_subscriptions USING (public.is_admin(auth.uid()));


--
-- Name: telegram_links Admins can manage telegram links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage telegram links" ON public.telegram_links USING (public.is_admin(auth.uid()));


--
-- Name: telegram_template_variables Admins can manage telegram template variables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage telegram template variables" ON public.telegram_template_variables USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: telegram_templates Admins can manage telegram templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage telegram templates" ON public.telegram_templates TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: testimonials Admins can manage testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage testimonials" ON public.testimonials TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: support_tickets Admins can manage tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tickets" ON public.support_tickets USING (public.is_admin(auth.uid()));


--
-- Name: learning_tracks Admins can manage tracks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tracks" ON public.learning_tracks USING (public.is_admin(auth.uid()));


--
-- Name: training_tasks Admins can manage training tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage training tasks" ON public.training_tasks USING (public.is_admin(auth.uid()));


--
-- Name: identity_verifications Admins can manage verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage verifications" ON public.identity_verifications USING (public.is_admin(auth.uid()));


--
-- Name: header_footer_settings Admins can modify header_footer_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can modify header_footer_settings" ON public.header_footer_settings TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: messages Admins can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can send messages" ON public.messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND public.is_admin(auth.uid())));


--
-- Name: brands Admins can update all brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all brands" ON public.brands FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: payment_collection_invoices Admins can update all invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all invoices" ON public.payment_collection_invoices FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: payment_collection_settings Admins can update all settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all settings" ON public.payment_collection_settings FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: support_conversations Admins can update conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update conversations" ON public.support_conversations FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: request_info_requests Admins can update info requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update info requests" ON public.request_info_requests FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: newsletter_subscribers Admins can update newsletter subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update newsletter subscribers" ON public.newsletter_subscribers FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: newsletter_subscribers Admins can update subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update subscribers" ON public.newsletter_subscribers FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: brands Admins can view all brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all brands" ON public.brands FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: credits_ledger Admins can view all credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all credits" ON public.credits_ledger FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: payment_collection_invoices Admins can view all invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all invoices" ON public.payment_collection_invoices FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: user_lesson_progress Admins can view all lesson progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all lesson progress" ON public.user_lesson_progress FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: messages Admins can view all messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: user_track_progress Admins can view all progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all progress" ON public.user_track_progress FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: payment_collection_settings Admins can view all settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all settings" ON public.payment_collection_settings FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: newsletter_subscribers Admins can view all subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: telegram_messages_log Admins can view message logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view message logs" ON public.telegram_messages_log USING (public.is_admin(auth.uid()));


--
-- Name: newsletter_subscribers Admins can view newsletter subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view newsletter subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: ai_conversations Admins full access ai_conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access ai_conversations" ON public.ai_conversations USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: ai_messages Admins full access ai_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access ai_messages" ON public.ai_messages USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: ai_support_tickets Admins full access ai_support_tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access ai_support_tickets" ON public.ai_support_tickets USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: settings Admins full access to settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access to settings" ON public.settings TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: ai_bot_settings Admins manage ai_bot_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage ai_bot_settings" ON public.ai_bot_settings USING (((auth.jwt() ->> 'role'::text) = 'admin'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: cms_sections Anyone can read active sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active sections" ON public.cms_sections FOR SELECT USING (((is_active = true) AND ((page_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.cms_pages
  WHERE ((cms_pages.id = cms_sections.page_id) AND (cms_pages.is_published = true)))))));


--
-- Name: telegram_bot_messages Anyone can read bot messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read bot messages" ON public.telegram_bot_messages FOR SELECT USING (true);


--
-- Name: header_footer_settings Anyone can read header_footer_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read header_footer_settings" ON public.header_footer_settings FOR SELECT USING (true);


--
-- Name: cms_pages Anyone can read published pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read published pages" ON public.cms_pages FOR SELECT USING ((is_published = true));


--
-- Name: categories Anyone can view active categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING ((is_active = true));


--
-- Name: coupons Anyone can view active coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING ((is_active = true));


--
-- Name: learning_lessons Anyone can view active lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active lessons" ON public.learning_lessons FOR SELECT USING ((is_active = true));


--
-- Name: learning_modules Anyone can view active modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active modules" ON public.learning_modules FOR SELECT USING ((is_active = true));


--
-- Name: navigation_items Anyone can view active nav items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active nav items" ON public.navigation_items FOR SELECT USING ((is_active = true));


--
-- Name: plans Anyone can view active plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active plans" ON public.plans FOR SELECT USING ((is_active = true));


--
-- Name: products Anyone can view active products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING ((is_active = true));


--
-- Name: cms_sections Anyone can view active sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active sections" ON public.cms_sections FOR SELECT USING ((is_active = true));


--
-- Name: header_footer_settings Anyone can view active settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active settings" ON public.header_footer_settings FOR SELECT USING ((is_active = true));


--
-- Name: learning_tracks Anyone can view active tracks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active tracks" ON public.learning_tracks FOR SELECT USING ((is_active = true));


--
-- Name: training_tasks Anyone can view active training tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active training tasks" ON public.training_tasks FOR SELECT USING (((is_active = true) OR public.is_admin(auth.uid())));


--
-- Name: telegram_bot_messages Anyone can view bot messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view bot messages" ON public.telegram_bot_messages FOR SELECT USING (true);


--
-- Name: lesson_comments Anyone can view comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view comments" ON public.lesson_comments FOR SELECT USING (true);


--
-- Name: lesson_likes Anyone can view likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view likes" ON public.lesson_likes FOR SELECT USING (true);


--
-- Name: site_settings Anyone can view public site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public site settings" ON public.site_settings FOR SELECT USING ((is_public = true));


--
-- Name: cms_pages Anyone can view published pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published pages" ON public.cms_pages FOR SELECT USING ((is_published = true));


--
-- Name: lesson_comments Authenticated users can add comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add comments" ON public.lesson_comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_likes Authenticated users can add likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add likes" ON public.lesson_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: audit_logs Authenticated users can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: settings Authenticated users can read safe public settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read safe public settings" ON public.settings FOR SELECT TO authenticated USING (((is_public = true) AND (key !~~ '%secret%'::text) AND (key !~~ '%password%'::text) AND (key !~~ '%token%'::text) AND (key !~~ '%key%'::text)));


--
-- Name: coupons Authenticated users can view active coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active coupons" ON public.coupons FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: learning_tracks Authenticated users can view active tracks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active tracks" ON public.learning_tracks FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: request_info_replies Clients can create info replies for own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can create info replies for own requests" ON public.request_info_replies FOR INSERT WITH CHECK (((auth.uid() = client_id) AND (EXISTS ( SELECT 1
   FROM public.request_info_requests r
  WHERE ((r.id = request_info_replies.info_request_id) AND public.is_request_owner(r.request_id))))));


--
-- Name: request_ratings Clients can rate own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can rate own requests" ON public.request_ratings FOR INSERT WITH CHECK (((auth.uid() = client_id) AND (EXISTS ( SELECT 1
   FROM public.requests r
  WHERE ((r.id = request_ratings.request_id) AND public.is_request_owner(r.id))))));


--
-- Name: messages Clients can send messages for own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can send messages for own requests" ON public.messages FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND public.is_request_owner(request_id)));


--
-- Name: request_ratings Clients can update own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can update own ratings" ON public.request_ratings FOR UPDATE USING ((auth.uid() = client_id)) WITH CHECK ((auth.uid() = client_id));


--
-- Name: requests Clients can update own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can update own requests" ON public.requests FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (status = 'submitted'::public.request_status))) WITH CHECK (((auth.uid() = user_id) AND (status = 'submitted'::public.request_status)));


--
-- Name: brand_deliveries Clients can view approved deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view approved deliveries" ON public.brand_deliveries FOR SELECT USING (((is_visible_to_client = true) AND (EXISTS ( SELECT 1
   FROM public.brands
  WHERE ((brands.id = brand_deliveries.brand_id) AND (brands.user_id = auth.uid()))))));


--
-- Name: deliveries Clients can view deliveries for their requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view deliveries for their requests" ON public.deliveries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.requests r
  WHERE ((r.id = deliveries.request_id) AND (r.user_id = auth.uid())))));


--
-- Name: messages Clients can view messages for own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view messages for own requests" ON public.messages FOR SELECT TO authenticated USING (public.is_request_owner(request_id));


--
-- Name: brand_tasks Clients can view their brand tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their brand tasks" ON public.brand_tasks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.brands
  WHERE ((brands.id = brand_tasks.brand_id) AND (brands.user_id = auth.uid())))));


--
-- Name: project_tasks Clients can view their project tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their project tasks" ON public.project_tasks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.requests r
  WHERE ((r.id = project_tasks.request_id) AND (r.user_id = auth.uid())))));


--
-- Name: request_public_links Create request share links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create request share links" ON public.request_public_links FOR INSERT WITH CHECK (((public.is_request_owner(request_id) AND (auth.uid() = created_by)) OR public.is_admin(auth.uid())));


--
-- Name: request_public_links Delete own share links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete own share links" ON public.request_public_links FOR DELETE USING (((created_by = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: freelancer_profiles Freelancers and admins can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers and admins can view profiles" ON public.freelancer_profiles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: brand_deliveries Freelancers can create brand deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can create brand deliveries" ON public.brand_deliveries FOR INSERT WITH CHECK ((auth.uid() = freelancer_id));


--
-- Name: tasks Freelancers can create tasks for their assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can create tasks for their assignments" ON public.tasks FOR INSERT WITH CHECK (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.assignments
  WHERE ((assignments.id = tasks.assignment_id) AND (assignments.freelancer_id = auth.uid()))))));


--
-- Name: training_assignments Freelancers can create training assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can create training assignments" ON public.training_assignments FOR INSERT WITH CHECK ((auth.uid() = freelancer_id));


--
-- Name: course_enrollments Freelancers can enroll in courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can enroll in courses" ON public.course_enrollments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: freelancer_profiles Freelancers can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can insert own profile" ON public.freelancer_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: payment_collection_invoices Freelancers can insert their own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can insert their own invoices" ON public.payment_collection_invoices FOR INSERT WITH CHECK ((auth.uid() = freelancer_id));


--
-- Name: payment_collection_settings Freelancers can insert their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can insert their own settings" ON public.payment_collection_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: deliveries Freelancers can manage own deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can manage own deliveries" ON public.deliveries USING ((auth.uid() = freelancer_id));


--
-- Name: freelancer_profiles Freelancers can manage their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can manage their own profile" ON public.freelancer_profiles TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: messages Freelancers can send messages for assigned requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can send messages for assigned requests" ON public.messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.assignments a
  WHERE ((a.request_id = messages.request_id) AND (a.freelancer_id = auth.uid()) AND (a.is_active = true))))));


--
-- Name: project_tasks Freelancers can update assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can update assigned tasks" ON public.project_tasks FOR UPDATE USING ((auth.uid() = freelancer_id));


--
-- Name: tasks Freelancers can update assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can update assigned tasks" ON public.tasks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.assignments
  WHERE ((assignments.id = tasks.assignment_id) AND (assignments.freelancer_id = auth.uid())))));


--
-- Name: assignments Freelancers can update only own assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can update only own assignments" ON public.assignments FOR UPDATE USING ((auth.uid() = freelancer_id)) WITH CHECK ((auth.uid() = freelancer_id));


--
-- Name: brand_tasks Freelancers can update their assigned brand tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can update their assigned brand tasks" ON public.brand_tasks FOR UPDATE USING ((auth.uid() = freelancer_id));


--
-- Name: payment_collection_invoices Freelancers can update their own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can update their own invoices" ON public.payment_collection_invoices FOR UPDATE USING ((auth.uid() = freelancer_id));


--
-- Name: payment_collection_settings Freelancers can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can update their own settings" ON public.payment_collection_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: training_assignments Freelancers can update their training assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can update their training assignments" ON public.training_assignments FOR UPDATE USING (((auth.uid() = freelancer_id) OR public.is_admin(auth.uid())));


--
-- Name: requests Freelancers can view assigned requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view assigned requests" ON public.requests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.assignments a
  WHERE ((a.request_id = a.id) AND (a.freelancer_id = auth.uid()) AND (a.is_active = true)))));


--
-- Name: project_tasks Freelancers can view assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view assigned tasks" ON public.project_tasks FOR SELECT USING ((auth.uid() = freelancer_id));


--
-- Name: tasks Freelancers can view assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view assigned tasks" ON public.tasks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.assignments
  WHERE ((assignments.id = tasks.assignment_id) AND (assignments.freelancer_id = auth.uid())))));


--
-- Name: messages Freelancers can view messages for assigned requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view messages for assigned requests" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.assignments a
  WHERE ((a.request_id = messages.request_id) AND (a.freelancer_id = auth.uid()) AND (a.is_active = true)))));


--
-- Name: assignments Freelancers can view only own assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view only own assignments" ON public.assignments FOR SELECT USING ((auth.uid() = freelancer_id));


--
-- Name: assignments Freelancers can view own assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view own assignments" ON public.assignments FOR SELECT USING ((auth.uid() = freelancer_id));


--
-- Name: course_enrollments Freelancers can view own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view own enrollments" ON public.course_enrollments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: brand_tasks Freelancers can view their assigned brand tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view their assigned brand tasks" ON public.brand_tasks FOR SELECT USING ((auth.uid() = freelancer_id));


--
-- Name: brand_assignments Freelancers can view their brand assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view their brand assignments" ON public.brand_assignments FOR SELECT USING ((auth.uid() = freelancer_id));


--
-- Name: brand_deliveries Freelancers can view their brand deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view their brand deliveries" ON public.brand_deliveries FOR SELECT USING ((auth.uid() = freelancer_id));


--
-- Name: payment_collection_invoices Freelancers can view their own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view their own invoices" ON public.payment_collection_invoices FOR SELECT USING ((auth.uid() = freelancer_id));


--
-- Name: payment_collection_settings Freelancers can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view their own settings" ON public.payment_collection_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: training_assignments Freelancers can view their training assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Freelancers can view their training assignments" ON public.training_assignments FOR SELECT USING (((auth.uid() = freelancer_id) OR public.is_admin(auth.uid())));


--
-- Name: request_public_links Manage own share links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Manage own share links" ON public.request_public_links FOR UPDATE USING (((created_by = auth.uid()) OR public.is_admin(auth.uid()))) WITH CHECK (((created_by = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: navigation_items Navigation items are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Navigation items are viewable by everyone" ON public.navigation_items FOR SELECT USING ((is_active = true));


--
-- Name: audit_logs Only admins can create audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: telegram_bot_messages Only admins can delete bot messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete bot messages" ON public.telegram_bot_messages FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: credits_ledger Only admins can delete credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete credits" ON public.credits_ledger FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: wallet_ledger Only admins can delete wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete wallet transactions" ON public.wallet_ledger FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: withdrawals Only admins can delete withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete withdrawals" ON public.withdrawals FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: telegram_bot_messages Only admins can insert bot messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert bot messages" ON public.telegram_bot_messages FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: credits_ledger Only admins can insert credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert credits" ON public.credits_ledger FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: wallet_ledger Only admins can insert wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert wallet transactions" ON public.wallet_ledger FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: referral_rewards Only admins can manage rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage rewards" ON public.referral_rewards USING (public.is_admin(auth.uid()));


--
-- Name: telegram_bot_messages Only admins can update bot messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update bot messages" ON public.telegram_bot_messages FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: credits_ledger Only admins can update credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update credits" ON public.credits_ledger FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: wallet_ledger Only admins can update wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update wallet transactions" ON public.wallet_ledger FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: withdrawals Only admins can update withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update withdrawals" ON public.withdrawals FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: referrals Only system can update referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only system can update referrals" ON public.referrals FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: settings Public can read public settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read public settings" ON public.settings FOR SELECT USING (((is_public = true) OR (auth.role() = 'authenticated'::text)));


--
-- Name: site_settings Public can read public settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read public settings" ON public.site_settings FOR SELECT USING ((is_public = true));


--
-- Name: payment_collection_invoices Public can view invoice by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view invoice by token" ON public.payment_collection_invoices FOR SELECT USING (true);


--
-- Name: newsletter_subscribers Public newsletter subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public newsletter subscription" ON public.newsletter_subscribers FOR INSERT WITH CHECK (((email IS NOT NULL) AND (length(email) > 5) AND (email ~~ '%@%.%'::text)));


--
-- Name: admin_setup_attempts Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.admin_setup_attempts USING (false);


--
-- Name: referrals System can update referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update referrals" ON public.referrals FOR UPDATE USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: testimonials Testimonials are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Testimonials are viewable by everyone" ON public.testimonials FOR SELECT USING ((is_active = true));


--
-- Name: brands Users can create brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create brands" ON public.brands FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: disputes Users can create disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create disputes" ON public.disputes FOR INSERT WITH CHECK ((auth.uid() = opened_by));


--
-- Name: notifications Users can create notifications for themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create notifications for themselves" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: orders Users can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: order_items Users can create own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own order items" ON public.order_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));


--
-- Name: orders Users can create own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: requests Users can create own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own requests" ON public.requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: identity_verifications Users can create own verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own verifications" ON public.identity_verifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: withdrawals Users can create own withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: referrals Users can create referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT WITH CHECK ((auth.uid() = referrer_id));


--
-- Name: ticket_replies Users can create replies on own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create replies on own tickets" ON public.ticket_replies FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = ticket_replies.ticket_id) AND (support_tickets.user_id = auth.uid()))))));


--
-- Name: brands Users can create their own brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own brands" ON public.brands FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_conversations Users can create their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own conversations" ON public.support_conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets Users can create tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: identity_verifications Users can create verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create verifications" ON public.identity_verifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: withdrawals Users can create withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create withdrawals" ON public.withdrawals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_comments Users can delete own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own comments" ON public.lesson_comments FOR DELETE USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile only" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: telegram_link_codes Users can insert their own link codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own link codes" ON public.telegram_link_codes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: telegram_links Users can insert their own telegram links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own telegram links" ON public.telegram_links FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: telegram_link_codes Users can manage own codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own codes" ON public.telegram_link_codes USING ((auth.uid() = user_id));


--
-- Name: user_lesson_progress Users can manage own lesson progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own lesson progress" ON public.user_lesson_progress USING ((auth.uid() = user_id));


--
-- Name: user_track_progress Users can manage own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own progress" ON public.user_track_progress USING ((auth.uid() = user_id));


--
-- Name: brand_goals Users can manage their brand goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their brand goals" ON public.brand_goals USING ((EXISTS ( SELECT 1
   FROM public.brands
  WHERE ((brands.id = brand_goals.brand_id) AND (brands.user_id = auth.uid())))));


--
-- Name: notification_rules Users can read notification rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read notification rules" ON public.notification_rules FOR SELECT TO authenticated USING (true);


--
-- Name: telegram_templates Users can read telegram templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read telegram templates" ON public.telegram_templates FOR SELECT TO authenticated USING (true);


--
-- Name: lesson_likes Users can remove own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove own likes" ON public.lesson_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (public.can_view_request(request_id));


--
-- Name: support_messages Users can send messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages in their conversations" ON public.support_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.support_conversations sc
  WHERE ((sc.id = support_messages.conversation_id) AND ((sc.user_id = auth.uid()) OR public.is_admin(auth.uid())))))));


--
-- Name: brands Users can update own brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own brands" ON public.brands FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: orders Users can update own cart orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own cart orders" ON public.orders FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'cart'::public.order_status)));


--
-- Name: lesson_comments Users can update own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own comments" ON public.lesson_comments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: identity_verifications Users can update own pending verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own pending verifications" ON public.identity_verifications FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile only" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: brands Users can update their own brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own brands" ON public.brands FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: telegram_links Users can update their own telegram links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own telegram links" ON public.telegram_links FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: requests Users can view accessible requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view accessible requests" ON public.requests FOR SELECT TO authenticated USING (public.can_view_request(id));


--
-- Name: request_info_replies Users can view info replies for accessible requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view info replies for accessible requests" ON public.request_info_replies FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.request_info_requests r
  WHERE ((r.id = request_info_replies.info_request_id) AND public.can_view_request(r.request_id)))));


--
-- Name: request_info_requests Users can view info requests for accessible requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view info requests for accessible requests" ON public.request_info_requests FOR SELECT USING (public.can_view_request(request_id));


--
-- Name: messages Users can view messages for their requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages for their requests" ON public.messages FOR SELECT USING (public.can_view_request(request_id));


--
-- Name: support_messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their conversations" ON public.support_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.support_conversations sc
  WHERE ((sc.id = support_messages.conversation_id) AND ((sc.user_id = auth.uid()) OR public.is_admin(auth.uid()))))));


--
-- Name: brand_notes Users can view notes for their brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view notes for their brands" ON public.brand_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.brands
  WHERE ((brands.id = brand_notes.brand_id) AND (brands.user_id = auth.uid())))));


--
-- Name: brands Users can view own brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own brands" ON public.brands FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credits_ledger Users can view own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own credits" ON public.credits_ledger FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: disputes Users can view own disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own disputes" ON public.disputes FOR SELECT USING ((auth.uid() = opened_by));


--
-- Name: course_enrollments Users can view own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own enrollments" ON public.course_enrollments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_lesson_progress Users can view own lesson progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own lesson progress" ON public.user_lesson_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: order_items Users can view own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));


--
-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_track_progress Users can view own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own progress" ON public.user_track_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: coupon_redemptions Users can view own redemptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals Users can view own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: requests Users can view own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own requests" ON public.requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referral_rewards Users can view own rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own rewards" ON public.referral_rewards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: client_subscriptions Users can view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscriptions" ON public.client_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: telegram_links Users can view own telegram links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own telegram links" ON public.telegram_links FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_tickets Users can view own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: identity_verifications Users can view own verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own verifications" ON public.identity_verifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: assignments Users can view related assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view related assignments" ON public.assignments FOR SELECT TO authenticated USING (((freelancer_id = auth.uid()) OR public.is_admin(auth.uid()) OR public.is_request_owner(request_id)));


--
-- Name: ticket_replies Users can view replies on own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view replies on own tickets" ON public.ticket_replies FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = ticket_replies.ticket_id) AND (support_tickets.user_id = auth.uid())))));


--
-- Name: brand_goals Users can view their brand goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their brand goals" ON public.brand_goals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.brands
  WHERE ((brands.id = brand_goals.brand_id) AND (brands.user_id = auth.uid())))));


--
-- Name: brand_invoices Users can view their brand invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their brand invoices" ON public.brand_invoices FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: brands Users can view their own brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own brands" ON public.brands FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_conversations Users can view their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversations" ON public.support_conversations FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: telegram_link_codes Users can view their own link codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own link codes" ON public.telegram_link_codes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: telegram_messages_log Users can view their own message logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own message logs" ON public.telegram_messages_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals Users can view their own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: referral_rewards Users can view their own rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own rewards" ON public.referral_rewards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: telegram_links Users can view their own telegram links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own telegram links" ON public.telegram_links FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_conversations Users manage own ai_conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own ai_conversations" ON public.ai_conversations USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_messages Users manage own ai_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own ai_messages" ON public.ai_messages USING ((EXISTS ( SELECT 1
   FROM public.ai_conversations c
  WHERE ((c.id = ai_messages.conversation_id) AND (c.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ai_conversations c
  WHERE ((c.id = ai_messages.conversation_id) AND (c.user_id = auth.uid())))));


--
-- Name: ai_support_tickets Users manage own ai_support_tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own ai_support_tickets" ON public.ai_support_tickets USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wallet_ledger Users view own wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own wallet transactions" ON public.wallet_ledger FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: withdrawals Users view own withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own withdrawals" ON public.withdrawals FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: request_public_links View own share links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View own share links" ON public.request_public_links FOR SELECT USING (((created_by = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: request_ratings View ratings for accessible requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View ratings for accessible requests" ON public.request_ratings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.requests r
  WHERE ((r.id = request_ratings.request_id) AND public.can_view_request(r.id)))));


--
-- Name: admin_setup_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_setup_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: freelancer_certificates admins_manage_freelancer_certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_freelancer_certificates ON public.freelancer_certificates USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: freelancer_portfolios admins_manage_freelancer_portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_freelancer_portfolios ON public.freelancer_portfolios USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: freelancer_skills admins_manage_freelancer_skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_freelancer_skills ON public.freelancer_skills USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: portfolio_sections admins_manage_portfolio_sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_portfolio_sections ON public.portfolio_sections USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: portfolio_templates admins_manage_portfolio_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_portfolio_templates ON public.portfolio_templates USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: ai_bot_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_bot_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_bot_settings ai_bot_settings_authenticated_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_bot_settings_authenticated_access ON public.ai_bot_settings USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: ai_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_conversations ai_conversations_authenticated_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_conversations_authenticated_access ON public.ai_conversations USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: ai_knowledge_base; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_knowledge_base ai_knowledge_base_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_knowledge_base_read_authenticated ON public.ai_knowledge_base FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: ai_knowledge_base ai_knowledge_base_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_knowledge_base_write_own ON public.ai_knowledge_base USING (((auth.role() = 'authenticated'::text) AND (created_by = auth.uid()))) WITH CHECK (((auth.role() = 'authenticated'::text) AND (created_by = auth.uid())));


--
-- Name: ai_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_messages ai_messages_authenticated_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_messages_authenticated_access ON public.ai_messages USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: ai_support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_support_tickets ai_support_tickets_authenticated_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_support_tickets_authenticated_access ON public.ai_support_tickets USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_templates auth_view_active_portfolio_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_view_active_portfolio_templates ON public.portfolio_templates FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: brand_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: course_enrollments ce_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ce_delete_admin ON public.course_enrollments FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: course_enrollments ce_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ce_insert_own ON public.course_enrollments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: course_enrollments ce_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ce_select_admin ON public.course_enrollments FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: course_enrollments ce_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ce_select_own ON public.course_enrollments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: course_enrollments ce_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ce_update_admin ON public.course_enrollments FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: client_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: coupon_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: course_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: credits_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: freelancer_certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freelancer_certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: freelancer_portfolios freelancer_delete_own_portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_delete_own_portfolio ON public.freelancer_portfolios FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: freelancer_portfolios freelancer_insert_own_portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_insert_own_portfolio ON public.freelancer_portfolios FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: freelancer_certificates freelancer_manage_own_certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_manage_own_certificates ON public.freelancer_certificates USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: portfolio_sections freelancer_manage_own_portfolio_sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_manage_own_portfolio_sections ON public.portfolio_sections USING ((EXISTS ( SELECT 1
   FROM public.freelancer_portfolios fp
  WHERE ((fp.id = portfolio_sections.portfolio_id) AND (fp.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.freelancer_portfolios fp
  WHERE ((fp.id = portfolio_sections.portfolio_id) AND (fp.user_id = auth.uid())))));


--
-- Name: freelancer_skills freelancer_manage_own_skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_manage_own_skills ON public.freelancer_skills USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: freelancer_portfolios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freelancer_portfolios ENABLE ROW LEVEL SECURITY;

--
-- Name: freelancer_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: freelancer_portfolios freelancer_select_own_portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_select_own_portfolio ON public.freelancer_portfolios FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: freelancer_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freelancer_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: freelancer_portfolios freelancer_update_own_portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_update_own_portfolio ON public.freelancer_portfolios FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: header_footer_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.header_footer_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_verifications identity_verifications_block_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY identity_verifications_block_anon ON public.identity_verifications TO anon USING (false) WITH CHECK (false);


--
-- Name: identity_verifications identity_verifications_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY identity_verifications_insert_own ON public.identity_verifications FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: identity_verifications identity_verifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY identity_verifications_select_own ON public.identity_verifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: identity_verifications identity_verifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY identity_verifications_update_own ON public.identity_verifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: identity_verifications iv_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY iv_insert_own ON public.identity_verifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: identity_verifications iv_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY iv_select_admin ON public.identity_verifications FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: identity_verifications iv_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY iv_select_own ON public.identity_verifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: identity_verifications iv_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY iv_update_admin ON public.identity_verifications FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: learning_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_tracks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_tracks ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: navigation_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_collection_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_collection_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_collection_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_collection_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_projects portfolio_projects_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portfolio_projects_admin_all ON public.portfolio_projects USING (public.is_admin(auth.uid()));


--
-- Name: portfolio_projects portfolio_projects_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portfolio_projects_public_select ON public.portfolio_projects FOR SELECT USING (((is_visible = true) AND (EXISTS ( SELECT 1
   FROM public.freelancer_portfolios fp
  WHERE ((fp.user_id = portfolio_projects.freelancer_id) AND (fp.status = 'published'::text) AND (fp.is_public = true))))));


--
-- Name: portfolio_projects portfolio_projects_user_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portfolio_projects_user_all ON public.portfolio_projects USING ((auth.uid() = freelancer_id));


--
-- Name: portfolio_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_services ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_services portfolio_services_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portfolio_services_admin_all ON public.portfolio_services USING (public.is_admin(auth.uid()));


--
-- Name: portfolio_services portfolio_services_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portfolio_services_public_select ON public.portfolio_services FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.freelancer_portfolios fp
  WHERE ((fp.user_id = portfolio_services.freelancer_id) AND (fp.status = 'published'::text) AND (fp.is_public = true))))));


--
-- Name: portfolio_services portfolio_services_user_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portfolio_services_user_all ON public.portfolio_services USING ((auth.uid() = freelancer_id));


--
-- Name: portfolio_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_block_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_block_anon ON public.profiles TO anon USING (false) WITH CHECK (false);


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: project_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: freelancer_portfolios public_view_published_portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_view_published_portfolios ON public.freelancer_portfolios FOR SELECT USING ((is_public = true));


--
-- Name: portfolio_sections public_view_sections_of_published_portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_view_sections_of_published_portfolios ON public.portfolio_sections FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.freelancer_portfolios fp
  WHERE ((fp.id = portfolio_sections.portfolio_id) AND (fp.is_public = true)))));


--
-- Name: referral_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: request_info_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_info_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: request_info_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_info_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: request_public_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_public_links ENABLE ROW LEVEL SECURITY;

--
-- Name: request_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: settings settings_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_admin_delete ON public.settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: settings settings_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_admin_read ON public.settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: settings settings_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_admin_update ON public.settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: settings settings_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_admin_write ON public.settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: settings settings_block_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_block_anon ON public.settings TO anon USING (false) WITH CHECK (false);


--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: support_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: support_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_bot_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_bot_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_link_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_messages_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_messages_log ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_template_variables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_template_variables ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: testimonials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: training_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: training_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_track_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_track_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_ledger wallet_ledger_block_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_ledger_block_anon ON public.wallet_ledger FOR SELECT TO anon USING (false);


--
-- Name: withdrawals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;