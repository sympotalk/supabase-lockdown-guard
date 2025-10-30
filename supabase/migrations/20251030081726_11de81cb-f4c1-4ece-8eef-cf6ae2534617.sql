-- Phase 73-L.7.8: RPC Schema Alignment Fix
-- Remove position, department, address columns that don't exist in participants table

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
  v_error_detail TEXT;
  v_name TEXT;
  v_phone TEXT;
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- Replace Mode (Hard Delete)
  IF p_replace = true THEN
    DELETE FROM public.rooming_participants WHERE event_id = p_event_id;
    DELETE FROM public.participants_log WHERE participant_id IN (
      SELECT id FROM public.participants WHERE event_id = p_event_id
    );
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- Process Excel rows
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      -- Extract name with fallback
      v_name := COALESCE(
        NULLIF(TRIM((v_record->>'name')::text), ''),
        NULLIF(TRIM((v_record->>'고객 성명')::text), ''),
        NULLIF(TRIM((v_record->>'성명')::text), ''),
        NULLIF(TRIM((v_record->>'이름')::text), ''),
        NULLIF(TRIM((v_record->>'customer_name')::text), ''),
        NULLIF(TRIM((v_record->>'client_name')::text), ''),
        NULL
      );

      -- Extract phone with fallback
      v_phone := COALESCE(
        NULLIF(TRIM((v_record->>'phone')::text), ''),
        NULLIF(TRIM((v_record->>'고객 연락처')::text), ''),
        NULLIF(TRIM((v_record->>'연락처')::text), ''),
        NULLIF(TRIM((v_record->>'전화번호')::text), ''),
        NULLIF(TRIM((v_record->>'customer_phone')::text), ''),
        NULLIF(TRIM((v_record->>'client_phone')::text), ''),
        NULL
      );

      -- Skip if name or phone is missing
      IF v_name IS NULL OR v_phone IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      INSERT INTO public.participants(
        event_id,
        agency_id,
        name,
        phone,
        email,
        organization,
        manager_info,
        role_badge,
        tm_status,
        call_status,
        is_active
      ) VALUES (
        p_event_id,
        v_agency_id,
        v_name,
        v_phone,

        -- Safe email fallback
        COALESCE(
          NULLIF(TRIM((v_record->>'email')::text), ''),
          NULLIF(TRIM((v_record->>'이메일')::text), ''),
          NULL
        ),

        -- Safe organization fallback
        COALESCE(
          NULLIF(TRIM((v_record->>'organization')::text), ''),
          NULLIF(TRIM((v_record->>'거래처명')::text), ''),
          NULLIF(TRIM((v_record->>'소속')::text), ''),
          NULLIF(TRIM((v_record->>'회사')::text), ''),
          NULL
        ),

        -- manager_info with department and position included
        jsonb_strip_nulls(jsonb_build_object(
          'name', COALESCE(
            NULLIF(TRIM((v_record->>'manager_name')::text), ''),
            NULLIF(TRIM((v_record->>'담당자 성명')::text), ''),
            NULL
          ),
          'phone', COALESCE(
            NULLIF(TRIM((v_record->>'manager_phone')::text), ''),
            NULLIF(TRIM((v_record->>'담당자 연락처')::text), ''),
            NULL
          ),
          'email', COALESCE(
            NULLIF(TRIM((v_record->>'manager_email')::text), ''),
            NULLIF(TRIM((v_record->>'담당자 이메일')::text), ''),
            NULL
          ),
          'department', COALESCE(
            NULLIF(TRIM((v_record->>'department')::text), ''),
            NULLIF(TRIM((v_record->>'부서')::text), ''),
            NULLIF(TRIM((v_record->>'팀명')::text), ''),
            NULL
          ),
          'position', COALESCE(
            NULLIF(TRIM((v_record->>'position')::text), ''),
            NULLIF(TRIM((v_record->>'직급')::text), ''),
            NULL
          ),
          'address', COALESCE(
            NULLIF(TRIM((v_record->>'address')::text), ''),
            NULLIF(TRIM((v_record->>'주소')::text), ''),
            NULL
          )
        )),

        '참석자', 
        '대기중', 
        '대기중', 
        true
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET 
        organization = EXCLUDED.organization,
        email = EXCLUDED.email,
        manager_info = EXCLUDED.manager_info,
        updated_at = NOW();

      -- Track insert vs update
      IF FOUND THEN
        v_inserted := v_inserted + 1;
      END IF;

      -- Logging
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
        CASE WHEN part.created_at >= NOW() - INTERVAL '2 seconds'
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
        AND part.name = v_name
        AND part.phone = v_phone
      LIMIT 1;

    EXCEPTION
      WHEN OTHERS THEN
        v_skipped := v_skipped + 1;
        v_error_detail := SQLERRM || ' (SQLSTATE: ' || SQLSTATE || ')';

        -- Log errors safely
        BEGIN
          INSERT INTO public.logs(
            event_id,
            actor_role,
            action,
            target_table,
            payload,
            created_by,
            created_at,
            agency_id
          ) VALUES (
            p_event_id,
            'system',
            'participant_import_error',
            'participants',
            jsonb_build_object(
              'session_id', v_session_id,
              'error', v_error_detail,
              'record_sample', v_record
            ),
            auth.uid(),
            NOW(),
            v_agency_id
          );
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        CONTINUE;
    END;
  END LOOP;

  -- Notify Realtime
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

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean)
TO authenticated, service_role;