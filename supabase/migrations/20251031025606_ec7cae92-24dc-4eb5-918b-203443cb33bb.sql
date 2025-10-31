-- [74-B.3] Team Invite Module - Create invite_member RPC

-- Create invite_member RPC function
CREATE OR REPLACE FUNCTION public.invite_member(
  p_agency_id uuid,
  p_email text,
  p_role text
)
RETURNS json AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_invite json;
  v_existing_user uuid;
BEGIN
  -- Check if user already exists in this agency
  SELECT user_id INTO v_existing_user
  FROM user_roles
  WHERE agency_id = p_agency_id
    AND user_id IN (
      SELECT id FROM auth.users WHERE email = p_email
    )
  LIMIT 1;

  IF v_existing_user IS NOT NULL THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '이미 등록된 사용자입니다.'
    );
  END IF;

  -- Check if there's already a pending invite
  IF EXISTS (
    SELECT 1 FROM account_provisioning
    WHERE agency_id = p_agency_id
      AND email = p_email
      AND is_active = true
      AND is_used = false
      AND expires_at > now()
  ) THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '이미 초대가 발송되었습니다.'
    );
  END IF;

  -- Create new invite
  INSERT INTO public.account_provisioning (
    agency_id, 
    email, 
    invite_token, 
    role, 
    expires_at, 
    is_active,
    created_by
  )
  VALUES (
    p_agency_id, 
    p_email, 
    v_token, 
    p_role,
    now() + interval '7 days', 
    true,
    auth.uid()
  );

  v_invite := json_build_object(
    'status', 'success',
    'message', '초대가 발송되었습니다.',
    'token', v_token,
    'email', p_email,
    'role', p_role
  );

  RETURN v_invite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, text) TO authenticated;