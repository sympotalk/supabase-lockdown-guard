-- [Phase 73-L.1] Excel Import AI Layer - 13 Column Recruitment Format
-- Remove event_rooms dependencies, handle manager_info + SFE codes properly

-- 1️⃣ Add upload_session_id to participants_log for tracking
ALTER TABLE public.participants_log 
ADD COLUMN IF NOT EXISTS upload_session_id text;

-- 2️⃣ Recreate bulk upload RPC for 13-column format
DROP FUNCTION IF EXISTS fn_bulk_upload_participants CASCADE;

CREATE OR REPLACE FUNCTION fn_bulk_upload_participants(
  p_event_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_agency uuid;
  v_user_agency uuid;
  v_user_role text;
  v_session_id text := gen_random_uuid()::text;
  
  -- 13-column mapping variables
  v_event_name text;
  v_team_name text;
  v_manager_name text;
  v_manager_phone text;
  v_customer_name text;
  v_organization text;
  v_sfe_hospital_code text;
  v_sfe_customer_code text;
  v_customer_phone text;
  v_memo text;
  v_manager_emp_id text;
  v_registered_at text;
  v_is_deleted text;
  
  v_existing_id uuid;
  v_new int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_total int := 0;
  v_row jsonb;
  v_manager_info jsonb;
  v_is_active boolean;
BEGIN
  -- Get event agency
  SELECT agency_id INTO v_event_agency FROM events WHERE id = p_event_id LIMIT 1;
  
  IF v_event_agency IS NULL THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;

  -- Get user agency and role
  SELECT agency_id, role::text INTO v_user_agency, v_user_role 
  FROM user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  -- Master bypass for agency scope check
  IF v_user_role != 'master' AND (v_user_agency IS NULL OR v_user_agency != v_event_agency) THEN
    RAISE EXCEPTION 'AGENCY_SCOPE_MISMATCH';
  END IF;

  -- Process each row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_total := v_total + 1;
    
    -- [Phase 73-L.1] Map 13 columns (with flexible header names)
    v_event_name := coalesce(v_row->>'event_name', v_row->>'행사명');
    v_team_name := coalesce(v_row->>'team_name', v_row->>'팀명', v_row->>'팀');
    v_manager_name := coalesce(v_row->>'manager_name', v_row->>'담당자 성명', v_row->>'담당자', v_row->>'담당자성명');
    v_manager_phone := coalesce(v_row->>'manager_phone', v_row->>'담당자 연락처', v_row->>'담당자연락처', v_row->>'담당자전화');
    v_customer_name := coalesce(v_row->>'name', v_row->>'고객 성명', v_row->>'고객성명', v_row->>'성명', v_row->>'이름');
    v_organization := coalesce(v_row->>'organization', v_row->>'거래처명', v_row->>'소속', v_row->>'회사');
    v_sfe_hospital_code := coalesce(v_row->>'sfe_hospital_code', v_row->>'SFE 거래처코드', v_row->>'거래처코드', v_row->>'SFE거래처코드');
    v_sfe_customer_code := coalesce(v_row->>'sfe_customer_code', v_row->>'SFE 고객코드', v_row->>'고객코드', v_row->>'SFE고객코드');
    v_customer_phone := coalesce(v_row->>'phone', v_row->>'고객 연락처', v_row->>'고객연락처', v_row->>'연락처', v_row->>'전화');
    v_memo := coalesce(v_row->>'memo', v_row->>'메모');
    v_manager_emp_id := coalesce(v_row->>'manager_emp_id', v_row->>'담당자 사번', v_row->>'담당자사번', v_row->>'사번');
    v_registered_at := coalesce(v_row->>'registered_at', v_row->>'등록 일시', v_row->>'등록일시');
    v_is_deleted := coalesce(v_row->>'is_deleted', v_row->>'삭제유무', v_row->>'삭제');

    -- Skip if customer name is empty
    IF v_customer_name IS NULL OR trim(v_customer_name) = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Clean phone number (remove spaces, dashes)
    v_customer_phone := regexp_replace(v_customer_phone, '[^0-9]', '', 'g');
    v_manager_phone := regexp_replace(v_manager_phone, '[^0-9]', '', 'g');

    -- Handle SFE codes: blank or '-' → null
    IF v_sfe_hospital_code IS NOT NULL AND (trim(v_sfe_hospital_code) = '' OR trim(v_sfe_hospital_code) = '-') THEN
      v_sfe_hospital_code := NULL;
    END IF;
    IF v_sfe_customer_code IS NOT NULL AND (trim(v_sfe_customer_code) = '' OR trim(v_sfe_customer_code) = '-') THEN
      v_sfe_customer_code := NULL;
    END IF;

    -- Determine is_active based on 삭제유무
    v_is_active := NOT (v_is_deleted IN ('Y', '삭제', 'true', 'TRUE', '1'));

    -- Build manager_info JSON (always create, even if partial)
    v_manager_info := jsonb_build_object(
      'team', v_team_name,
      'name', v_manager_name,
      'phone', v_manager_phone,
      'emp_id', v_manager_emp_id
    );

    -- Check for existing participant (by event_id + phone)
    SELECT id INTO v_existing_id
    FROM participants
    WHERE event_id = p_event_id
      AND phone = v_customer_phone
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Update existing (merge fields)
      UPDATE participants
      SET 
        name = coalesce(v_customer_name, name),
        organization = coalesce(v_organization, organization),
        phone = coalesce(v_customer_phone, phone),
        memo = coalesce(v_memo, memo),
        team_name = coalesce(v_team_name, team_name),
        manager_name = coalesce(v_manager_name, manager_name),
        manager_phone = coalesce(v_manager_phone, manager_phone),
        manager_info = v_manager_info,
        sfe_hospital_code = coalesce(v_sfe_hospital_code, sfe_hospital_code),
        sfe_customer_code = coalesce(v_sfe_customer_code, sfe_customer_code),
        updated_at = now(),
        updated_by = auth.uid()
      WHERE id = v_existing_id;
      
      v_updated := v_updated + 1;

      -- Log update
      INSERT INTO participants_log (
        participant_id, event_id, agency_id, action, 
        old_status, new_status, changed_by, upload_session_id
      ) VALUES (
        v_existing_id, p_event_id, v_event_agency, 'excel_update',
        'updated', 'updated', auth.uid(), v_session_id
      );
    ELSE
      -- Insert new participant with defaults
      INSERT INTO participants (
        event_id, agency_id, 
        name, organization, phone, memo,
        team_name, manager_name, manager_phone, manager_info,
        sfe_hospital_code, sfe_customer_code,
        role_badge, composition, room_type, room_credit,
        status, is_active, assigned_at,
        created_by
      ) VALUES (
        p_event_id, v_event_agency,
        v_customer_name, v_organization, v_customer_phone, v_memo,
        v_team_name, v_manager_name, v_manager_phone, v_manager_info,
        v_sfe_hospital_code, v_sfe_customer_code,
        '참석자', 
        jsonb_build_object('adult', 1, 'child', 0, 'infant', 0),
        '배정대기', 
        0,
        '대기', 
        v_is_active, 
        now(),
        auth.uid()
      )
      RETURNING id INTO v_existing_id;
      
      v_new := v_new + 1;

      -- Log insert
      INSERT INTO participants_log (
        participant_id, event_id, agency_id, action,
        old_status, new_status, changed_by, upload_session_id
      ) VALUES (
        v_existing_id, p_event_id, v_event_agency, 'excel_insert',
        NULL, 'new', auth.uid(), v_session_id
      );
    END IF;
  END LOOP;

  -- Broadcast to realtime for immediate UI update
  PERFORM pg_notify('participants_upload', json_build_object(
    'event_id', p_event_id,
    'agency_id', v_event_agency,
    'session_id', v_session_id,
    'new', v_new,
    'updated', v_updated
  )::text);

  RETURN jsonb_build_object(
    'status', 'success',
    'event_id', p_event_id,
    'agency_id', v_event_agency,
    'session_id', v_session_id,
    'total', v_total,
    'new', v_new,
    'updated', v_updated,
    'skipped', v_skipped
  );
END;
$$;

COMMENT ON FUNCTION fn_bulk_upload_participants IS '[Phase 73-L.1] 13-column recruitment format with manager_info + SFE codes';

GRANT EXECUTE ON FUNCTION fn_bulk_upload_participants TO authenticated;