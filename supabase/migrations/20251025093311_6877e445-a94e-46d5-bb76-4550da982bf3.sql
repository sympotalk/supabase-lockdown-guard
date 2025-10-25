-- Master Action Panel RPC Functions

-- 1) Post announcement/notification
CREATE OR REPLACE FUNCTION public.master_post_announcement(p_agency uuid, p_title text, p_body text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is master
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  INSERT INTO public.activity_logs (agency_id, title, description, type, created_by)
  VALUES (p_agency, p_title, p_body, 'announcement', auth.uid());
END;
$$;

-- 2) Toggle agency active status
CREATE OR REPLACE FUNCTION public.master_toggle_agency_active(p_agency uuid)
RETURNS TABLE(agency_id uuid, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active boolean;
BEGIN
  -- Verify caller is master
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  SELECT COALESCE(a.is_active, true) INTO v_active 
  FROM public.agencies a 
  WHERE a.id = p_agency;

  UPDATE public.agencies 
  SET is_active = NOT v_active, updated_at = now()
  WHERE id = p_agency
  RETURNING id, agencies.is_active INTO agency_id, is_active;

  RETURN NEXT;
END;
$$;

-- 3) Set user role
CREATE OR REPLACE FUNCTION public.master_set_role(p_user uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is master
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  UPDATE public.user_roles 
  SET role = p_role::app_role, updated_at = now()
  WHERE user_id = p_user;
END;
$$;

-- 4) Revoke invitation
CREATE OR REPLACE FUNCTION public.master_revoke_invite(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is master
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  UPDATE public.account_provisioning
  SET is_active = false, revoked_at = now()
  WHERE invite_token = p_token;
END;
$$;

-- 5) Agency API keys table
CREATE TABLE IF NOT EXISTS public.agency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  api_key text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_keys_agency ON public.agency_keys(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_keys_active ON public.agency_keys(agency_id, is_active);

-- RLS for agency_keys
ALTER TABLE public.agency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can view all agency keys"
  ON public.agency_keys FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'master'::app_role));

-- 6) Rotate API key
CREATE OR REPLACE FUNCTION public.master_rotate_api_key(p_agency uuid)
RETURNS TABLE(api_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  -- Verify caller is master
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  -- Deactivate existing keys
  UPDATE public.agency_keys 
  SET is_active = false 
  WHERE agency_id = p_agency AND is_active = true;

  -- Generate new key
  v_key := encode(gen_random_bytes(24), 'base64');
  
  INSERT INTO public.agency_keys(agency_id, api_key, is_active)
  VALUES (p_agency, v_key, true)
  RETURNING agency_keys.api_key INTO api_key;

  RETURN NEXT;
END;
$$;