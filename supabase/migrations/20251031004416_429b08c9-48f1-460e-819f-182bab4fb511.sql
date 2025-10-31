-- [74-B.0-FIX.5] Update invite URL domain to sympohub.com

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
  -- Build invite URL with custom domain
  v_url := COALESCE(
    current_setting('app.base_url', true),
    'https://sympohub.com'
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
    p_email,
    v_token,
    p_role,
    now() + INTERVAL '7 days',
    auth.uid(),
    true
  );

  -- Return structured JSON
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
'[74-B.0-FIX.5] Creates agency invite with sympohub.com domain';