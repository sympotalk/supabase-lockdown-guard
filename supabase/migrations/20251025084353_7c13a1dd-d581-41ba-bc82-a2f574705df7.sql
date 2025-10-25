-- Phase 3.3.4-Init: Master 계정 role 할당 함수 생성

-- Helper function: Master 계정에 role 부여하는 함수
CREATE OR REPLACE FUNCTION public.assign_master_role(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found with email: ' || user_email
    );
  END IF;

  -- Insert or update role in user_roles
  INSERT INTO public.user_roles (user_id, role, agency_id)
  VALUES (target_user_id, 'master'::app_role, NULL)
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'master'::app_role,
      agency_id = NULL,
      updated_at = now();

  -- Update profile if exists
  UPDATE public.profiles
  SET updated_at = now()
  WHERE user_id = target_user_id OR id = target_user_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'user_id', target_user_id,
    'email', user_email,
    'role', 'master',
    'message', 'Master role assigned successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.assign_master_role IS 'Assigns master role to a user by email. Use after creating user in Supabase Dashboard.';