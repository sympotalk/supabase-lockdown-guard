-- Phase 77-RPC-SIGNATURE-SYNC.v7
-- Restore original RPC signature + fix FK violation

-- 1. Update trigger to skip lookup for bulk operations
CREATE OR REPLACE FUNCTION public.set_participants_log_context()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip trigger for bulk operations (no participant_id)
  IF NEW.participant_id IS NULL THEN
    -- Bulk operation: event_id and agency_id must be explicitly set
    IF NEW.event_id IS NULL OR NEW.agency_id IS NULL THEN
      RAISE EXCEPTION 'Bulk log operations must provide explicit event_id and agency_id';
    END IF;
    RETURN NEW;
  END IF;
  
  -- Individual participant operation: lookup if not provided
  IF NEW.event_id IS NULL OR NEW.agency_id IS NULL THEN
    SELECT event_id, agency_id INTO NEW.event_id, NEW.agency_id
    FROM public.participants
    WHERE id = NEW.participant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Restore original RPC signature (matching frontend)
CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_data jsonb,
  p_replace boolean DEFAULT false
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
  v_updated INTEGER := 0;
  v_deleted INTEGER := 0;
  v_skipped INTEGER := 0;
  v_agency_id UUID;
  v_exists BOOLEAN;
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

  -- Replace mode: delete all participants for this event
  IF p_replace = true THEN
    DELETE FROM public.participants WHERE event_id = p_event_id AND is_active = true;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    -- Log deletion with explicit fields (trigger will skip lookup)
    INSERT INTO public.participants_log(
      event_id, 
      agency_id,
      participant_id,
      action, 
      metadata
    )
    VALUES (
      p_event_id,
      v_agency_id,
      NULL,
      'bulk_replace_delete',
      jsonb_build_object(
        'deleted_participants', v_deleted,
        'timestamp', now()
      )
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
    v_manager_info := jsonb_strip_nulls(jsonb_build_object(
      'team', NULLIF(TRIM(v_record->>'팀명'), ''),
      'name', NULLIF(TRIM(v_record->>'담당자 성명'), ''),
      'phone', NULLIF(TRIM(v_record->>'담당자 연락처'), ''),
      'emp_id', NULLIF(TRIM(v_record->>'담당자 사번'), ''),
      'sfe_hospital_code', NULLIF(NULLIF(TRIM(v_record->>'SFE 거래처코드'), ''), '-'),
      'sfe_customer_code', NULLIF(NULLIF(TRIM(v_record->>'SFE 고객코드'), ''), '-')
    ));

    -- Skip rows without required fields
    IF v_name = '' OR v_phone = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Check if exists
    SELECT EXISTS(
      SELECT 1 FROM public.participants
      WHERE event_id = p_event_id AND phone = v_phone
    ) INTO v_exists;

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
      created_at,
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
      NOW(),
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

    IF v_exists THEN
      v_updated := v_updated + 1;
    ELSE
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -- Log summary with explicit fields
  INSERT INTO public.participants_log(
    event_id,
    agency_id,
    participant_id,
    action,
    metadata
  )
  VALUES (
    p_event_id,
    v_agency_id,
    NULL,
    'bulk_upload',
    jsonb_build_object(
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'update' END,
      'inserted', v_inserted,
      'updated', v_updated,
      'deleted', v_deleted,
      'skipped', v_skipped
    )
  );

  -- Real-time notification
  PERFORM pg_notify(
    'participants_upload',
    json_build_object(
      'event_id', p_event_id,
      'inserted', v_inserted,
      'updated', v_updated,
      'skipped', v_skipped
    )::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'total', v_inserted + v_updated,
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted,
    'skipped', v_skipped,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'update' END,
    'event_id', p_event_id,
    'agency_id', v_agency_id,
    'session_id', 'excel_' || extract(epoch from now())::bigint::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean)
  TO authenticated, service_role;