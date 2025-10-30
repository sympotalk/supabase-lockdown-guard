-- ============================================================================
-- Phase 74-A.3: Profile Update & Mirror Sync (프로필 동기화 단일 경로)
-- ============================================================================

-- ============================================================================
-- 1. Add profile fields to agency_members table
-- ============================================================================
ALTER TABLE agency_members
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agency_members_updated_at
ON agency_members(updated_at DESC);

-- ============================================================================
-- 2. Create trigger to auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_agency_members_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agency_members_updated_at ON agency_members;
CREATE TRIGGER trg_agency_members_updated_at
  BEFORE UPDATE ON agency_members
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_members_updated_at();

-- ============================================================================
-- 3. Enhanced profile_update_and_sync RPC
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
  v_user_email TEXT;
  v_current_metadata JSONB;
  v_updated_metadata JSONB;
  v_agency_count INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '사용자 세션을 찾을 수 없습니다'
    );
  END IF;

  -- Get current user info
  SELECT email, raw_user_meta_data INTO v_user_email, v_current_metadata
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

  -- 1. Update auth.users.raw_user_meta_data
  UPDATE auth.users
  SET raw_user_meta_data = v_updated_metadata,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- 2. Sync to agency_members (all memberships)
  UPDATE agency_members
  SET
    display_name = COALESCE(p_display_name, display_name),
    phone = COALESCE(p_phone, phone),
    position = COALESCE(p_position, position),
    updated_at = NOW()
  WHERE user_id = v_user_id;

  GET DIAGNOSTICS v_agency_count = ROW_COUNT;

  -- 3. Log activity (for each agency)
  INSERT INTO activity_logs (
    agency_id,
    created_by,
    type,
    title,
    description
  )
  SELECT
    am.agency_id,
    v_user_id,
    'profile_update',
    '프로필 수정',
    v_user_email || '이(가) 프로필을 수정했습니다'
  FROM agency_members am
  WHERE am.user_id = v_user_id;

  RETURN json_build_object(
    'status', 'success',
    'message', '프로필이 저장되었습니다',
    'synced_agencies', v_agency_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '저장 중 오류가 발생했습니다: ' || SQLERRM
    );
END;
$$;

-- ============================================================================
-- 4. Create trigger to sync profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_phone TEXT;
  v_position TEXT;
BEGIN
  -- Extract metadata
  v_display_name := NEW.raw_user_meta_data->>'display_name';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_position := NEW.raw_user_meta_data->>'position';

  -- Update any existing agency_members records
  UPDATE agency_members
  SET
    display_name = COALESCE(v_display_name, display_name),
    phone = COALESCE(v_phone, phone),
    position = COALESCE(v_position, position),
    updated_at = NOW()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_on_signup ON auth.users;
CREATE TRIGGER trg_sync_profile_on_signup
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_on_signup();

-- Grant permissions
GRANT EXECUTE ON FUNCTION profile_update_and_sync(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 5. Backfill existing data from auth.users to agency_members
-- ============================================================================
UPDATE agency_members am
SET
  display_name = COALESCE(
    am.display_name,
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.email
  ),
  phone = COALESCE(
    am.phone,
    u.raw_user_meta_data->>'phone'
  ),
  position = COALESCE(
    am.position,
    u.raw_user_meta_data->>'position'
  )
FROM auth.users u
WHERE am.user_id = u.id
  AND (
    am.display_name IS NULL
    OR am.phone IS NULL
    OR am.position IS NULL
  );