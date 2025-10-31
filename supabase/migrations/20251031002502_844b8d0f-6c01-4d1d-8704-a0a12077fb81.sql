-- [74-B.0-FIX.3] Fix activity_logs type constraint violation

-- Update create_agency_invite to use valid type value
CREATE OR REPLACE FUNCTION public.create_agency_invite(
  p_agency_id uuid,
  p_email text DEFAULT NULL,
  p_role text DEFAULT 'staff'
)
RETURNS json AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_url text;
BEGIN
  -- Build invite URL
  v_url := COALESCE(
    current_setting('app.base_url', true),
    'https://sympohub.app'
  ) || '/invite?token=' || v_token::text;

  -- Insert invite record (email can be null)
  INSERT INTO public.account_provisioning (
    agency_id,
    email,
    invite_token,
    role,
    expires_at,
    created_by,
    is_active
  )
  VALUES (
    p_agency_id,
    p_email, -- Can be NULL
    v_token,
    p_role,
    now() + INTERVAL '7 days',
    auth.uid(),
    true
  );

  -- [74-B.0-FIX.3] Log invite creation with valid type='system'
  INSERT INTO public.activity_logs (
    agency_id,
    title,
    description,
    type,
    created_by
  )
  VALUES (
    p_agency_id,
    '초대 링크 생성',
    CASE 
      WHEN p_email IS NOT NULL THEN '이메일: ' || p_email || ' / 역할: ' || p_role
      ELSE '일반 초대 링크 / 역할: ' || p_role
    END,
    'system', -- Use valid type value
    auth.uid()
  );

  -- Return structured JSON with proper serialization
  RETURN json_build_object(
    'token', v_token::text,
    'invite_url', v_url,
    'expires_at', (now() + INTERVAL '7 days')::text,
    'email', p_email,
    'role', p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.create_agency_invite IS 
'[74-B.0-FIX.3] Creates agency invite with valid activity log type';