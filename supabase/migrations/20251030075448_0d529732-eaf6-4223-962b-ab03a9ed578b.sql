-- Phase 73-L.7.5: Participant Import Log Schema Fix
-- Fix participants_log INSERT to match actual schema
-- Resolve variable naming conflicts
-- Ensure hard delete in Replace mode

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
  -- 1. Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- 2. HARD DELETE MODE for Replace
  IF p_replace = true THEN
    DELETE FROM public.rooming_participants WHERE event_id = p_event_id;
    DELETE FROM public.participants_log WHERE participant_id IN (
      SELECT id FROM public.participants WHERE event_id = p_event_id
    );
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- 3. Iterate records
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      INSERT INTO public.participants(
        event_id, agency_id, name, phone, email, organization,
        position, department, address, manager_info,
        role_badge, tm_status, call_status, is_active
      ) VALUES (
        p_event_id, v_agency_id,
        v_record->>'name', v_record->>'phone', v_record->>'email',
        v_record->>'organization', v_record->>'position',
        v_record->>'department', v_record->>'address',
        CASE 
          WHEN v_record ? 'manager_name' OR v_record ? 'manager_phone' OR v_record ? 'manager_email'
          THEN jsonb_build_object(
            'name', COALESCE(v_record->>'manager_name', ''),
            'phone', COALESCE(v_record->>'manager_phone', ''),
            'email', COALESCE(v_record->>'manager_email', '')
          )
          ELSE NULL
        END,
        '참석자', '대기중', '대기중', true
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET organization = EXCLUDED.organization,
          phone = EXCLUDED.phone,
          updated_at = NOW();

      IF FOUND THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;

      -- 4. Insert log (actual schema match - fixed column names)
      INSERT INTO public.participants_log(
        participant_id,
        action,
        metadata,
        upload_session_id,
        edited_by,
        edited_at
      )
      SELECT 
        part.id,
        CASE WHEN part.created_at >= NOW() - INTERVAL '1 second' 
             THEN 'insert' ELSE 'update' END,
        jsonb_build_object(
          'session_id', v_session_id, 
          'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
        ),
        v_session_id,
        auth.uid(),
        NOW()
      FROM public.participants part
      WHERE part.event_id = p_event_id
        AND part.name = v_record->>'name'
        AND part.phone = v_record->>'phone'
      LIMIT 1;

    EXCEPTION
      WHEN OTHERS THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
    END;
  END LOOP;

  -- 5. Notify Realtime
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

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean)
TO authenticated, service_role;