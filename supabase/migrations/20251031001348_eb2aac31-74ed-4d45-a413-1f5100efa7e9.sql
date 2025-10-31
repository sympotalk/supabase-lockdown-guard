-- [74-B.0-FIX] Drop existing function and recreate with proper signature

-- Drop existing validate_invite_token function (all signatures)
DROP FUNCTION IF EXISTS public.validate_invite_token(uuid);
DROP FUNCTION IF EXISTS public.validate_invite_token(text);

-- Create agency invite function
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

  -- Insert invite record
  INSERT INTO public.account_provisioning (
    agency_id,
    email,
    invite_token,
    role,
    expires_at,
    created_by
  )
  VALUES (
    p_agency_id,
    p_email,
    v_token,
    p_role,
    now() + INTERVAL '7 days',
    auth.uid()
  );

  -- Return structured JSON
  RETURN json_build_object(
    'token', v_token::text,
    'invite_url', v_url,
    'expires_at', (now() + INTERVAL '7 days')::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Validate invite token function
CREATE OR REPLACE FUNCTION public.validate_invite_token(
  p_token uuid
)
RETURNS json AS $$
DECLARE
  v_invite record;
BEGIN
  -- Fetch invite with agency name
  SELECT 
    ap.*,
    a.name as agency_name
  INTO v_invite
  FROM public.account_provisioning ap
  LEFT JOIN public.agencies a ON a.id = ap.agency_id
  WHERE ap.invite_token = p_token;

  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'is_valid', false,
      'reason', 'not_found',
      'message', '초대를 찾을 수 없습니다'
    );
  END IF;

  -- Check if expired
  IF now() > v_invite.expires_at THEN
    RETURN json_build_object(
      'is_valid', false,
      'reason', 'expired',
      'message', '초대가 만료되었습니다',
      'expires_at', v_invite.expires_at::text
    );
  END IF;

  -- Check if already used
  IF v_invite.is_used THEN
    RETURN json_build_object(
      'is_valid', false,
      'reason', 'already_used',
      'message', '이미 사용된 초대입니다',
      'used_at', v_invite.used_at::text
    );
  END IF;

  -- Check if revoked
  IF NOT v_invite.is_active THEN
    RETURN json_build_object(
      'is_valid', false,
      'reason', 'revoked',
      'message', '초대가 취소되었습니다',
      'revoked_at', v_invite.revoked_at::text
    );
  END IF;

  -- Valid invite
  RETURN json_build_object(
    'is_valid', true,
    'email', v_invite.email,
    'agency_id', v_invite.agency_id::text,
    'agency_name', v_invite.agency_name,
    'role', v_invite.role,
    'expires_at', v_invite.expires_at::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.create_agency_invite IS '[74-B.0-FIX] Creates invite with proper token serialization';
COMMENT ON FUNCTION public.validate_invite_token IS '[74-B.0-FIX] Validates invite token with detailed status';