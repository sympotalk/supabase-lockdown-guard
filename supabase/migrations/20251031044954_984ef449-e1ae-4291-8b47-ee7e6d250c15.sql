-- Phase 75-B.1: Upgrade ai_participant_import_from_excel with UPSERT + Enhanced Logging
-- Goal: (event_id, phone) based UPSERT, rich metadata in participants_log

CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id UUID,
  p_data JSONB,
  p_replace BOOLEAN DEFAULT false,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ins INT := 0;
  v_upd INT := 0;
  v_skip INT := 0;
  v_skipped JSONB := '[]'::jsonb;
  v_row RECORD;
  v_name TEXT;
  v_phone TEXT;
  v_organization TEXT;
  v_email TEXT;
  v_request_note TEXT;
  v_memo TEXT;
  v_manager_info JSONB;
  v_sfe_company_code TEXT;
  v_sfe_customer_code TEXT;
  v_created_at TIMESTAMP WITH TIME ZONE;
  v_agency_id UUID;
  v_deleted INT := 0;
  v_participant_id UUID;
  v_was_insert BOOLEAN;
  v_session_key TEXT;
BEGIN
  -- Generate session key if not provided
  v_session_key := COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text);

  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- Replace mode: soft delete existing participants
  IF p_replace THEN
    UPDATE public.participants
    SET is_active = false, updated_at = NOW()
    WHERE event_id = p_event_id AND is_active = true;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  -- Process each row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    -- Extract and trim required fields
    v_name := NULLIF(TRIM(v_row.value->>'고객 성명'), '');
    v_phone := NULLIF(TRIM(v_row.value->>'고객 연락처'), '');
    
    -- Skip if required fields are missing
    IF v_name IS NULL OR v_phone IS NULL THEN
      v_skip := v_skip + 1;
      v_skipped := v_skipped || jsonb_build_object(
        'row', v_row.value,
        'reason', 'name/phone required'
      );
      CONTINUE;
    END IF;

    -- Extract optional fields
    v_organization := NULLIF(TRIM(v_row.value->>'거래처명'), '');
    v_email := NULLIF(TRIM(v_row.value->>'이메일'), '');
    v_request_note := NULLIF(TRIM(v_row.value->>'요청사항'), '');
    v_memo := NULLIF(TRIM(v_row.value->>'메모'), '');
    
    -- Extract SFE codes (convert blank/'-' to NULL)
    v_sfe_company_code := NULLIF(NULLIF(TRIM(v_row.value->>'SFE 거래처코드'), ''), '-');
    v_sfe_customer_code := NULLIF(NULLIF(TRIM(v_row.value->>'SFE 고객코드'), ''), '-');
    
    -- Build manager_info JSON
    v_manager_info := jsonb_strip_nulls(jsonb_build_object(
      'team', NULLIF(TRIM(v_row.value->>'팀명'), ''),
      'name', NULLIF(TRIM(v_row.value->>'담당자 성명'), ''),
      'phone', NULLIF(TRIM(v_row.value->>'담당자 연락처'), ''),
      'emp_id', NULLIF(TRIM(v_row.value->>'담당자 사번'), '')
    ));
    
    -- Parse created_at if provided
    BEGIN
      v_created_at := to_timestamp(
        NULLIF(TRIM(v_row.value->>'등록 일시'), ''),
        'YYYY-MM-DD HH24:MI:SS'
      );
    EXCEPTION WHEN OTHERS THEN
      v_created_at := NOW();
    END;

    BEGIN
      -- UPSERT with conflict detection
      INSERT INTO public.participants (
        event_id,
        agency_id,
        name,
        phone,
        organization,
        email,
        request_note,
        memo,
        manager_info,
        sfe_company_code,
        sfe_customer_code,
        role_badge,
        composition,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        p_event_id,
        v_agency_id,
        v_name,
        v_phone,
        v_organization,
        v_email,
        v_request_note,
        v_memo,
        v_manager_info,
        v_sfe_company_code,
        v_sfe_customer_code,
        '참석자',
        '{"adult": 1, "child": 0, "infant": 0}'::jsonb,
        true,
        v_created_at,
        NOW()
      )
      ON CONFLICT (event_id, phone)
      DO UPDATE SET
        name = EXCLUDED.name,
        organization = EXCLUDED.organization,
        email = EXCLUDED.email,
        request_note = EXCLUDED.request_note,
        memo = EXCLUDED.memo,
        manager_info = participants.manager_info || EXCLUDED.manager_info,
        sfe_company_code = EXCLUDED.sfe_company_code,
        sfe_customer_code = EXCLUDED.sfe_customer_code,
        is_active = true,
        updated_at = NOW()
      RETURNING id, (xmax = 0) INTO v_participant_id, v_was_insert;

      -- Track insert vs update
      IF v_was_insert THEN
        v_ins := v_ins + 1;
      ELSE
        v_upd := v_upd + 1;
      END IF;

      -- Log to participants_log with enriched metadata
      INSERT INTO public.participants_log (
        participant_id,
        event_id,
        agency_id,
        action,
        upload_session_id,
        metadata,
        edited_by,
        created_at,
        edited_at
      )
      VALUES (
        v_participant_id,
        p_event_id,
        v_agency_id,
        CASE WHEN v_was_insert THEN 'bulk_insert' ELSE 'bulk_update' END,
        v_session_key,
        jsonb_build_object(
          'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
          'session_id', v_session_key,
          'name', v_name,
          'phone', v_phone,
          'organization', v_organization,
          'sfe_company_code', v_sfe_company_code,
          'sfe_customer_code', v_sfe_customer_code,
          'manager_info', v_manager_info,
          'was_insert', v_was_insert
        ),
        auth.uid(),
        NOW(),
        NOW()
      );

    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip + 1;
      v_skipped := v_skipped || jsonb_build_object(
        'row', v_row.value,
        'reason', SQLERRM
      );
    END;
  END LOOP;

  -- Log summary to participants_log
  INSERT INTO public.participants_log (
    event_id,
    agency_id,
    action,
    upload_session_id,
    metadata,
    edited_by,
    created_at,
    edited_at
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'bulk_upload_summary',
    v_session_key,
    jsonb_build_object(
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
      'session_id', v_session_key,
      'inserted', v_ins,
      'updated', v_upd,
      'skipped', v_skip,
      'deleted', v_deleted,
      'total_processed', v_ins + v_upd,
      'skipped_rows', v_skipped
    ),
    auth.uid(),
    NOW(),
    NOW()
  );

  -- Broadcast real-time update
  PERFORM pg_notify(
    'participants_upload',
    json_build_object(
      'event_id', p_event_id,
      'session_id', v_session_key,
      'inserted', v_ins,
      'updated', v_upd,
      'skipped', v_skip
    )::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'total', v_ins + v_upd,
    'inserted', v_ins,
    'updated', v_upd,
    'skipped', v_skip,
    'deleted', v_deleted,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
    'event_id', p_event_id,
    'agency_id', v_agency_id,
    'session_id', v_session_key
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text) TO service_role;