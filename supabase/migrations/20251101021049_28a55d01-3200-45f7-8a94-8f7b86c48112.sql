-- Phase 77-UF-FIX.2: Replace Mode Log Separation and FK Protection
-- Safer approach: Use ON DELETE SET NULL and backup table

-- 1. Create backup table for deleted participant logs
CREATE TABLE IF NOT EXISTS public.participants_log_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_log_id UUID,
  participant_id UUID,
  event_id UUID,
  agency_id UUID,
  action TEXT,
  context_json JSONB,
  upload_session_id TEXT,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  backup_reason TEXT
);

-- 2. Modify FK constraint to use ON DELETE SET NULL (safer than dropping)
ALTER TABLE public.participants_log 
  DROP CONSTRAINT IF EXISTS participants_log_participant_id_fkey;

ALTER TABLE public.participants_log
  ADD CONSTRAINT participants_log_participant_id_fkey
  FOREIGN KEY (participant_id)
  REFERENCES public.participants(id)
  ON DELETE SET NULL;  -- Safer: sets to NULL instead of blocking deletion

-- 3. Update RPC function to backup logs before deletion
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
  v_manager_info JSONB;
  v_inserted INTEGER := 0;
  v_deleted INTEGER := 0;
  v_skipped INTEGER := 0;
  v_agency_id UUID;
  v_backed_up INTEGER := 0;
