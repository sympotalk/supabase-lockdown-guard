-- Phase 73-L.2: Excel Upload Layer Rebuild + Replace Mode
-- Drop old function if exists
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean);

-- Create new RPC function with Replace mode support
CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_data jsonb,
  p_replace boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_deleted int := 0;
  v_agency_id uuid;
  v_session_id text;
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id FROM events WHERE id = p_event_id;
  
  -- Generate session ID for logging
  v_session_id := 'excel_' || extract(epoch from now())::text;

  -- If Replace mode, delete all existing participants for this event
  IF p_replace THEN
    DELETE FROM participants WHERE event_id = p_event_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  -- Insert new participants
  INSERT INTO participants (
    event_id,
    name,
    organization,
    phone,
    sfe_hospital_code,
    sfe_customer_code,
    memo,
    manager_info,
    role_badge,
    composition,
    room_type,
    room_credit,
    status,
    assigned_at,
    is_active
  )
  SELECT
    p_event_id,
    trim(d->>'고객 성명'),
    trim(coalesce(d->>'거래처명', '')),
    regexp_replace(coalesce(d->>'고객 연락처', ''), '[^0-9]', '', 'g'),
    NULLIF(trim(coalesce(d->>'SFE 거래처코드', '')), '-'),
    NULLIF(trim(coalesce(d->>'SFE 고객코드', '')), '-'),
    trim(coalesce(d->>'메모', '')),
    jsonb_build_object(
      'team', trim(coalesce(d->>'팀명', '')),
      'name', trim(coalesce(d->>'담당자 성명', '')),
      'phone', regexp_replace(coalesce(d->>'담당자 연락처', ''), '[^0-9]', '', 'g'),
      'emp_id', trim(coalesce(d->>'담당자 사번', ''))
    ),
    '참석자',
    '{"adult": 1, "child": 0, "infant": 0}'::jsonb,
    '배정대기',
    0,
    '대기',
    now(),
    CASE 
      WHEN lower(trim(coalesce(d->>'삭제유무', ''))) IN ('삭제', 'y', 'true', '1') THEN false
      ELSE true
    END
  FROM jsonb_array_elements(p_data) as d
  WHERE trim(d->>'고객 성명') IS NOT NULL 
    AND trim(d->>'고객 성명') != ''
    AND regexp_replace(coalesce(d->>'고객 연락처', ''), '[^0-9]', '', 'g') != ''
  ON CONFLICT (event_id, phone)
  DO UPDATE SET
    name = EXCLUDED.name,
    organization = EXCLUDED.organization,
    sfe_hospital_code = EXCLUDED.sfe_hospital_code,
    sfe_customer_code = EXCLUDED.sfe_customer_code,
    memo = EXCLUDED.memo,
    manager_info = EXCLUDED.manager_info,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log the upload activity
  IF v_agency_id IS NOT NULL THEN
    INSERT INTO participants_log (
      agency_id,
      event_id,
      action,
      details,
      upload_session_id
    ) VALUES (
      v_agency_id,
      p_event_id,
      CASE WHEN p_replace THEN 'excel_replace' ELSE 'excel_upload' END,
      jsonb_build_object(
        'total_rows', v_count,
        'deleted', v_deleted,
        'mode', CASE WHEN p_replace THEN 'replace' ELSE 'merge' END
      ),
      v_session_id
    );
  END IF;

  -- Notify for real-time updates
  PERFORM pg_notify('participants_upload', json_build_object(
    'event_id', p_event_id,
    'agency_id', v_agency_id,
    'count', v_count,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'merge' END
  )::text);

  -- Return result summary
  RETURN jsonb_build_object(
    'success', true,
    'total', v_count,
    'deleted', v_deleted,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'merge' END,
    'event_id', p_event_id,
    'agency_id', v_agency_id,
    'session_id', v_session_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean) TO authenticated;