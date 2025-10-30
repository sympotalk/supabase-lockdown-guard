-- ============================================================================
-- Phase 74-A: Agency-Invite-User Rebind (Full Flow Hardening)
-- ============================================================================
-- 초대→가입→연결→프로필동기화→orphan복구 전구간 자동화
-- ============================================================================

-- ============================================================================
-- 74-A.1: Accept Invite and Link (초대 수락 및 에이전시 자동 연결)
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_invite_and_link(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_user_email TEXT;
  v_existing_link RECORD;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '인증되지 않은 사용자입니다'
    );
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Validate invite token
  SELECT * INTO v_invite
  FROM account_provisioning
  WHERE invite_token = p_token::uuid
    AND is_active = true
    AND is_used = false
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '유효하지 않거나 만료된 초대 코드입니다'
    );
  END IF;

  -- Verify email matches
  IF v_invite.email != v_user_email THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '초대된 이메일과 가입한 이메일이 일치하지 않습니다'
    );
  END IF;

  -- Check if already linked (idempotent)
  SELECT * INTO v_existing_link
  FROM agency_members
  WHERE user_id = v_user_id
    AND agency_id = v_invite.agency_id;

  IF FOUND THEN
    -- Already linked, just mark invite as used
    UPDATE account_provisioning
    SET is_used = true,
        used_at = NOW()
    WHERE invite_token = p_token::uuid;

    RETURN json_build_object(
      'status', 'success',
      'message', '이미 연결된 계정입니다',
      'agency_id', v_invite.agency_id,
      'role', v_invite.role,
      'already_linked', true
    );
  END IF;

  -- Insert into agency_members
  INSERT INTO agency_members (user_id, agency_id, role, created_at)
  VALUES (v_user_id, v_invite.agency_id, v_invite.role, NOW());

  -- Mark invite as used
  UPDATE account_provisioning
  SET is_used = true,
      used_at = NOW()
  WHERE invite_token = p_token::uuid;

  -- Log activity
  INSERT INTO activity_logs (
    agency_id, 
    event_id, 
    created_by, 
    type, 
    title, 
    description
  )
  VALUES (
    v_invite.agency_id,
    NULL,
    v_user_id,
    'account',
    '사용자 가입',
    v_user_email || '이(가) 초대를 수락하고 가입했습니다'
  );

  RETURN json_build_object(
    'status', 'success',
    'message', '에이전시에 연결되었습니다',
    'agency_id', v_invite.agency_id,
    'role', v_invite.role,
    'already_linked', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- ============================================================================
-- 74-A.2: Profile Update and Sync (프로필 동기화 단일 경로)
-- ============================================================================
CREATE OR REPLACE FUNCTION profile_update_and_sync(
  p_display_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_position TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_metadata JSONB;
  v_updated_metadata JSONB;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '인증되지 않은 사용자입니다'
    );
  END IF;

  -- Get current user_metadata
  SELECT raw_user_meta_data INTO v_current_metadata
  FROM auth.users
  WHERE id = v_user_id;

  IF v_current_metadata IS NULL THEN
    v_current_metadata := '{}'::jsonb;
  END IF;

  -- Build updated metadata (only update provided fields)
  v_updated_metadata := v_current_metadata;
  
  IF p_display_name IS NOT NULL THEN
    v_updated_metadata := v_updated_metadata || jsonb_build_object('display_name', p_display_name);
  END IF;
  
  IF p_phone IS NOT NULL THEN
    v_updated_metadata := v_updated_metadata || jsonb_build_object('phone', p_phone);
  END IF;
  
  IF p_position IS NOT NULL THEN
    v_updated_metadata := v_updated_metadata || jsonb_build_object('position', p_position);
  END IF;
  
  IF p_avatar_url IS NOT NULL THEN
    v_updated_metadata := v_updated_metadata || jsonb_build_object('avatar_url', p_avatar_url);
  END IF;

  -- Update auth.users.raw_user_meta_data
  UPDATE auth.users
  SET raw_user_meta_data = v_updated_metadata,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Sync to agency_members (if exists)
  -- Note: agency_members doesn't have phone/position fields in current schema
  -- This is a placeholder for future extension
  -- For now we just ensure the user is properly linked

  RETURN json_build_object(
    'status', 'success',
    'message', '프로필이 저장되었습니다'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- ============================================================================
-- 74-A.3: Link Orphan User (orphan 계정 복구)
-- ============================================================================
CREATE OR REPLACE FUNCTION link_orphan_user(
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
  v_master_id UUID;
  v_user_email TEXT;
  v_existing_link RECORD;
BEGIN
  -- Check if caller is master
  v_master_id := auth.uid();
  
  IF NOT has_role(v_master_id, 'master') THEN
    RETURN json_build_object(
      'status', 'error',
      'message', 'MASTER 권한이 필요합니다'
    );
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '사용자를 찾을 수 없습니다'
    );
  END IF;

  -- Check if already linked
  SELECT * INTO v_existing_link
  FROM agency_members
  WHERE user_id = p_user_id
    AND agency_id = p_agency_id;

  IF FOUND THEN
    RETURN json_build_object(
      'status', 'success',
      'message', '이미 연결된 계정입니다',
      'already_linked', true
    );
  END IF;

  -- Insert into agency_members
  INSERT INTO agency_members (user_id, agency_id, role, created_at)
  VALUES (p_user_id, p_agency_id, p_role, NOW());

  -- Log activity
  INSERT INTO activity_logs (
    agency_id,
    event_id,
    created_by,
    type,
    title,
    description
  )
  VALUES (
    p_agency_id,
    NULL,
    v_master_id,
    'admin',
    'Orphan 계정 복구',
    'MASTER가 ' || v_user_email || '을(를) 에이전시에 연결했습니다'
  );

  RETURN json_build_object(
    'status', 'success',
    'message', '사용자가 에이전시에 연결되었습니다',
    'already_linked', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- ============================================================================
-- 74-A.4: Get Orphan Users (orphan 사용자 목록 조회)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_orphan_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_id UUID;
BEGIN
  -- Check if caller is master
  v_master_id := auth.uid();
  
  IF NOT has_role(v_master_id, 'master') THEN
    RAISE EXCEPTION 'MASTER 권한이 필요합니다';
  END IF;

  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email,
    u.raw_user_meta_data->>'display_name' AS display_name,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM agency_members am
    WHERE am.user_id = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'master'
  )
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_invite_and_link(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION profile_update_and_sync(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION link_orphan_user(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_orphan_users() TO authenticated;