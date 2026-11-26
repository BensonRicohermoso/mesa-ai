/*
migration: 20261126120000_security_and_order_workflow.sql
purpose: Replace plaintext staff PINs with salted hashes and make payment/order lifecycle rules atomic.
depends on: 20261125100000_fix_drinks_category_and_order_check.sql
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PINs are deliberately not searchable or returned by API queries.  crypt() uses
-- a different bcrypt salt for each PIN, so a database dump cannot be used for a
-- direct equality lookup.
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS pin_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;

CREATE TABLE IF NOT EXISTS public.staff_pin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('success', 'failure', 'lockout', 'reset')),
  source_ip inet,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.staff_pin_audit_events ENABLE ROW LEVEL SECURITY;

-- Convert the short-lived plaintext column supplied by the pending migration,
-- then remove it in the same transaction.  The metadata cleanup in the prior
-- migration prevents the old value remaining in a JWT.
UPDATE public.staff_profiles
SET pin_hash = crypt(pin_code, gen_salt('bf', 12))
WHERE pin_hash IS NULL AND pin_code ~ '^\\d{4}$';
ALTER TABLE public.staff_profiles DROP COLUMN IF EXISTS pin_code;

-- Constant behaviour for a failed PIN: record it, lock for 15 minutes after
-- five failures, and never reveal whether a PIN or staff member exists.
CREATE OR REPLACE FUNCTION public.verify_staff_pin(
  p_pin text,
  p_staff_id uuid DEFAULT NULL,
  p_source_ip inet DEFAULT NULL
)
RETURNS TABLE (id uuid, full_name text, role public.user_role)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile public.staff_profiles%ROWTYPE;
  v_now timestamptz := CURRENT_TIMESTAMP;
BEGIN
  IF p_pin !~ '^\\d{4}$' THEN RETURN; END IF;

  SELECT * INTO v_profile
  FROM public.staff_profiles
  WHERE is_active
    AND pin_hash IS NOT NULL
    AND (p_staff_id IS NULL OR staff_profiles.id = p_staff_id)
    AND (pin_locked_until IS NULL OR pin_locked_until <= v_now)
    AND pin_hash = crypt(p_pin, pin_hash)
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.staff_profiles
    SET pin_failed_attempts = 0, pin_locked_until = NULL
    WHERE staff_profiles.id = v_profile.id;
    INSERT INTO public.staff_pin_audit_events (staff_id, event_type, source_ip)
    VALUES (v_profile.id, 'success', p_source_ip);
    RETURN QUERY SELECT v_profile.id, v_profile.full_name, v_profile.role;
    RETURN;
  END IF;

  -- When a selected staff member is supplied, charge the failure to that account.
  IF p_staff_id IS NOT NULL THEN
    UPDATE public.staff_profiles
    SET pin_failed_attempts = pin_failed_attempts + 1,
        pin_locked_until = CASE WHEN pin_failed_attempts + 1 >= 5 THEN v_now + interval '15 minutes' ELSE pin_locked_until END
    WHERE staff_profiles.id = p_staff_id AND is_active
    RETURNING * INTO v_profile;
    IF FOUND THEN
      INSERT INTO public.staff_pin_audit_events (staff_id, event_type, source_ip)
      VALUES (v_profile.id, CASE WHEN v_profile.pin_failed_attempts >= 5 THEN 'lockout' ELSE 'failure' END, p_source_ip);
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_staff_pin(text, uuid, inet) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.set_staff_pin(p_staff_id uuid, p_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_pin !~ '^\\d{4}$' THEN RAISE EXCEPTION 'INVALID_PIN'; END IF;
  UPDATE public.staff_profiles
  SET pin_hash = crypt(p_pin, gen_salt('bf', 12)), pin_failed_attempts = 0, pin_locked_until = NULL
  WHERE id = p_staff_id;
  INSERT INTO public.staff_pin_audit_events(staff_id, event_type) VALUES (p_staff_id, 'reset');
END;
$$;
REVOKE ALL ON FUNCTION public.set_staff_pin(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.orders
    SET order_status = 'expired', updated_at = CURRENT_TIMESTAMP
    WHERE order_status = 'pending' AND payment_status = 'unpaid'
      AND expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    RETURNING id
  ), history AS (
    INSERT INTO public.order_status_history(order_id, from_status, to_status, note)
    SELECT id, 'pending', 'expired', 'Unpaid order expired' FROM expired
  ) SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_ref text, p_method public.payment_method, p_amount_tendered numeric,
  p_reference_number text, p_confirmed_by uuid
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  PERFORM public.expire_unpaid_orders();
  SELECT * INTO v_order FROM public.orders WHERE order_ref = p_order_ref FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.payment_status <> 'unpaid' OR v_order.order_status <> 'pending' THEN RAISE EXCEPTION 'PAYMENT_NOT_ALLOWED'; END IF;
  IF p_method = 'cash' AND (p_amount_tendered IS NULL OR p_amount_tendered < v_order.total) THEN RAISE EXCEPTION 'INSUFFICIENT_TENDERED'; END IF;
  INSERT INTO public.payments(order_id, method, amount, amount_tendered, change_given, reference_number, confirmed_by, confirmed_at)
  VALUES (v_order.id, p_method, v_order.total, p_amount_tendered,
    CASE WHEN p_method = 'cash' THEN p_amount_tendered - v_order.total ELSE NULL END,
    p_reference_number, p_confirmed_by, CURRENT_TIMESTAMP);
  UPDATE public.orders SET payment_status = 'paid', order_status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = v_order.id;
  INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by, note)
  VALUES (v_order.id, 'pending', 'confirmed', p_confirmed_by, 'Payment confirmed');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_order_status(p_order_ref text, p_to_status public.order_status, p_changed_by uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  PERFORM public.expire_unpaid_orders();
  SELECT * INTO v_order FROM public.orders WHERE order_ref = p_order_ref FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF (v_order.order_status, p_to_status) NOT IN (('confirmed','preparing'), ('preparing','ready'), ('ready','completed'), ('pending','cancelled'), ('confirmed','cancelled')) THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;
  IF p_to_status IN ('preparing', 'ready', 'completed') AND v_order.payment_status <> 'paid' THEN RAISE EXCEPTION 'UNPAID_ORDER'; END IF;
  UPDATE public.orders SET order_status = p_to_status,
    preparing_at = CASE WHEN p_to_status = 'preparing' THEN CURRENT_TIMESTAMP ELSE preparing_at END,
    ready_at = CASE WHEN p_to_status = 'ready' THEN CURRENT_TIMESTAMP ELSE ready_at END,
    completed_at = CASE WHEN p_to_status = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
    cancelled_at = CASE WHEN p_to_status = 'cancelled' THEN CURRENT_TIMESTAMP ELSE cancelled_at END
  WHERE id = v_order.id;
  INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
  VALUES (v_order.id, v_order.order_status, p_to_status, p_changed_by);
  RETURN true;
END;
$$;

-- DOWN (manual rollback)
-- Drop the functions and staff_pin_audit_events only after a tested PIN rollback plan.
