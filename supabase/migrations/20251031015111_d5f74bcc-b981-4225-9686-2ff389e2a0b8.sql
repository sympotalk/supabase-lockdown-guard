-- [74-B.0-FIX.14] Invite-Agency Binding + Orphan Sync (Fixed)

-- ============================================
-- 1. Auto-link invited user to agency_members
-- ============================================
CREATE OR REPLACE FUNCTION public.link_invited_user(
  p_user_id uuid,
  p_invite_token uuid
)
RETURNS jsonb AS $$
DECLARE
  v_agency_id uuid;
  v_role text;
BEGIN
  -- 1. Validate invite token
  SELECT agency_id, role
  INTO v_agency_id, v_role
  FROM account_provisioning
  WHERE invite_token = p_invite_token
    AND is_active = true
    AND is_used = false
  LIMIT 1;

  IF v_agency_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Invalid or already used invite token'
    );
  END IF;

  -- 2. Link to agency_members
  INSERT INTO agency_members (agency_id, user_id, role, created_at)
  VALUES (v_agency_id, p_user_id, v_role, now())
  ON CONFLICT (agency_id, user_id) DO NOTHING;

  -- 3. Update user_roles
  INSERT INTO user_roles (user_id, role, agency_id, created_at)
  VALUES (p_user_id, v_role::app_role, v_agency_id, now())
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role,
      agency_id = EXCLUDED.agency_id,
      updated_at = now();

  -- 4. Mark invite as used
  UPDATE account_provisioning
  SET is_used = true, used_at = now()
  WHERE invite_token = p_invite_token;

  -- 5. Log the action
  INSERT INTO logs (
    action,
    actor_role,
    target_table,
    payload,
    created_by,
    agency_id
  )
  VALUES (
    'USER_LINKED_VIA_INVITE',
    v_role,
    'agency_members',
    jsonb_build_object(
      'user_id', p_user_id,
      'agency_id', v_agency_id,
      'role', v_role,
      'invite_token', p_invite_token
    ),
    p_user_id,
    v_agency_id
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'agency_id', v_agency_id,
    'role', v_role,
    'message', 'User successfully linked to agency'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Enhanced orphan_users view (fixed)
-- ============================================
CREATE OR REPLACE VIEW public.orphan_users AS
SELECT 
  u.id AS user_id,
  u.email,
  COALESCE(p.display_name, u.email) AS display_name,
  COALESCE(u.raw_user_meta_data->>'phone', '') AS phone,
  u.created_at,
  CASE
    WHEN am.user_id IS NULL AND ur.user_id IS NULL THEN 'NO_AGENCY'
    WHEN am.user_id IS NULL AND ur.user_id IS NOT NULL THEN 'MISSING_AGENCY_MEMBER'
    WHEN am.user_id IS NOT NULL AND ur.user_id IS NULL THEN 'MISSING_USER_ROLE'
    ELSE 'LINKED'
  END AS status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.agency_members am ON am.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE am.user_id IS NULL OR ur.user_id IS NULL
ORDER BY u.created_at DESC;

-- ============================================
-- 3. Update list_orphan_users RPC to use view
-- ============================================
CREATE OR REPLACE FUNCTION public.list_orphan_users(p_search text DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  phone text,
  created_at timestamptz,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.user_id,
    o.email,
    o.display_name,
    o.phone,
    o.created_at,
    o.status
  FROM orphan_users o
  WHERE (
    p_search IS NULL 
    OR o.email ILIKE '%' || p_search || '%'
    OR o.display_name ILIKE '%' || p_search || '%'
    OR o.phone ILIKE '%' || p_search || '%'
  )
  ORDER BY o.created_at DESC
  LIMIT 100;
$$;

COMMENT ON FUNCTION public.link_invited_user IS '[74-B.0-FIX.14] Auto-link invited user to agency via invite token';
COMMENT ON VIEW public.orphan_users IS '[74-B.0-FIX.14] Detects users without proper agency/role linkage';
COMMENT ON FUNCTION public.list_orphan_users IS '[74-B.0-FIX.14] Lists orphan users with optional search filter';