-- Phase 77-RPC-REPLACE-FORCE.v3
-- Purpose: Enforce Replace mode with strict event_id validation and forced reset

CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_data jsonb,
  p_replace boolean DEFAULT false,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record jsonb;
  v_name TEXT;
  v_phone TEXT;
  v_company TEXT;
  v_request_note TEXT;
  v_memo TEXT;
  v_position TEXT;
  v_email TEXT;
  v_department TEXT;
  v_address TEXT;
  v_sfe_company_code TEXT;
  v_sfe_customer_code TEXT;
  v_manager_email TEXT;
  v_role_badge TEXT;
  v_manager_info JSONB;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_deleted INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  -- ✅ Strict event_id validation
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'MISSING_EVENT_ID: event_id parameter is required';
  END IF;

  -- ✅ Replace mode: Force complete deletion
  IF p_replace = true THEN
    DELETE FROM public.participants WHERE event_id = p_event_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    INSERT INTO public.participants_log(event_id, action, context_json)
    VALUES (
      p_event_id,
      'bulk_replace_delete',
      jsonb_build_object(
        'deleted_rows', v_deleted,
        'session_id', p_session_id,
        'timestamp', now()
      )
    );
  END IF;

  -- ✅ Process each record
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      -- Extract and normalize fields
      v_name := COALESCE(TRIM(v_record->>'name'), TRIM(v_record->>'성명'), TRIM(v_record->>'이름'), '');
      v_phone := COALESCE(TRIM(v_record->>'phone'), TRIM(v_record->>'연락처'), TRIM(v_record->>'전화번호'), '');
      v_company := COALESCE(TRIM(v_record->>'organization'), TRIM(v_record->>'소속'), '');
      v_request_note := COALESCE(TRIM(v_record->>'request_note'), TRIM(v_record->>'요청사항'), '');
      v_memo := COALESCE(TRIM(v_record->>'memo'), TRIM(v_record->>'메모'), '');
      v_position := COALESCE(TRIM(v_record->>'position'), TRIM(v_record->>'직급'), '');
      v_email := COALESCE(TRIM(v_record->>'email'), TRIM(v_record->>'이메일'), '');
      v_department := COALESCE(TRIM(v_record->>'department'), TRIM(v_record->>'부서'), '');
      v_address := COALESCE(TRIM(v_record->>'address'), TRIM(v_record->>'주소'), '');
      v_sfe_company_code := COALESCE(TRIM(v_record->>'sfe_company_code'), TRIM(v_record->>'SFE거래처코드'), '');
      v_sfe_customer_code := COALESCE(TRIM(v_record->>'sfe_customer_code'), TRIM(v_record->>'SFE고객코드'), '');
      v_manager_email := COALESCE(TRIM(v_record->>'manager_email'), TRIM(v_record->>'담당자이메일'), '');
      v_role_badge := COALESCE(TRIM(v_record->>'role_badge'), TRIM(v_record->>'구분'), '참석자');

      -- Build manager_info JSON
      v_manager_info := jsonb_build_object(
        'team', COALESCE(NULLIF(TRIM(v_record->'manager_info'->>'team'), ''), NULLIF(TRIM(v_record->>'팀명'), ''), ''),
        'name', COALESCE(NULLIF(TRIM(v_record->'manager_info'->>'name'), ''), NULLIF(TRIM(v_record->>'담당자'), ''), ''),
        'phone', COALESCE(NULLIF(TRIM(v_record->'manager_info'->>'phone'), ''), NULLIF(TRIM(v_record->>'담당자연락처'), ''), ''),
        'emp_id', COALESCE(NULLIF(TRIM(v_record->'manager_info'->>'emp_id'), ''), NULLIF(TRIM(v_record->>'사번'), ''), '')
      );

      -- Skip rows with missing required fields
      IF v_name = '' OR v_phone = '' THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- ✅ Insert/Update participant (companion fields excluded as per Phase 77-RPC-UPLOAD-DECOUPLE)
      INSERT INTO public.participants (
        event_id, name, phone, organization,
        request_note, memo, position, email,
        department, address, sfe_company_code, sfe_customer_code,
        manager_info, manager_email, role_badge, updated_at
      )
      VALUES (
        p_event_id, v_name, v_phone, NULLIF(v_company, ''),
        NULLIF(v_request_note, ''), NULLIF(v_memo, ''), NULLIF(v_position, ''), NULLIF(v_email, ''),
        NULLIF(v_department, ''), NULLIF(v_address, ''), NULLIF(v_sfe_company_code, ''), NULLIF(v_sfe_customer_code, ''),
        v_manager_info, NULLIF(v_manager_email, ''), v_role_badge, NOW()
      )
      ON CONFLICT (event_id, phone)
      DO UPDATE SET
        name = EXCLUDED.name,
        organization = EXCLUDED.organization,
        request_note = EXCLUDED.request_note,
        memo = EXCLUDED.memo,
        position = EXCLUDED.position,
        email = EXCLUDED.email,
        department = EXCLUDED.department,
        address = EXCLUDED.address,
        sfe_company_code = EXCLUDED.sfe_company_code,
        sfe_customer_code = EXCLUDED.sfe_customer_code,
        manager_info = EXCLUDED.manager_info,
        manager_email = EXCLUDED.manager_email,
        role_badge = EXCLUDED.role_badge,
        updated_at = NOW();

      IF FOUND THEN
        v_updated := v_updated + 1;
      ELSE
        v_inserted := v_inserted + 1;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        CONTINUE;
    END;
  END LOOP;

  -- ✅ Log summary
  INSERT INTO public.participants_log(event_id, action, context_json)
  VALUES (
    p_event_id,
    'bulk_upload_summary',
    jsonb_build_object(
      'inserted', v_inserted,
      'updated', v_updated,
      'deleted', v_deleted,
      'skipped', v_skipped,
      'errors', v_errors,
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
      'session_id', p_session_id,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted,
    'skipped', v_skipped,
    'errors', v_errors,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
    'session_id', p_session_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text)
  TO authenticated, service_role;