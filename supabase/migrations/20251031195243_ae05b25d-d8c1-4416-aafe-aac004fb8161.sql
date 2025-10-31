-- Phase 77-RPC-IMPORT-MEMO-FIX: Preserve empty memo as empty string instead of NULL
-- This ensures all Excel data is reflected in DB even when memo is empty

CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_data jsonb,
  p_replace boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_agency_id uuid;
  v_session_id text := 'excel_' || extract(epoch from now())::bigint::text;
  v_row jsonb;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_deleted integer := 0;
  v_mode text := 'merge';
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id FROM events WHERE id = p_event_id;
  
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  -- Replace mode: soft-delete existing participants
  IF p_replace = true THEN
    UPDATE participants
    SET is_active = false, updated_at = now()
    WHERE event_id = p_event_id AND is_active = true;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_mode := 'replace';
  END IF;

  -- Process each row from Excel
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    -- Map Korean columns to standard fields and preserve empty strings
    INSERT INTO participants (
      event_id,
      agency_id,
      name,
      organization,
      phone,
      manager_info,
      sfe_hospital_code,
      sfe_customer_code,
      memo,
      request_note,
      role_badge,
      composition,
      is_active
    )
    VALUES (
      p_event_id,
      v_agency_id,
      COALESCE(NULLIF(TRIM(COALESCE(v_row->>'고객 성명', v_row->>'성명', '')), ''), 'Unknown'),
      NULLIF(TRIM(COALESCE(v_row->>'거래처명', v_row->>'소속', '')), ''),
      NULLIF(TRIM(COALESCE(v_row->>'고객 연락처', v_row->>'연락처', '')), ''),
      jsonb_build_object(
        'team', NULLIF(TRIM(COALESCE(v_row->>'팀명', '')), ''),
        'name', NULLIF(TRIM(COALESCE(v_row->>'담당자 성명', v_row->>'담당자', '')), ''),
        'phone', NULLIF(TRIM(COALESCE(v_row->>'담당자 연락처', '')), ''),
        'emp_id', NULLIF(TRIM(COALESCE(v_row->>'담당자 사번', v_row->>'사번', '')), '')
      ),
      NULLIF(TRIM(COALESCE(v_row->>'SFE 거래처코드', '')), ''),
      NULLIF(TRIM(COALESCE(v_row->>'SFE 고객코드', '')), ''),
      -- memo: preserve empty string instead of NULL
      COALESCE(TRIM(COALESCE(v_row->>'메모', v_row->>'특이사항', '')), ''),
      -- request_note: preserve empty string instead of NULL
      COALESCE(TRIM(COALESCE(v_row->>'요청사항', '')), ''),
      '참석자',
      jsonb_build_object('adult', 1, 'child', 0, 'infant', 0),
      true
    )
    ON CONFLICT (event_id, phone)
    DO UPDATE SET
      name = EXCLUDED.name,
      organization = EXCLUDED.organization,
      manager_info = EXCLUDED.manager_info,
      sfe_hospital_code = EXCLUDED.sfe_hospital_code,
      sfe_customer_code = EXCLUDED.sfe_customer_code,
      memo = EXCLUDED.memo,
      request_note = EXCLUDED.request_note,
      is_active = true,
      updated_at = now();
    
    IF FOUND THEN
      v_updated := v_updated + 1;
    ELSE
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -- Log the upload session
  INSERT INTO participants_log (
    event_id,
    agency_id,
    action,
    context_json,
    upload_session_id
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'bulk_upload',
    jsonb_build_object(
      'mode', v_mode,
      'inserted', v_inserted,
      'updated', v_updated,
      'deleted', v_deleted,
      'total', v_inserted + v_updated
    ),
    v_session_id
  );

  -- Notify real-time listeners
  PERFORM pg_notify(
    'participants_update',
    jsonb_build_object(
      'event_id', p_event_id,
      'action', 'bulk_upload',
      'session_id', v_session_id
    )::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'total', v_inserted + v_updated,
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted,
    'mode', v_mode,
    'event_id', p_event_id,
    'agency_id', v_agency_id,
    'session_id', v_session_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean)
  TO authenticated, service_role;