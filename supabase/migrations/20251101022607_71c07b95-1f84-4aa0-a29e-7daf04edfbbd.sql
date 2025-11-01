-- [Phase 77-UF-FIX.4] Trigger Session Isolation Patch
-- Purpose: Fix trigger disable/enable in RPC session isolation environment

-- 1. Create helper function for trigger management
CREATE OR REPLACE FUNCTION public.disable_trigger_temporarily(target_table TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sql_disable TEXT;
BEGIN
    sql_disable := format('ALTER TABLE %I DISABLE TRIGGER ALL;', target_table);
    EXECUTE sql_disable;
    RAISE NOTICE '[77-UF-FIX.4] Triggers disabled on table: %', target_table;
END;
$$;

CREATE OR REPLACE FUNCTION public.enable_trigger_after_operation(target_table TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sql_enable TEXT;
BEGIN
    sql_enable := format('ALTER TABLE %I ENABLE TRIGGER ALL;', target_table);
    EXECUTE sql_enable;
    RAISE NOTICE '[77-UF-FIX.4] Triggers re-enabled on table: %', target_table;
END;
$$;

-- 2. Rebuild ai_participant_import_from_excel with session isolation fix
CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id UUID,
  p_data JSONB,
  p_replace BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
  v_inserted INT := 0;
  v_updated INT := 0;
  v_skipped INT := 0;
  v_deleted INT := 0;
  v_backed_up_logs INT := 0;
  v_participant_id UUID;
  v_agency_id UUID;
  v_manager_info JSONB;
  v_name TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_sfe_code TEXT;
  v_fixed_role TEXT;
  v_temp_log_count INT := 0;
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id FROM events WHERE id = p_event_id;
  
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or agency_id is NULL';
  END IF;

  -- Replace mode: Safe transaction handling with session isolation fix
  IF p_replace THEN
    RAISE NOTICE '[77-UF-FIX.4] Replace mode activated - preparing safe transaction';
    
    -- Backup existing logs before deletion
    INSERT INTO participants_log_backup (
      id, participant_id, event_id, agency_id, action, context_json, created_at, deleted_at
    )
    SELECT 
      pl.id, pl.participant_id, pl.event_id, pl.agency_id, pl.action, pl.context_json, pl.created_at, now()
    FROM participants_log pl
    WHERE pl.participant_id IN (
      SELECT id FROM participants WHERE event_id = p_event_id
    );
    
    GET DIAGNOSTICS v_backed_up_logs = ROW_COUNT;
    RAISE NOTICE '[77-UF-FIX.4] Backed up % log entries', v_backed_up_logs;
    
    -- Disable triggers to prevent FK violations during replace
    PERFORM disable_trigger_temporarily('participants_log');
    PERFORM disable_trigger_temporarily('participants');
    
    -- Delete existing participants (logs will have participant_id set to NULL via ON DELETE SET NULL)
    DELETE FROM participants WHERE event_id = p_event_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE '[77-UF-FIX.4] Deleted % existing participants', v_deleted;
    
    -- Log the replace delete operation to temp table
    INSERT INTO participants_log_temp (participant_id, event_id, agency_id, action, context_json)
    VALUES (
      NULL,
      p_event_id,
      v_agency_id,
      'bulk_replace_delete',
      jsonb_build_object(
        'deleted_count', v_deleted,
        'backed_up_logs', v_backed_up_logs,
        'timestamp', now()
      )
    );
    
    -- Re-enable triggers
    PERFORM enable_trigger_after_operation('participants_log');
    PERFORM enable_trigger_after_operation('participants');
  END IF;

  -- Process each row from Excel data
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    -- Extract and normalize data
    v_name := TRIM(COALESCE(v_row->>'name', v_row->>'이름', ''));
    v_phone := TRIM(COALESCE(v_row->>'phone', v_row->>'전화번호', v_row->>'핸드폰', ''));
    v_email := TRIM(COALESCE(v_row->>'email', v_row->>'이메일', ''));
    v_sfe_code := NULLIF(TRIM(COALESCE(v_row->>'sfe_code', v_row->>'SFE코드', '')), '-');
    v_fixed_role := COALESCE(NULLIF(TRIM(COALESCE(v_row->>'fixed_role', v_row->>'역할', '')), ''), '참석자');
    
    -- Normalize role
    IF v_fixed_role NOT IN ('참석자', '좌장', '연자') THEN
      v_fixed_role := '참석자';
    END IF;
    
    -- Build manager_info
    v_manager_info := jsonb_build_object(
      'manager_name', TRIM(COALESCE(v_row->>'manager_name', v_row->>'담당자명', '')),
      'manager_phone', TRIM(COALESCE(v_row->>'manager_phone', v_row->>'담당자연락처', '')),
      'manager_email', TRIM(COALESCE(v_row->>'manager_email', v_row->>'담당자이메일', ''))
    );
    
    -- Skip if name or phone is empty
    IF v_name = '' OR v_phone = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Insert or update participant
    INSERT INTO participants (
      event_id, agency_id, name, phone, email, sfe_code, fixed_role,
      organization, manager_info, is_active
    )
    VALUES (
      p_event_id, v_agency_id, v_name, v_phone, v_email, v_sfe_code, v_fixed_role,
      TRIM(COALESCE(v_row->>'organization', v_row->>'소속', '')),
      v_manager_info,
      true
    )
    ON CONFLICT (event_id, name, phone)
    DO UPDATE SET
      email = EXCLUDED.email,
      sfe_code = EXCLUDED.sfe_code,
      fixed_role = EXCLUDED.fixed_role,
      organization = EXCLUDED.organization,
      manager_info = COALESCE(participants.manager_info, '{}'::jsonb) || EXCLUDED.manager_info,
      is_active = true,
      updated_at = now()
    RETURNING id INTO v_participant_id;
    
    IF FOUND THEN
      IF TG_OP = 'INSERT' THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;
      
      -- Log to temp table during replace mode, regular log otherwise
      IF p_replace THEN
        INSERT INTO participants_log_temp (participant_id, event_id, agency_id, action, context_json)
        VALUES (
          v_participant_id,
          p_event_id,
          v_agency_id,
          'bulk_upload',
          jsonb_build_object('mode', 'replace', 'name', v_name)
        );
        v_temp_log_count := v_temp_log_count + 1;
      ELSE
        INSERT INTO participants_log (participant_id, event_id, agency_id, action, context_json)
        VALUES (
          v_participant_id,
          p_event_id,
          v_agency_id,
          'bulk_upload',
          jsonb_build_object('mode', 'append', 'name', v_name)
        );
      END IF;
    END IF;
  END LOOP;
  
  -- Move temp logs to actual log table if replace mode
  IF p_replace AND v_temp_log_count > 0 THEN
    INSERT INTO participants_log (participant_id, event_id, agency_id, action, context_json, created_at)
    SELECT participant_id, event_id, agency_id, action, context_json, created_at
    FROM participants_log_temp
    WHERE event_id = p_event_id;
    
    DELETE FROM participants_log_temp WHERE event_id = p_event_id;
    RAISE NOTICE '[77-UF-FIX.4] Moved % temp logs to permanent log table', v_temp_log_count;
  END IF;
  
  -- Send notification
  IF p_replace THEN
    PERFORM pg_notify(
      'participants_replace_done',
      jsonb_build_object(
        'event_id', p_event_id,
        'deleted', v_deleted,
        'inserted', v_inserted,
        'backed_up_logs', v_backed_up_logs
      )::text
    );
  END IF;

  RAISE NOTICE '[77-UF-FIX.4] Operation complete - inserted: %, updated: %, skipped: %, deleted: %', 
    v_inserted, v_updated, v_skipped, v_deleted;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'deleted', v_deleted,
    'backed_up_logs', v_backed_up_logs
  );
END;
$$;

-- 3. Strengthen trigger protection with additional checks
CREATE OR REPLACE FUNCTION public.set_participants_log_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_agency_id UUID;
BEGIN
  -- [77-UF-FIX.4] Protection: Skip if participant_id is NULL or participant doesn't exist
  IF NEW.participant_id IS NULL THEN
    RAISE NOTICE '[77-UF-FIX.4] Skipping log context set - participant_id is NULL';
    RETURN NEW;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM participants WHERE id = NEW.participant_id) THEN
    RAISE NOTICE '[77-UF-FIX.4] Skipping log context set - participant does not exist: %', NEW.participant_id;
    RETURN NEW;
  END IF;
  
  -- Get event_id and agency_id from participant
  SELECT event_id, agency_id INTO v_event_id, v_agency_id
  FROM participants
  WHERE id = NEW.participant_id;
  
  -- Set context if found
  IF v_event_id IS NOT NULL THEN
    NEW.event_id := v_event_id;
    NEW.agency_id := v_agency_id;
  END IF;
  
  RETURN NEW;
END;
$$;