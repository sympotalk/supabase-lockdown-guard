-- ============================================================================
-- Phase 74-A.2: On-Signup Auto-Link (가입 즉시 에이전시 자동 연결)
-- ============================================================================
-- Note: accept_invite_and_link RPC는 Phase 74-A에서 이미 구현됨
-- 이 마이그레이션은 RLS 정책 보완 및 agency_members 테이블 최적화

-- ============================================================================
-- 1. agency_members RLS 정책 강화
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS agency_members_master_all ON agency_members;
DROP POLICY IF EXISTS agency_members_self_select ON agency_members;
DROP POLICY IF EXISTS agency_members_agency_select ON agency_members;

-- MASTER: full access
CREATE POLICY agency_members_master_all
ON agency_members
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'master'))
WITH CHECK (has_role(auth.uid(), 'master'));

-- Users can view their own membership
CREATE POLICY agency_members_self_select
ON agency_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Agency owners and staff can view members of their agency
CREATE POLICY agency_members_agency_select
ON agency_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.agency_id = agency_members.agency_id
      AND user_roles.role IN ('master', 'agency_owner', 'staff')
  )
);

-- ============================================================================
-- 2. Enhance accept_invite_and_link with better error messages
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
      'code', 'UNAUTHORIZED',
      'message', '로그인이 필요합니다'
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
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'INVALID_TOKEN',
      'message', '유효하지 않은 초대 코드입니다'
    );
  END IF;

  -- Check if already used
  IF v_invite.is_used = true THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'ALREADY_USED',
      'message', '이미 사용된 초대 코드입니다',
      'used_at', v_invite.used_at::text
    );
  END IF;

  -- Check if expired
  IF v_invite.expires_at < NOW() THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'EXPIRED',
      'message', '초대가 만료되었습니다. 새로운 초대를 요청해주세요.',
      'expired_at', v_invite.expires_at::text
    );
  END IF;

  -- Check if revoked
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'REVOKED',
      'message', '취소된 초대입니다',
      'revoked_at', v_invite.revoked_at::text
    );
  END IF;

  -- Verify email matches
  IF v_invite.email != v_user_email THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'EMAIL_MISMATCH',
      'message', '초대된 이메일(' || v_invite.email || ')로 가입해주세요. 현재 가입한 이메일: ' || v_user_email
    );
  END IF;

  -- Check if already linked (idempotent)
  SELECT * INTO v_existing_link
  FROM agency_members
  WHERE user_id = v_user_id
    AND agency_id = v_invite.agency_id;

  IF FOUND THEN
    -- Already linked, just mark invite as used (idempotent)
    UPDATE account_provisioning
    SET is_used = true,
        used_at = NOW()
    WHERE invite_token = p_token::uuid
      AND is_used = false;

    RETURN json_build_object(
      'status', 'success',
      'code', 'ALREADY_LINKED',
      'message', '이미 연결된 계정입니다',
      'agency_id', v_invite.agency_id,
      'role', v_invite.role,
      'already_linked', true
    );
  END IF;

  -- Insert into agency_members (transaction-safe)
  BEGIN
    INSERT INTO agency_members (user_id, agency_id, role, created_at)
    VALUES (v_user_id, v_invite.agency_id, v_invite.role, NOW());
  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition: another process already inserted
      RETURN json_build_object(
        'status', 'success',
        'code', 'ALREADY_LINKED',
        'message', '이미 연결된 계정입니다',
        'agency_id', v_invite.agency_id,
        'role', v_invite.role,
        'already_linked', true
      );
  END;

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
    'code', 'LINKED',
    'message', '에이전시에 연결되었습니다',
    'agency_id', v_invite.agency_id,
    'role', v_invite.role,
    'already_linked', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'SYSTEM_ERROR',
      'message', '시스템 오류가 발생했습니다: ' || SQLERRM
    );
END;
$$;

-- ============================================================================
-- 3. Add index for faster lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_agency_members_user_agency
ON agency_members(user_id, agency_id);

CREATE INDEX IF NOT EXISTS idx_agency_members_agency
ON agency_members(agency_id) WHERE created_at IS NOT NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION accept_invite_and_link(TEXT) TO authenticated;