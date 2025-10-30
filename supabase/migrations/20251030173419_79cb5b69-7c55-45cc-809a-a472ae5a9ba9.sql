-- ============================================================================
-- Phase 74-A.1: Invite Token Hardening (초대 토큰 보안·만료·단일사용)
-- ============================================================================

-- 1. Add missing indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_account_provisioning_token 
ON account_provisioning(invite_token) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_account_provisioning_email 
ON account_provisioning(email);

CREATE INDEX IF NOT EXISTS idx_account_provisioning_agency 
ON account_provisioning(agency_id) WHERE is_active = true;

-- 2. Fix any null expires_at (set to 7 days from created_at)
UPDATE account_provisioning
SET expires_at = created_at + interval '7 days'
WHERE expires_at IS NULL;

-- 3. Ensure expires_at is never null in future
ALTER TABLE account_provisioning
ALTER COLUMN expires_at SET NOT NULL;

-- 4. Add constraint to ensure token uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_provisioning_active_token
ON account_provisioning(invite_token) 
WHERE is_active = true AND is_used = false;

-- ============================================================================
-- RPC: create_agency_invite (멱등 초대 생성)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_agency_invite(
  p_agency_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'staff'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
  v_base_url TEXT;
  v_invite_url TEXT;
  v_existing_invite RECORD;
  v_caller_role TEXT;
BEGIN
  -- Check permissions
  SELECT role::text INTO v_caller_role
  FROM user_roles
  WHERE user_id = auth.uid();

  -- MASTER: full access
  -- AGENCY_OWNER/STAFF: only their agency
  IF v_caller_role != 'master' THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND agency_id = p_agency_id
        AND role IN ('agency_owner', 'staff')
    ) THEN
      RETURN json_build_object(
        'status', 'error',
        'message', '해당 에이전시에 대한 권한이 없습니다'
      );
    END IF;
  END IF;

  -- Validate email
  IF p_email IS NULL OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '유효한 이메일을 입력해주세요'
    );
  END IF;

  -- Check for existing non-accepted invite (idempotent)
  SELECT * INTO v_existing_invite
  FROM account_provisioning
  WHERE email = p_email
    AND agency_id = p_agency_id
    AND is_used = false
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_invite.id IS NOT NULL THEN
    -- Regenerate token and extend expiry
    v_token := gen_random_uuid();
    
    UPDATE account_provisioning
    SET invite_token = v_token,
        expires_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = v_existing_invite.id;

    -- Build invite URL
    v_base_url := COALESCE(
      current_setting('app.base_url', true),
      'https://sympohub.vercel.app'
    );
    v_invite_url := v_base_url || '/signup/' || v_token::text;

    RETURN json_build_object(
      'status', 'success',
      'message', '기존 초대 링크가 갱신되었습니다',
      'token', v_token,
      'invite_url', v_invite_url,
      'email', p_email,
      'expires_at', (NOW() + INTERVAL '7 days')::text,
      'regenerated', true
    );
  END IF;

  -- Create new invite
  v_token := gen_random_uuid();

  INSERT INTO account_provisioning (
    email,
    role,
    agency_id,
    invite_token,
    expires_at,
    created_by,
    is_active,
    is_used
  ) VALUES (
    p_email,
    p_role,
    p_agency_id,
    v_token,
    NOW() + INTERVAL '7 days',
    auth.uid(),
    true,
    false
  );

  -- Build invite URL
  v_base_url := COALESCE(
    current_setting('app.base_url', true),
    'https://sympohub.vercel.app'
  );
  v_invite_url := v_base_url || '/signup/' || v_token::text;

  -- Log activity
  INSERT INTO activity_logs (
    agency_id,
    created_by,
    type,
    title,
    description
  ) VALUES (
    p_agency_id,
    auth.uid(),
    'invite',
    '사용자 초대',
    p_email || '에게 초대장을 발송했습니다'
  );

  RETURN json_build_object(
    'status', 'success',
    'message', '초대 링크가 발급되었습니다',
    'token', v_token,
    'invite_url', v_invite_url,
    'email', p_email,
    'expires_at', (NOW() + INTERVAL '7 days')::text,
    'regenerated', false
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
-- RPC: validate_invite_token (토큰 검증)
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_invite_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_agency_name TEXT;
BEGIN
  -- Find invite
  SELECT * INTO v_invite
  FROM account_provisioning
  WHERE invite_token = p_token::uuid
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'NOT_FOUND',
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
      'message', '초대가 만료되었습니다',
      'expired_at', v_invite.expires_at::text
    );
  END IF;

  -- Check if revoked
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'REVOKED',
      'message', '취소된 초대 코드입니다',
      'revoked_at', v_invite.revoked_at::text
    );
  END IF;

  -- Get agency name
  SELECT name INTO v_agency_name
  FROM agencies
  WHERE id = v_invite.agency_id;

  -- Valid invite
  RETURN json_build_object(
    'status', 'success',
    'email', v_invite.email,
    'role', v_invite.role,
    'agency_id', v_invite.agency_id,
    'agency_name', v_agency_name,
    'expires_at', v_invite.expires_at::text,
    'created_at', v_invite.created_at::text
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'code', 'SYSTEM_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_agency_invite(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite_token(TEXT) TO anon, authenticated;

-- ============================================================================
-- RLS Policies for account_provisioning
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS account_provisioning_master_all ON account_provisioning;
DROP POLICY IF EXISTS account_provisioning_agency_select ON account_provisioning;
DROP POLICY IF EXISTS account_provisioning_agency_insert ON account_provisioning;

-- MASTER: full access
CREATE POLICY account_provisioning_master_all
ON account_provisioning
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'master'))
WITH CHECK (has_role(auth.uid(), 'master'));

-- AGENCY: only their agency
CREATE POLICY account_provisioning_agency_select
ON account_provisioning
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.agency_id = account_provisioning.agency_id
  )
);

CREATE POLICY account_provisioning_agency_insert
ON account_provisioning
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.agency_id = account_provisioning.agency_id
      AND user_roles.role IN ('agency_owner', 'staff')
  )
);