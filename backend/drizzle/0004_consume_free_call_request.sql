CREATE OR REPLACE FUNCTION public.consume_free_call_request(p_user_id uuid)
RETURNS TABLE (allowed boolean, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_used integer;
BEGIN
  LOOP
    SELECT u.free_call_limit, u.free_call_used
    INTO v_limit, v_used
    FROM public.users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    EXIT WHEN FOUND;

    INSERT INTO public.users (id, email)
    VALUES (p_user_id, CONCAT('trial+', p_user_id::text, '@placeholder.local'))
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  IF v_used < v_limit THEN
    UPDATE public.users
    SET free_call_used = free_call_used + 1
    WHERE id = p_user_id
    RETURNING free_call_limit, free_call_used INTO v_limit, v_used;

    RETURN QUERY SELECT true, GREATEST(v_limit - v_used, 0);
  ELSE
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$$;