BEGIN
  -- Validate event_id
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'event_id parameter missing or undefined';
  END IF;

  -- Lookup agency_id from events table
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or has no agency_id: %', p_event_id;
  END IF;

  -- Replace mode: backup logs and delete participants
  IF p_replace = true THEN
    -- Backup existing logs for participants about to be deleted
    INSERT INTO public.participants_log_backup (
      original_log_id,
      participant_id,
      event_id,
      agency_id,
      action,
      context_json,
      upload_session_id,
      created_at,
      backup_reason
    )
    SELECT 
      pl.id,
      pl.participant_id,
      pl.event_id,
      pl.agency_id,
      pl.action,
      pl.context_json,
      pl.upload_session_id,
      pl.created_at,
      'replace_mode_deletion'
    FROM public.participants_log pl
    WHERE pl.event_id = p_event_id
      AND pl.participant_id IN (
        SELECT id FROM public.participants WHERE event_id = p_event_id
      );
    
    GET DIAGNOSTICS v_backed_up = ROW_COUNT;

    -- Delete all participants for this event (FK will SET NULL in logs)
    DELETE FROM public.participants WHERE event_id = p_event_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    -- Log deletion with NULL participant_id (bulk operation)
    INSERT INTO public.participants_log(
      event_id, 
      agency_id,
      participant_id,
      action, 
      context_json,
      upload_session_id
    )
    VALUES (
      p_event_id,
      v_agency_id,
      NULL,
      'bulk_replace_delete',
      jsonb_build_object(
        'deleted_participants', v_deleted,
        'backed_up_logs', v_backed_up,
        'timestamp', now()
      ),
      p_session_id
    );
  END IF;

  -- Insert new participants from Excel data
  FOR v_record IN
    SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    v_name := COALESCE(TRIM(v_record->>'고객 성명'), TRIM(v_record->>'성명'), TRIM(v_record->>'이름'), '');
    v_phone := COALESCE(TRIM(v_record->>'고객 연락처'), TRIM(v_record->>'연락처'), TRIM(v_record->>'전화번호'), '');
    v_company := COALESCE(TRIM(v_record->>'거래처명'), TRIM(v_record->>'소속'), '');
    v_request_note := COALESCE(TRIM(v_record->>'요청사항'), '');
    v_memo := COALESCE(TRIM(v_record->>'메모'), '');
    v_position := COALESCE(TRIM(v_record->>'구분'), '');
    
    -- Build manager_info from multiple fields
    v_manager_info := jsonb_build_object(
      'team', NULLIF(TRIM(v_record->>'팀명'), ''),
      'name', NULLIF(TRIM(v_record->>'담당자 성명'), ''),
      'phone', NULLIF(TRIM(v_record->>'담당자 연락처'), ''),
      'emp_id', NULLIF(TRIM(v_record->>'담당자 사번'), ''),
      'sfe_hospital_code', NULLIF(NULLIF(TRIM(v_record->>'SFE 거래처코드'), ''), '-'),
      'sfe_customer_code', NULLIF(NULLIF(TRIM(v_record->>'SFE 고객코드'), ''), '-')
    );

    -- Skip rows without required fields
    IF v_name = '' OR v_phone = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Insert or update participant
    INSERT INTO public.participants(
      event_id,
      agency_id,
      name,
      phone,
      organization,
      request_note,
      memo,
      position,
      manager_info,
      role_badge,
      composition,
      is_active,
      updated_at
    )
    VALUES (
      p_event_id,
      v_agency_id,
      v_name,
      v_phone,
      v_company,
      v_request_note,
      v_memo,
      v_position,
      v_manager_info,
      '참석자',
      '{"adult": 1, "child": 0, "infant": 0}'::jsonb,
      true,
      NOW()
    )
    ON CONFLICT (event_id, phone)
    DO UPDATE SET
      name = EXCLUDED.name,
      organization = EXCLUDED.organization,
      request_note = EXCLUDED.request_note,
      memo = EXCLUDED.memo,
      position = EXCLUDED.position,
      manager_info = participants.manager_info || EXCLUDED.manager_info,
      is_active = true,
      updated_at = NOW();

    v_inserted := v_inserted + 1;
  END LOOP;

  -- Log summary with NULL participant_id (bulk operation)
  INSERT INTO public.participants_log(
    event_id,
    agency_id,
    participant_id,
    action,
    context_json,
    upload_session_id
  )
  VALUES (
    p_event_id,
    v_agency_id,
    NULL,
    'bulk_upload',
    jsonb_build_object(
      'inserted', v_inserted,
      'deleted', v_deleted,
      'skipped', v_skipped,
      'backed_up_logs', v_backed_up,
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
      'timestamp', now()
    ),
    p_session_id
  );

  -- Real-time notification
  PERFORM pg_notify(
    'participants_replace_done',
    json_build_object(
      'event_id', p_event_id,
      'inserted', v_inserted,
      'deleted', v_deleted,
      'skipped', v_skipped,
      'backed_up_logs', v_backed_up,
      'session_id', p_session_id
    )::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'total', v_inserted,
    'inserted', v_inserted,
    'deleted', v_deleted,
    'skipped', v_skipped,
    'backed_up_logs', v_backed_up,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
    'event_id', p_event_id,
    'agency_id', v_agency_id,
    'session_id', COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text)
  );
END;
$$;

-- 4. Ensure trigger handles NULL participant_id (already added, but reinforce)
CREATE OR REPLACE FUNCTION public.set_participants_log_context()
RETURNS TRIGGER AS $$
BEGIN
  -- Protection: Skip if participant_id is NULL (bulk operations)
  IF NEW.participant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Protection: Skip if participant doesn't exist (orphaned reference)
  IF NOT EXISTS (SELECT 1 FROM participants WHERE id = NEW.participant_id) THEN
    RETURN NEW;
  END IF;
  
  -- Lookup event_id and agency_id if not provided
  IF NEW.event_id IS NULL OR NEW.agency_id IS NULL THEN
    SELECT event_id, agency_id INTO NEW.event_id, NEW.agency_id
    FROM public.participants
    WHERE id = NEW.participant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text)
  TO authenticated, service_role;

-- Add index for backup table queries
CREATE INDEX IF NOT EXISTS idx_participants_log_backup_event 
  ON public.participants_log_backup(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_log_backup_participant 
  ON public.participants_log_backup(participant_id);