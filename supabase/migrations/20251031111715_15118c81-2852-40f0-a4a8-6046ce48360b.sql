-- Phase 77-MEMO-UPLOAD-FIX: Add memo column to INSERT/UPDATE in ai_participant_import_from_excel
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
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_deleted INTEGER := 0;
  v_errors INTEGER := 0;
  v_agency_id UUID;
  v_session_id TEXT;
  v_record jsonb;
  v_name TEXT;
  v_phone TEXT;
  v_participant_id UUID;
  v_old_count INTEGER;
BEGIN
  v_session_id := COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text);
  
  -- Get agency_id
  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND: event_id % not found', p_event_id;
  END IF;

  -- Upload start log
  INSERT INTO public.participants_log (
    event_id, agency_id, participant_id, action,
    context_json, session_id, edited_by, created_at
  ) VALUES (
    p_event_id, v_agency_id, NULL, 'upload_start',
    jsonb_build_object('mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END, 'total_rows', jsonb_array_length(p_data)),
    v_session_id, auth.uid(), NOW()
  );

  -- Replace mode: delete existing data
  IF p_replace THEN
    SELECT COUNT(*) INTO v_old_count
    FROM public.participants
    WHERE event_id = p_event_id AND is_active = true;

    INSERT INTO public.participants_log (
      event_id, agency_id, participant_id, action,
      context_json, session_id, edited_by, created_at
    )
    SELECT
      p_event_id, v_agency_id, p.id, 'delete',
      jsonb_build_object('name', p.name, 'phone', p.phone, 'reason', 'replace_mode'),
      v_session_id, auth.uid(), NOW()
    FROM public.participants p
    WHERE p.event_id = p_event_id AND p.is_active = true;

    UPDATE public.participants
    SET is_active = false, updated_at = NOW()
    WHERE event_id = p_event_id AND is_active = true;

    v_deleted := v_old_count;
  END IF;

  -- Process each row
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      v_name := COALESCE(NULLIF(TRIM(v_record->>'name'), ''), NULLIF(TRIM(v_record->>'고객 성명'), ''));
      v_phone := COALESCE(NULLIF(TRIM(v_record->>'phone'), ''), NULLIF(TRIM(v_record->>'고객 연락처'), ''));

      IF v_name IS NULL OR v_phone IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- INSERT with memo column
      INSERT INTO public.participants (
        event_id, agency_id, name, phone, email, organization,
        position, department, address, 
        request_note,
        memo,  -- ✅ Added memo column
        sfe_company_code, sfe_customer_code, 
        manager_info, manager_email, role_badge, 
        call_status, is_active
      ) VALUES (
        p_event_id,
        v_agency_id,
        v_name,
        v_phone,
        NULLIF(TRIM(v_record->>'email'), ''),
        NULLIF(TRIM(v_record->>'organization'), ''),
        NULLIF(TRIM(v_record->>'position'), ''),
        NULLIF(TRIM(v_record->>'department'), ''),
        NULLIF(TRIM(v_record->>'address'), ''),
        NULLIF(TRIM(v_record->>'request_note'), ''),
        NULLIF(TRIM(v_record->>'memo'), ''),  -- ✅ Added memo value
        NULLIF(TRIM(v_record->>'sfe_company_code'), ''),
        NULLIF(TRIM(v_record->>'sfe_customer_code'), ''),
        CASE
          WHEN v_record ? 'manager_info' THEN v_record->'manager_info'
          ELSE jsonb_build_object(
            'team', COALESCE(NULLIF(TRIM(v_record->>'manager_team'), ''), ''),
            'name', COALESCE(NULLIF(TRIM(v_record->>'manager_name'), ''), ''),
            'phone', COALESCE(NULLIF(TRIM(v_record->>'manager_phone'), ''), ''),
            'emp_id', COALESCE(NULLIF(TRIM(v_record->>'manager_emp_id'), ''), '')
          )
        END,
        NULLIF(TRIM(v_record->>'manager_email'), ''),
        COALESCE(NULLIF(TRIM(v_record->>'role_badge'), ''), '참석자'),
        '대기중',
        TRUE
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET 
        email = EXCLUDED.email,
        organization = EXCLUDED.organization,
        position = EXCLUDED.position,
        department = EXCLUDED.department,
        address = EXCLUDED.address,
        request_note = EXCLUDED.request_note,
        memo = EXCLUDED.memo,  -- ✅ Added memo to UPDATE
        sfe_company_code = EXCLUDED.sfe_company_code,
        sfe_customer_code = EXCLUDED.sfe_customer_code,
        manager_info = EXCLUDED.manager_info,
        manager_email = EXCLUDED.manager_email,
        role_badge = EXCLUDED.role_badge,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id INTO v_participant_id;

      IF FOUND THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  -- Final log
  INSERT INTO public.participants_log (
    event_id, agency_id, participant_id, action,
    context_json, session_id, edited_by, created_at
  ) VALUES (
    p_event_id, v_agency_id, NULL, 'upload_complete',
    jsonb_build_object(
      'inserted', v_inserted,
      'updated', v_updated,
      'skipped', v_skipped,
      'deleted', v_deleted,
      'errors', v_errors,
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
    ),
    v_session_id, auth.uid(), NOW()
  );

  -- Real-time notification
  PERFORM pg_notify('participants_change', jsonb_build_object(
    'event_id', p_event_id,
    'action', 'bulk_upload',
    'count', v_inserted + v_updated
  )::text);

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'deleted', v_deleted,
    'errors', v_errors,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
    'session_id', v_session_id
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text) TO service_role;