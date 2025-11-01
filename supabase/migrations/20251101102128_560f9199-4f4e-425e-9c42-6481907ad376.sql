-- Phase 79-R: Excel Upload System Rebuild
-- Drop legacy functions, standardize tables, create new upload RPC

-- ============================================================
-- STEP 1: Drop Legacy RPC Functions
-- ============================================================

-- Drop all versions of ai_participant_import_from_excel
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean);
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb);

-- Drop import_participants_from_excel if it exists
DROP FUNCTION IF EXISTS public.import_participants_from_excel(uuid, jsonb, boolean, text);
DROP FUNCTION IF EXISTS public.import_participants_from_excel(uuid, jsonb, boolean);
DROP FUNCTION IF EXISTS public.import_participants_from_excel(uuid, jsonb);

-- ============================================================
-- STEP 2: Standardize Staging Table
-- ============================================================

-- Remove deprecated columns from participants_staging
ALTER TABLE public.participants_staging
  DROP COLUMN IF EXISTS request_memo,
  DROP COLUMN IF EXISTS sfe_info;

-- Add table comment documenting Phase 79-R structure
COMMENT ON TABLE public.participants_staging IS 
'[Phase 79-R] Excel upload staging area. Columns: name, organization, phone, request_note, manager_info (JSON), memo. 
Upload flow: Excel → staging (validate) → participants (commit). Does NOT touch rooming_participants.';

-- ============================================================
-- STEP 3: Add DEPRECATED Comments to Participants Table
-- ============================================================

-- Mark legacy columns as deprecated (do NOT drop yet - data migration in Phase 80)
COMMENT ON COLUMN public.participants.companion_info IS '[DEPRECATED Phase 79-R] Move to rooming_participants table';
COMMENT ON COLUMN public.participants.composition IS '[DEPRECATED Phase 79-R] Move to rooming_participants table';
COMMENT ON COLUMN public.participants.room_preference IS '[DEPRECATED Phase 79-R] Move to rooming_participants table';
COMMENT ON COLUMN public.participants.position IS '[DEPRECATED Phase 79-R] Use manager_info JSON instead';
COMMENT ON COLUMN public.participants.sfe_company_code IS '[DEPRECATED Phase 79-R] Use manager_info.sfe_hospital_code instead';
COMMENT ON COLUMN public.participants.sfe_customer_code IS '[DEPRECATED Phase 79-R] Use manager_info.sfe_customer_code instead';

-- ============================================================
-- STEP 4: Create New Upload RPC Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.upload_participants_excel(
  p_event_id uuid,
  p_rows jsonb,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id text;
  v_agency_id uuid;
  v_row record;
  v_inserted int := 0;
  v_skipped int := 0;
  v_name text;
  v_phone text;
  v_organization text;
  v_request_note text;
  v_memo text;
  v_manager_info jsonb;
BEGIN
  -- Generate or use provided session_id
  v_session_id := COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text);
  
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;
  
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or agency_id is null';
  END IF;
  
  -- Clear existing staging data for this session
  DELETE FROM public.participants_staging
  WHERE event_id = p_event_id
    AND upload_session_id = v_session_id;
  
  -- Process each row from Excel
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- Extract and trim fields (support Korean column names)
    v_name := NULLIF(TRIM(COALESCE(
      v_row.value->>'이름',
      v_row.value->>'고객 성명',
      v_row.value->>'name',
      ''
    )), '');
    
    v_phone := NULLIF(TRIM(COALESCE(
      v_row.value->>'연락처',
      v_row.value->>'고객 연락처',
      v_row.value->>'phone',
      ''
    )), '');
    
    -- Skip if name or phone is missing
    IF v_name IS NULL OR v_phone IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Extract optional fields
    v_organization := NULLIF(TRIM(COALESCE(
      v_row.value->>'소속',
      v_row.value->>'거래처명',
      v_row.value->>'organization',
      ''
    )), '');
    
    v_request_note := NULLIF(TRIM(COALESCE(
      v_row.value->>'요청사항',
      v_row.value->>'request_note',
      ''
    )), '');
    
    v_memo := NULLIF(TRIM(COALESCE(
      v_row.value->>'메모',
      v_row.value->>'memo',
      ''
    )), '');
    
    -- Build manager_info JSON (담당자 정보)
    v_manager_info := jsonb_strip_nulls(jsonb_build_object(
      'team', NULLIF(TRIM(COALESCE(v_row.value->>'팀명', '')), ''),
      'name', NULLIF(TRIM(COALESCE(v_row.value->>'담당자 성명', '')), ''),
      'phone', NULLIF(TRIM(COALESCE(v_row.value->>'담당자 연락처', '')), ''),
      'emp_id', NULLIF(TRIM(COALESCE(v_row.value->>'담당자 사번', '')), ''),
      'sfe_hospital_code', NULLIF(NULLIF(TRIM(COALESCE(v_row.value->>'SFE 거래처코드', '')), ''), '-'),
      'sfe_customer_code', NULLIF(NULLIF(TRIM(COALESCE(v_row.value->>'SFE 고객코드', '')), ''), '-')
    ));
    
    -- Insert into staging
    BEGIN
      INSERT INTO public.participants_staging (
        event_id,
        upload_session_id,
        name,
        organization,
        phone,
        request_note,
        memo,
        manager_info,
        validation_status,
        validation_message,
        created_at
      )
      VALUES (
        p_event_id,
        v_session_id,
        v_name,
        v_organization,
        v_phone,
        v_request_note,
        v_memo,
        v_manager_info,
        'pending',
        NULL,
        NOW()
      );
      
      v_inserted := v_inserted + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;
  
  -- Log the upload
  INSERT INTO public.participants_log (
    event_id,
    agency_id,
    action,
    metadata,
    created_by,
    created_at
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'excel_upload_to_staging',
    jsonb_build_object(
      'session_id', v_session_id,
      'inserted', v_inserted,
      'skipped', v_skipped,
      'total_rows', v_inserted + v_skipped
    ),
    auth.uid(),
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'inserted', v_inserted,
    'skipped', v_skipped,
    'total', v_inserted + v_skipped
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.upload_participants_excel(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upload_participants_excel(uuid, jsonb, text) TO service_role;

-- ============================================================
-- STEP 5: Verification Queries (Run manually to verify)
-- ============================================================

-- Verify legacy functions are dropped
-- SELECT proname FROM pg_proc WHERE proname LIKE '%import%participant%';

-- Verify staging table structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'participants_staging' ORDER BY ordinal_position;

-- Verify new function exists
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'upload_participants_excel';