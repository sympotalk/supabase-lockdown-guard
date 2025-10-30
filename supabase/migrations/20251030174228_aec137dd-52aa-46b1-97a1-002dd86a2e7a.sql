-- Phase 74-A.4: Orphan Recovery Tool
-- Purpose: Enable MASTER to search and link users without agency association

-- RPC: list_orphan_users
-- Returns users who exist in auth.users but not properly linked in agency_members
CREATE OR REPLACE FUNCTION public.list_orphan_users(p_search TEXT DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is MASTER
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  RETURN QUERY
  SELECT 
    au.id AS user_id,
    au.email::TEXT,
    COALESCE(
      au.raw_user_meta_data->>'display_name',
      au.email
    )::TEXT AS display_name,
    COALESCE(
      au.raw_user_meta_data->>'phone',
      ''
    )::TEXT AS phone,
    au.created_at,
    CASE 
      WHEN am.user_id IS NULL THEN 'unlinked'
      WHEN am.agency_id IS NULL THEN 'missing_agency'
      ELSE 'unknown'
    END::TEXT AS status
  FROM auth.users au
  LEFT JOIN public.agency_members am ON am.user_id = au.id
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  WHERE 
    -- Orphan conditions: no agency_members record OR agency_id is null
    (am.user_id IS NULL OR am.agency_id IS NULL)
    -- Exclude MASTER users
    AND (ur.role IS NULL OR ur.role != 'master')
    -- Apply search filter if provided
    AND (
      p_search IS NULL 
      OR au.email ILIKE '%' || p_search || '%'
      OR au.raw_user_meta_data->>'display_name' ILIKE '%' || p_search || '%'
      OR au.raw_user_meta_data->>'phone' ILIKE '%' || p_search || '%'
    )
  ORDER BY au.created_at DESC
  LIMIT 100;
END;
$$;

-- RPC: link_user_to_agency
-- Links an orphan user to an agency (idempotent)
CREATE OR REPLACE FUNCTION public.link_user_to_agency(
  p_user_id UUID,
  p_agency_id UUID,
  p_role TEXT DEFAULT 'staff'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_display_name TEXT;
BEGIN
  -- Verify caller is MASTER
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  -- Validate agency exists
  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = p_agency_id AND is_active = true) THEN
    RAISE EXCEPTION 'agency_not_found';
  END IF;

  -- Validate user exists
  SELECT email, raw_user_meta_data->>'display_name' 
  INTO v_email, v_display_name
  FROM auth.users 
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- Upsert into agency_members (idempotent)
  INSERT INTO public.agency_members (
    agency_id, 
    user_id, 
    role,
    display_name,
    created_at
  )
  VALUES (
    p_agency_id,
    p_user_id,
    p_role,
    COALESCE(v_display_name, v_email),
    now()
  )
  ON CONFLICT (user_id, agency_id) 
  DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = now();

  -- Update user_roles table
  INSERT INTO public.user_roles (
    user_id,
    agency_id,
    role
  )
  VALUES (
    p_user_id,
    p_agency_id,
    p_role::app_role
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    agency_id = EXCLUDED.agency_id,
    role = EXCLUDED.role::app_role,
    updated_at = now();

  -- Log activity
  INSERT INTO public.activity_logs (
    title,
    description,
    type,
    agency_id,
    created_by
  )
  VALUES (
    'Orphan User Linked',
    'MASTER linked user ' || v_email || ' to agency',
    'system',
    p_agency_id,
    auth.uid()
  );

  RETURN json_build_object(
    'status', 'success',
    'user_id', p_user_id,
    'agency_id', p_agency_id,
    'role', p_role,
    'email', v_email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.list_orphan_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_user_to_agency(UUID, UUID, TEXT) TO authenticated;

-- Add index for orphan search performance
CREATE INDEX IF NOT EXISTS idx_agency_members_user_agency 
ON public.agency_members(user_id, agency_id);

COMMENT ON FUNCTION public.list_orphan_users IS 'MASTER-only: Lists users without proper agency linkage';
COMMENT ON FUNCTION public.link_user_to_agency IS 'MASTER-only: Links orphan user to agency (idempotent)';