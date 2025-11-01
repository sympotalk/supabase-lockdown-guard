-- [Phase 78-B.8] Add skip_ids parameter to commit RPC

CREATE OR REPLACE FUNCTION public.commit_staged_participants(
  p_event_id uuid,
  p_session_id text,
  p_skip_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_row record;
  v_match_hash text;
  v_existing_id uuid;
BEGIN
  -- Process valid rows (excluding skip_ids)
  FOR v_row IN 
    SELECT * FROM participants_staging 
    WHERE event_id = p_event_id 
    AND upload_session_id = p_session_id 
    AND validation_status = 'valid'
    AND id != ALL(p_skip_ids)
  LOOP
    -- Generate match hash
    v_match_hash := md5(lower(trim(v_row.name)) || '|' || COALESCE(regexp_replace(v_row.phone, '[^0-9-]', '', 'g'), ''));
    
    -- Check for existing participant
    SELECT id INTO v_existing_id
    FROM participants
    WHERE event_id = p_event_id
    AND match_hash = v_match_hash;
    
    IF v_existing_id IS NOT NULL THEN
      -- UPDATE existing
      UPDATE participants
      SET
        name = COALESCE(NULLIF(trim(v_row.name), ''), name),
        organization = COALESCE(NULLIF(trim(v_row.organization), ''), organization),
        phone = COALESCE(NULLIF(trim(v_row.phone), ''), phone),
        request_memo = COALESCE(NULLIF(trim(v_row.request_memo), ''), request_memo),
        manager_info = COALESCE(v_row.manager_info, manager_info),
        sfe_info = COALESCE(v_row.sfe_info, sfe_info),
        updated_at = now()
      WHERE id = v_existing_id;
      
      v_updated := v_updated + 1;
    ELSE
      -- INSERT new
      INSERT INTO participants (
        event_id,
        name,
        organization,
        phone,
        request_memo,
        manager_info,
        sfe_info,
        match_hash
      ) VALUES (
        p_event_id,
        trim(v_row.name),
        trim(v_row.organization),
        trim(v_row.phone),
        trim(v_row.request_memo),
        v_row.manager_info,
        v_row.sfe_info,
        v_match_hash
      );
      
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  
  -- Count skipped rows
  SELECT COUNT(*) INTO v_skipped
  FROM participants_staging
  WHERE event_id = p_event_id
  AND upload_session_id = p_session_id
  AND validation_status = 'valid'
  AND id = ANY(p_skip_ids);
  
  -- Delete processed staging data
  DELETE FROM participants_staging
  WHERE event_id = p_event_id
  AND upload_session_id = p_session_id;
  
  -- Audit log
  INSERT INTO participants_log (event_id, action, metadata, created_by)
  VALUES (
    p_event_id,
    'bulk_import',
    jsonb_build_object(
      'session_id', p_session_id,
      'inserted', v_inserted,
      'updated', v_updated,
      'skipped', v_skipped,
      'skip_ids_count', array_length(p_skip_ids, 1),
      'user_id', auth.uid()
    ),
    auth.uid()
  );
  
  RETURN jsonb_build_object(
    'status', 'ok',
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped
  );
END;
$$;