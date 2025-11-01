-- Phase 77-RPC-REPLACE-FK-HOTFIX.v6
-- Purpose: Fix FK violation by explicitly setting agency_id and participant_id in logs

CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_payload jsonb,
  p_mode text DEFAULT 'append'
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

  -- Replace mode: delete participants (logs cascade automatically)
  IF LOWER(p_mode) = 'replace' THEN
    DELETE FROM public.participants WHERE event_id = p_event_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    -- Explicitly set all fields to bypass trigger lookup
    INSERT INTO public.participants_log(
      event_id, 
      agency_id,
      participant_id,
      action, 
      context_json
    )
    VALUES (
      p_event_id,
      v_agency_id,
      NULL,
      'bulk_replace_delete',
      jsonb_build_object(
        'deleted_participants', v_deleted,
        'cascade_log_cleanup', TRUE,
        'timestamp', now()
      )
    );
  END IF;

  -- Insert new participants
  FOR v_record IN
    SELECT * FROM jsonb_array_elements(p_payload)
  LOOP
    v_name := COALESCE(TRIM(v_record->>'성명'), TRIM(v_record->>'이름'), '');
    v_phone := COALESCE(TRIM(v_record->>'연락처'), TRIM(v_record->>'전화번호'), '');
    v_company := COALESCE(TRIM(v_record->>'소속'), '');
    v_request_note := COALESCE(TRIM(v_record->>'요청사항'), '');
    v_memo := COALESCE(TRIM(v_record->>'메모'), '');
    v_position := COALESCE(TRIM(v_record->>'구분'), '');
    v_manager_info := jsonb_build_object(
      'team', NULLIF(TRIM(v_record->>'팀명'), ''),
      'manager', NULLIF(TRIM(v_record->>'담당자'), ''),
      'manager_phone', NULLIF(TRIM(v_record->>'담당자연락처'), ''),
      'manager_id', NULLIF(TRIM(v_record->>'사번'), '')
    );

    IF v_name = '' OR v_phone = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

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
      NOW()
    )
    ON CONFLICT (event_id, phone)
    DO UPDATE SET
      name = EXCLUDED.name,
      organization = EXCLUDED.organization,
      request_note = EXCLUDED.request_note,
      memo = EXCLUDED.memo,
      position = EXCLUDED.position,
      manager_info = EXCLUDED.manager_info,
      updated_at = NOW();

    v_inserted := v_inserted + 1;
  END LOOP;

  -- Log summary with explicit fields
  INSERT INTO public.participants_log(
    event_id,
    agency_id,
    participant_id,
    action,
    context_json
  )
  VALUES (
    p_event_id,
    v_agency_id,
    NULL,
    'bulk_upload_summary',
    jsonb_build_object(
      'inserted', v_inserted,
      'deleted', v_deleted,
      'skipped', v_skipped,
      'mode', p_mode,
      'cascade_fk', TRUE,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'deleted', v_deleted,
    'inserted', v_inserted,
    'skipped', v_skipped,
    'cascade_fk', TRUE,
    'mode', p_mode
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, text)
  TO authenticated, service_role;