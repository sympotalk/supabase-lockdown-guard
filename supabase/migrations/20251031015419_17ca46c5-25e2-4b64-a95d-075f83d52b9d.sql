-- [74-B.0-FIX.15] Orphan Recovery Log Fix + Master Exclusion (Fixed)

-- ============================================
-- 1. Extend activity_logs.type constraint
-- ============================================
ALTER TABLE public.activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_type_check;

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_type_check
  CHECK (type IN ('upload', 'rooming', 'message', 'form', 'system', 'announcement'));

COMMENT ON CONSTRAINT activity_logs_type_check ON public.activity_logs IS
'[74-B.0-FIX.15] Allow system-level operations (orphan recovery, invite, etc.)';

-- ============================================
-- 2. Update orphan_users view to exclude MASTER accounts
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
WHERE (am.user_id IS NULL OR ur.user_id IS NULL)
  AND NOT (u.email ILIKE '%@sympohub.com%' OR u.email = 'admin@sympohub.io')
  AND ur.role IS DISTINCT FROM 'master'
ORDER BY u.created_at DESC;

COMMENT ON VIEW public.orphan_users IS '[74-B.0-FIX.15] Detects unlinked users, excludes MASTER accounts';

-- ============================================
-- 3. Recreate link_user_to_agency with proper return type
-- ============================================
DROP FUNCTION IF EXISTS public.link_user_to_agency(uuid, uuid, text);

CREATE FUNCTION public.link_user_to_agency(
  p_user_id uuid,
  p_agency_id uuid,
  p_role text DEFAULT 'staff'
)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_agency uuid;
BEGIN
  -- Check if user already has agency
  SELECT agency_id INTO v_existing_agency
  FROM user_roles
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Insert/Update user_roles
  INSERT INTO user_roles (user_id, role, agency_id, created_at)
  VALUES (p_user_id, p_role::app_role, p_agency_id, now())
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role,
      agency_id = EXCLUDED.agency_id,
      updated_at = now();

  -- Insert/Update agency_members
  INSERT INTO agency_members (agency_id, user_id, role, created_at)
  VALUES (p_agency_id, p_user_id, p_role, now())
  ON CONFLICT (agency_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      updated_at = now();

  -- Log to activity_logs with type='system'
  INSERT INTO activity_logs (
    agency_id,
    type,
    title,
    description,
    created_by
  )
  VALUES (
    p_agency_id,
    'system',
    'Orphan Recovery',
    format('User %s linked to agency by MASTER', p_user_id::text),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'User successfully linked to agency',
    'user_id', p_user_id,
    'agency_id', p_agency_id,
    'role', p_role,
    'was_orphan', v_existing_agency IS NULL
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.link_user_to_agency IS '[74-B.0-FIX.15] Link orphan user to agency with proper logging';