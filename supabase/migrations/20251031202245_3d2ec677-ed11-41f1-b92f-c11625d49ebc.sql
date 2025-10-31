-- Phase 77-RPC-REPLACE-FIX.v2
-- Purpose: Add replace mode support to force delete all participants before upload

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
  v_updated INTEGER := 0;
  v_deleted INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  -- Replace mode: Delete all existing participants for this event
  IF LOWER(p_mode) = 'replace' THEN
    DELETE FROM public.participants WHERE event_id = p_event_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    INSERT INTO public.participants_log(event_id, action, context_json)
    VALUES (
      p_event_id,
      'bulk_replace_delete',
      jsonb_build_object('deleted_rows', v_deleted, 'timestamp', now())
    );
  END IF;

  -- Process new data (same for both append and replace)
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

    INSERT INTO public.participants (
      event_id, name, phone, organization,
      request_note, memo, position, manager_info, updated_at
    )
    VALUES (
      p_event_id, v_name, v_phone, v_company,
      v_request_note, v_memo, v_position, v_manager_info, NOW()
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

  -- Log summary
  INSERT INTO public.participants_log(event_id, action, context_json)
  VALUES (
    p_event_id,
    'bulk_upload_summary',
    jsonb_build_object(
      'inserted', v_inserted,
      'updated', v_updated,
      'deleted', v_deleted,
      'skipped', v_skipped,
      'mode', p_mode,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted,
    'skipped', v_skipped,
    'mode', p_mode
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, text)
  TO authenticated, service_role;