-- ============================================================
-- Phase 78-B.2: RPC Functions for Staging-Based Excel Upload
-- ============================================================

-- 2-1. import_participants_from_excel: Load Excel data into staging
CREATE OR REPLACE FUNCTION public.import_participants_from_excel(
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
  v_count int := 0;
  v_row jsonb;
  v_agency_id uuid;
BEGIN
  -- Generate session ID if not provided
  v_session_id := COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text);
  
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;
  
  -- Insert each row into staging
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO public.participants_staging (
      event_id,
      upload_session_id,
      name,
      organization,
      phone,
      request_memo,
      manager_info,
      sfe_info,
      validation_status,
      uploaded_by,
      uploaded_at
    )
    VALUES (
      p_event_id,
      v_session_id,
      NULLIF(TRIM(v_row->>'이름'), ''),
      NULLIF(TRIM(v_row->>'소속'), ''),
      NULLIF(TRIM(v_row->>'고객 연락처'), ''),
      NULLIF(TRIM(v_row->>'요청사항'), ''),
      jsonb_strip_nulls(jsonb_build_object(
        'team', NULLIF(TRIM(v_row->>'팀명'), ''),
        'name', NULLIF(TRIM(v_row->>'담당자 성명'), ''),
        'phone', NULLIF(TRIM(v_row->>'담당자 연락처'), ''),
        'emp_id', NULLIF(TRIM(v_row->>'담당자 사번'), '')
      )),
      jsonb_strip_nulls(jsonb_build_object(
        'hospital_code', NULLIF(NULLIF(TRIM(v_row->>'SFE 거래처코드'), ''), '-'),
        'customer_code', NULLIF(NULLIF(TRIM(v_row->>'SFE 고객코드'), ''), '-')
      )),
      'pending',
      auth.uid(),
      now()
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'event_id', p_event_id,
    'count', v_count,
    'upload_session_id', v_session_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'reason', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_participants_from_excel(uuid, jsonb, text) TO authenticated;

-- 2-2. validate_staged_participants: Validate pending data
CREATE OR REPLACE FUNCTION public.validate_staged_participants(
  p_event_id uuid,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid_count int := 0;
  v_error_count int := 0;
  v_warn_count int := 0;
  v_row RECORD;
  v_normalized_phone text;
  v_dup_count int;
BEGIN
  -- Validate each pending row
  FOR v_row IN 
    SELECT * FROM public.participants_staging
    WHERE event_id = p_event_id 
      AND upload_session_id = p_session_id
      AND validation_status = 'pending'
  LOOP
    -- Check required fields
    IF v_row.name IS NULL OR TRIM(v_row.name) = '' THEN
      UPDATE public.participants_staging
      SET validation_status = 'error',
          validation_message = '이름이 비어 있습니다'
      WHERE id = v_row.id;
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;
    
    IF v_row.organization IS NULL OR TRIM(v_row.organization) = '' THEN
      UPDATE public.participants_staging
      SET validation_status = 'error',
          validation_message = '소속이 비어 있습니다'
      WHERE id = v_row.id;
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;
    
    -- Check length limits
    IF LENGTH(v_row.name) > 100 THEN
      UPDATE public.participants_staging
      SET validation_status = 'error',
          validation_message = '이름이 너무 깁니다 (최대 100자)'
      WHERE id = v_row.id;
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;
    
    IF LENGTH(v_row.organization) > 100 THEN
      UPDATE public.participants_staging
      SET validation_status = 'error',
          validation_message = '소속이 너무 깁니다 (최대 100자)'
      WHERE id = v_row.id;
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;
    
    -- Normalize and validate phone
    IF v_row.phone IS NOT NULL THEN
      v_normalized_phone := REGEXP_REPLACE(TRIM(v_row.phone), '[^0-9-]', '', 'g');
      IF v_normalized_phone != TRIM(v_row.phone) THEN
        UPDATE public.participants_staging
        SET validation_status = 'error',
            validation_message = '연락처 형식이 올바르지 않습니다 (숫자와 하이픈만 가능)'
        WHERE id = v_row.id;
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
    END IF;
    
    -- Check for duplicates within session
    SELECT COUNT(*) INTO v_dup_count
    FROM public.participants_staging
    WHERE event_id = p_event_id
      AND upload_session_id = p_session_id
      AND LOWER(TRIM(name)) = LOWER(TRIM(v_row.name))
      AND COALESCE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '') = COALESCE(REGEXP_REPLACE(v_row.phone, '[^0-9]', '', 'g'), '')
      AND id < v_row.id;
    
    IF v_dup_count > 0 THEN
      UPDATE public.participants_staging
      SET validation_status = 'valid',
          validation_message = '동일한 이름과 연락처가 이미 존재합니다'
      WHERE id = v_row.id;
      v_warn_count := v_warn_count + 1;
    ELSE
      -- Mark as valid
      UPDATE public.participants_staging
      SET validation_status = 'valid',
          validation_message = NULL
      WHERE id = v_row.id;
      v_valid_count := v_valid_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'status', 'ok',
    'summary', jsonb_build_object(
      'valid', v_valid_count,
      'error', v_error_count,
      'warn', v_warn_count
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'reason', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_staged_participants(uuid, text) TO authenticated;

-- 2-3. commit_staged_participants: Move valid data to participants table
CREATE OR REPLACE FUNCTION public.commit_staged_participants(
  p_event_id uuid,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count int := 0;
  v_updated_count int := 0;
  v_skipped_count int := 0;
  v_row RECORD;
  v_match_hash text;
  v_existing_id uuid;
  v_agency_id uuid;
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;
  
  -- Process each valid row
  FOR v_row IN 
    SELECT * FROM public.participants_staging
    WHERE event_id = p_event_id 
      AND upload_session_id = p_session_id
      AND validation_status = 'valid'
  LOOP
    -- Generate match hash
    v_match_hash := md5(
      LOWER(TRIM(v_row.name)) || '|' || 
      COALESCE(REGEXP_REPLACE(v_row.phone, '[^0-9]', '', 'g'), '')
    );
    
    -- Check if participant exists
    SELECT id INTO v_existing_id
    FROM public.participants
    WHERE event_id = p_event_id
      AND md5(LOWER(TRIM(name)) || '|' || COALESCE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '')) = v_match_hash
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
      -- Update existing participant
      UPDATE public.participants
      SET 
        organization = COALESCE(NULLIF(TRIM(v_row.organization), ''), organization),
        phone = COALESCE(NULLIF(TRIM(v_row.phone), ''), phone),
        memo = COALESCE(NULLIF(TRIM(v_row.request_memo), ''), memo),
        manager_info = CASE 
          WHEN v_row.manager_info IS NOT NULL AND v_row.manager_info != '{}'::jsonb 
          THEN manager_info || v_row.manager_info 
          ELSE manager_info 
        END,
        updated_at = now()
      WHERE id = v_existing_id;
      
      v_updated_count := v_updated_count + 1;
    ELSE
      -- Insert new participant
      INSERT INTO public.participants (
        event_id,
        agency_id,
        name,
        organization,
        phone,
        memo,
        manager_info,
        role_badge,
        composition,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        p_event_id,
        v_agency_id,
        TRIM(v_row.name),
        TRIM(v_row.organization),
        NULLIF(TRIM(v_row.phone), ''),
        NULLIF(TRIM(v_row.request_memo), ''),
        COALESCE(v_row.manager_info, '{}'::jsonb),
        '참석자',
        '{"adult": 1, "child": 0, "infant": 0}'::jsonb,
        true,
        now(),
        now()
      );
      
      v_inserted_count := v_inserted_count + 1;
    END IF;
    
    -- Delete from staging
    DELETE FROM public.participants_staging WHERE id = v_row.id;
  END LOOP;
  
  -- Count skipped (error rows remain in staging)
  SELECT COUNT(*) INTO v_skipped_count
  FROM public.participants_staging
  WHERE event_id = p_event_id 
    AND upload_session_id = p_session_id
    AND validation_status = 'error';
  
  -- Log the operation
  INSERT INTO public.participants_log (
    event_id,
    agency_id,
    action,
    metadata,
    created_by
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'bulk_import',
    jsonb_build_object(
      'session_id', p_session_id,
      'inserted', v_inserted_count,
      'updated', v_updated_count,
      'skipped', v_skipped_count
    ),
    auth.uid()
  );
  
  -- Broadcast realtime update
  PERFORM pg_notify(
    'participants_upload',
    json_build_object(
      'event_id', p_event_id,
      'inserted', v_inserted_count,
      'updated', v_updated_count,
      'skipped', v_skipped_count
    )::text
  );
  
  RETURN jsonb_build_object(
    'status', 'ok',
    'inserted', v_inserted_count,
    'updated', v_updated_count,
    'skipped', v_skipped_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'reason', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_staged_participants(uuid, text) TO authenticated;

-- 2-4. clear_event_participants: Delete all participants for event (MASTER only)
CREATE OR REPLACE FUNCTION public.clear_event_participants(
  p_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count int;
  v_agency_id uuid;
BEGIN
  -- Check MASTER permission
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;
  
  -- Get agency_id
  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;
  
  -- Delete all participants
  DELETE FROM public.participants WHERE event_id = p_event_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Log the operation
  INSERT INTO public.participants_log (
    event_id,
    agency_id,
    action,
    metadata,
    created_by
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'full_delete',
    jsonb_build_object(
      'deleted_count', v_deleted_count,
      'timestamp', now()
    ),
    auth.uid()
  );
  
  RETURN jsonb_build_object(
    'status', 'ok',
    'deleted', v_deleted_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'reason', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_event_participants(uuid) TO authenticated;