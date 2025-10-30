-- Phase 73-L.7.4: Participant Replace Mode Hard Reset

DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean) CASCADE;

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
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- HARD DELETE MODE: Replace 모드 시 완전 삭제
  IF p_replace = true THEN
    -- Delete related rooming records
    DELETE FROM public.rooming_participants
    WHERE event_id = p_event_id;
    
    -- Delete related log records
    DELETE FROM public.participants_log
    WHERE event_id = p_event_id;
    
    -- Delete participants (hard delete)
    DELETE FROM public.participants
    WHERE event_id = p_event_id;
  END IF;

  -- Process each record
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      -- Insert with forced defaults
      INSERT INTO public.participants(
        event_id,
        agency_id,
        name,
        phone,
        email,
        organization,
        position,
        department,
        address,
        manager_info,
        role_badge,
        tm_status,
        call_status,
        is_active
      ) VALUES (
        p_event_id,
        v_agency_id,
        v_record->>'name',
        v_record->>'phone',
        v_record->>'email',
        v_record->>'organization',
        v_record->>'position',
        v_record->>'department',
        v_record->>'address',
        CASE 
          WHEN v_record ? 'manager_name' OR v_record ? 'manager_phone' OR v_record ? 'manager_email'
          THEN jsonb_build_object(
            'name', COALESCE(v_record->>'manager_name', ''),
            'phone', COALESCE(v_record->>'manager_phone', ''),
            'email', COALESCE(v_record->>'manager_email', '')
          )
          ELSE NULL
        END,
        '참석자',  -- 강제 기본값
        '대기중',  -- 강제 기본값
        '대기중',  -- 강제 기본값
        true
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET 
        organization = EXCLUDED.organization,
        phone = EXCLUDED.phone,
        updated_at = NOW();

      IF FOUND THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;

      -- Log action
      INSERT INTO public.participants_log(
        event_id,
        agency_id,
        participant_id,
        action,
        metadata,
        upload_session_id,
        created_by
      )
      SELECT 
        p_event_id,
        v_agency_id,
        p.id,
        CASE WHEN p.created_at >= NOW() - INTERVAL '1 second' THEN 'insert' ELSE 'update' END,
        jsonb_build_object('session_id', v_session_id, 'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END),
        v_session_id,
        auth.uid()
      FROM public.participants p
      WHERE p.event_id = p_event_id 
        AND p.name = v_record->>'name' 
        AND p.phone = v_record->>'phone'
      LIMIT 1;

    EXCEPTION
      WHEN OTHERS THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
    END;
  END LOOP;

  -- Real-time notification
  PERFORM pg_notify(
    'participant_upload',
    jsonb_build_object(
      'event_id', p_event_id,
      'session_id', v_session_id,
      'inserted', v_inserted,
      'updated', v_updated,
      'skipped', v_skipped,
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
    )::text
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean) TO service_role;