/*
migration: 20261128100000_fix_staff_pin_regex.sql
purpose: Fix double-escaped regex ('^\\d{4}$' -> '^[0-9]{4}$') and include extensions schema in search_path for verify_staff_pin and set_staff_pin.
author: Antigravity
created date: 2026-11-28
depends on: 20261126120000_security_and_order_workflow.sql
affected tables: public.staff_profiles, public.staff_pin_audit_events
*/

CREATE OR REPLACE FUNCTION public.verify_staff_pin(
  p_pin text,
  p_staff_id uuid DEFAULT NULL,
  p_source_ip inet DEFAULT NULL
)
RETURNS TABLE (id uuid, full_name text, role public.user_role)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_profile public.staff_profiles%ROWTYPE;
  v_now timestamptz := CURRENT_TIMESTAMP;
BEGIN
  IF p_pin !~ '^[0-9]{4}$' THEN RETURN; END IF;

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
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(text, uuid, inet) TO service_role;

CREATE OR REPLACE FUNCTION public.set_staff_pin(p_staff_id uuid, p_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF p_pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'INVALID_PIN'; END IF;
  UPDATE public.staff_profiles
  SET pin_hash = crypt(p_pin, gen_salt('bf', 12)), pin_failed_attempts = 0, pin_locked_until = NULL
  WHERE id = p_staff_id;
  INSERT INTO public.staff_pin_audit_events(staff_id, event_type) VALUES (p_staff_id, 'reset');
END;
$$;
REVOKE ALL ON FUNCTION public.set_staff_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';

-- DOWN (manual rollback)
-- Re-run the function definitions from 20261126120000_security_and_order_workflow.sql if reverting.
