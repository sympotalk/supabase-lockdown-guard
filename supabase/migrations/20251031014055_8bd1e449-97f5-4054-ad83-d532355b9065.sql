-- [74-B.0-FIX.11] Manual email confirmation for nmon04@naver.com and improve email confirmation handling

-- Step 1: Manually confirm the specific user who couldn't login
UPDATE auth.users
SET 
  email_confirmed_at = now(),
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{email_verified}',
    'true'::jsonb
  )
WHERE email = 'nmon04@naver.com' 
  AND email_confirmed_at IS NULL;

-- Step 2: Create a helper function to auto-confirm invited users (optional, for future use)
CREATE OR REPLACE FUNCTION public.auto_confirm_invited_user(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Update auth.users to confirm email
  UPDATE auth.users
  SET 
    email_confirmed_at = now(),
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email_verified}',
      'true'::jsonb
    )
  WHERE id = p_user_id
    AND email_confirmed_at IS NULL;

  IF FOUND THEN
    v_result := jsonb_build_object(
      'status', 'success',
      'message', 'Email auto-confirmed for invited user'
    );
  ELSE
    v_result := jsonb_build_object(
      'status', 'already_confirmed',
      'message', 'Email already confirmed'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;