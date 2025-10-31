-- [74-B.0-FIX.16] Manual Email Confirmation Helper (Dashboard Setting Required)

-- ============================================
-- Master-only function to confirm all users
-- ============================================
CREATE OR REPLACE FUNCTION public.confirm_all_unconfirmed_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_confirmed_count integer := 0;
BEGIN
  -- Only masters can run this
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Only MASTER role can confirm users'
    );
  END IF;

  -- Confirm all unconfirmed users
  UPDATE auth.users
  SET email_confirmed_at = now(),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{email_verified}',
        'true'::jsonb,
        true
      )
  WHERE email_confirmed_at IS NULL;
  
  GET DIAGNOSTICS v_confirmed_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'status', 'success',
    'confirmed_count', v_confirmed_count,
    'message', format('Confirmed %s users', v_confirmed_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- ============================================
-- Function to confirm a specific user by ID
-- ============================================
CREATE OR REPLACE FUNCTION public.confirm_user_by_id(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only masters can run this
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Only MASTER role can confirm users'
    );
  END IF;

  -- Confirm the user
  UPDATE auth.users
  SET email_confirmed_at = now(),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{email_verified}',
        'true'::jsonb,
        true
      )
  WHERE id = p_user_id
    AND email_confirmed_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found or already confirmed'
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'user_id', p_user_id,
    'message', 'User confirmed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.confirm_all_unconfirmed_users IS '[74-B.0-FIX.16] Manually confirm all unconfirmed users (MASTER only)';
COMMENT ON FUNCTION public.confirm_user_by_id IS '[74-B.0-FIX.16] Manually confirm specific user (MASTER only)';