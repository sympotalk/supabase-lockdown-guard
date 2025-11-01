-- [Phase 78-B.8] Update validation RPC to support warning status

CREATE OR REPLACE FUNCTION public.validate_staged_participants(
  p_event_id uuid,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_count int := 0;
  v_error_count int := 0;
  v_warn_count int := 0;
  v_row record;
  v_normalized_phone text;
  v_duplicate_check int;
  v_validation_msg text;
  v_status text;
BEGIN
  -- Process each pending row
  FOR v_row IN 
    SELECT * FROM participants_staging 
    WHERE event_id = p_event_id 
    AND upload_session_id = p_session_id 
    AND validation_status = 'pending'
  LOOP
    v_validation_msg := NULL;
    v_status := 'valid';
    
    -- Required fields check
    IF v_row.name IS NULL OR trim(v_row.name) = '' THEN
      UPDATE participants_staging 
      SET validation_status = 'error', 
          validation_message = '이름이 비어 있습니다.'
      WHERE id = v_row.id;
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;
    
    IF v_row.organization IS NULL OR trim(v_row.organization) = '' THEN
      UPDATE participants_staging 
      SET validation_status = 'error', 
          validation_message = '소속이 비어 있습니다.'
      WHERE id = v_row.id;
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;
    
    -- Length check
    IF length(v_row.name) > 100 THEN
      UPDATE participants_staging 
      SET validation_status = 'error', 
          validation_message = '이름이 너무 깁니다 (최대 100자).'
      WHERE id = v_row.id;
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;
    
    IF length(v_row.organization) > 100 THEN
      UPDATE participants_staging 
      SET validation_status = 'error', 
          validation_message = '소속이 너무 깁니다 (최대 100자).'
      WHERE id = v_row.id;
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;
    
    -- Phone normalization and validation
    IF v_row.phone IS NOT NULL AND trim(v_row.phone) != '' THEN
      v_normalized_phone := regexp_replace(trim(v_row.phone), '[^0-9-]', '', 'g');
      
      IF v_normalized_phone != trim(v_row.phone) THEN
        UPDATE participants_staging 
        SET validation_status = 'error', 
            validation_message = '연락처 형식이 올바르지 않습니다. 숫자/하이픈만 허용합니다.'
        WHERE id = v_row.id;
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      -- Check for duplicates within session
      SELECT COUNT(*) INTO v_duplicate_check
      FROM participants_staging
      WHERE event_id = p_event_id
      AND upload_session_id = p_session_id
      AND lower(trim(name)) = lower(trim(v_row.name))
      AND phone = v_row.phone
      AND id < v_row.id;
      
      IF v_duplicate_check > 0 THEN
        v_status := 'warning';
        v_validation_msg := format('%s / %s이 중복됩니다. 기존 데이터가 업데이트됩니다.', v_row.name, v_row.phone);
        v_warn_count := v_warn_count + 1;
      END IF;
    END IF;
    
    -- Mark as valid or warning
    UPDATE participants_staging 
    SET validation_status = v_status, 
        validation_message = v_validation_msg
    WHERE id = v_row.id;
    
    IF v_status = 'valid' THEN
      v_valid_count := v_valid_count + 1;
    END IF;
  END LOOP;
  
  -- Audit log
  INSERT INTO participants_log (event_id, action, metadata, created_by)
  VALUES (
    p_event_id,
    'excel_validation',
    jsonb_build_object(
      'session_id', p_session_id,
      'valid_count', v_valid_count,
      'error_count', v_error_count,
      'warn_count', v_warn_count,
      'user_id', auth.uid()
    ),
    auth.uid()
  );
  
  RETURN jsonb_build_object(
    'status', 'ok',
    'summary', jsonb_build_object(
      'valid', v_valid_count,
      'error', v_error_count,
      'warn', v_warn_count
    )
  );
END;
$$;