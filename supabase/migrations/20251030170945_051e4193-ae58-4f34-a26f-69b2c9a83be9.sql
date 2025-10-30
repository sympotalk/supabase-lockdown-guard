-- Phase 73-L.7.31-H: Fix RPC function to include missing fields
-- Drop and recreate the function with all required fields

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
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_agency_id UUID;
  v_session_id TEXT := gen_random_uuid()::text;
  v_record jsonb;
  v_error_detail TEXT;
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- Replace mode: delete existing participants
  IF p_replace THEN
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- Process each record in the JSON array
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      INSERT INTO public.participants (
        event_id,
        agency_id,
        name,
        phone,
        email,
        organization,
        request_note,
        sfe_company_code,
        sfe_customer_code,
        manager_info,
        role_badge,
        call_status,
        is_active
      ) VALUES (
        p_event_id,
        v_agency_id,
        COALESCE(NULLIF(TRIM(v_record->>'name'), ''), ''),
        COALESCE(NULLIF(TRIM(v_record->>'phone'), ''), ''),
        COALESCE(NULLIF(TRIM(v_record->>'email'), ''), NULL),
        COALESCE(NULLIF(TRIM(v_record->>'organization'), ''), NULL),
        COALESCE(NULLIF(TRIM(v_record->>'request_note'), ''), NULL),
        COALESCE(NULLIF(TRIM(v_record->>'sfe_company_code'), ''), NULL),
        COALESCE(NULLIF(TRIM(v_record->>'sfe_customer_code'), ''), NULL),
        CASE
          WHEN v_record ? 'manager_info' THEN v_record->'manager_info'
          ELSE NULL
        END,
        COALESCE(NULLIF(TRIM(v_record->>'role_badge'), ''), '참석자'),
        '대기중',
        TRUE
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET 
        organization = EXCLUDED.organization,
        email = EXCLUDED.email,
        request_note = EXCLUDED.request_note,
        sfe_company_code = EXCLUDED.sfe_company_code,
        sfe_customer_code = EXCLUDED.sfe_customer_code,
        manager_info = EXCLUDED.manager_info,
        role_badge = EXCLUDED.role_badge,
        updated_at = NOW();

      v_inserted := v_inserted + 1;

    EXCEPTION
      WHEN OTHERS THEN
        v_skipped := v_skipped + 1;
        v_error_detail := SQLERRM;
        
        INSERT INTO public.logs (
          event_id, actor_role, action, target_table, payload, created_by
        ) VALUES (
          p_event_id, 'system', 'participant_import_error', 'participants',
          jsonb_build_object('session_id', v_session_id, 'error', v_error_detail, 'record', v_record),
          auth.uid()
        );
        CONTINUE;
    END;
  END LOOP;

  -- Log success
  INSERT INTO public.logs (
    event_id, actor_role, action, target_table, payload, created_by
  ) VALUES (
    p_event_id, 'system', 'participant_import_success', 'participants',
    jsonb_build_object(
      'session_id', v_session_id, 
      'inserted', v_inserted, 
      'updated', v_updated, 
      'skipped', v_skipped,
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
    ),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'session_id', v_session_id,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean)
TO authenticated, service_role;

COMMENT ON FUNCTION public.ai_participant_import_from_excel IS 'Import participants from Excel with all fields including request_note, sfe_company_code, sfe_customer_code, and manager_info';