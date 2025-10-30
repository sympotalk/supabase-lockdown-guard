-- Phase 73-L.7.7: JSONB Null Handling Fix & Safe Insert Enforcement
-- Fixes inserted=0, skipped=146 issue by properly handling JSONB to TEXT casting and NULL values

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
BEGIN
  -- 1. Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- 2. Replace Mode (Hard Delete)
  IF p_replace = true THEN
    DELETE FROM public.rooming_participants WHERE event_id = p_event_id;
    DELETE FROM public.participants_log WHERE participant_id IN (
      SELECT id FROM public.participants WHERE event_id = p_event_id
    );
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- 3. Process Excel rows
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
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

        -- Safe name fallback with proper casting
        COALESCE(
          NULLIF(TRIM((v_record->>'name')::text), ''),
          NULLIF(TRIM((v_record->>'고객 성명')::text), ''),
          NULLIF(TRIM((v_record->>'성명')::text), ''),
          NULLIF(TRIM((v_record->>'이름')::text), ''),
          NULLIF(TRIM((v_record->>'customer_name')::text), ''),
          NULLIF(TRIM((v_record->>'client_name')::text), '')
        ),

        -- Safe phone fallback with proper casting
        COALESCE(
          NULLIF(TRIM((v_record->>'phone')::text), ''),
          NULLIF(TRIM((v_record->>'고객 연락처')::text), ''),
          NULLIF(TRIM((v_record->>'연락처')::text), ''),
          NULLIF(TRIM((v_record->>'전화번호')::text), ''),
          NULLIF(TRIM((v_record->>'customer_phone')::text), ''),
          NULLIF(TRIM((v_record->>'client_phone')::text), '')
        ),

        -- Safe email fallback
        NULLIF(TRIM(COALESCE(
          (v_record->>'email')::text,
          (v_record->>'이메일')::text,
          ''
        )), ''),

        -- Safe organization fallback
        NULLIF(TRIM(COALESCE(
          (v_record->>'organization')::text,
          (v_record->>'거래처명')::text,
          (v_record->>'소속')::text,
          (v_record->>'회사')::text,
          ''
        )), ''),

        -- Safe position fallback
        NULLIF(TRIM(COALESCE(
          (v_record->>'position')::text,
          (v_record->>'직급')::text,
          ''
        )), ''),

        -- Safe department fallback
        NULLIF(TRIM(COALESCE(
          (v_record->>'department')::text,
          (v_record->>'부서')::text,
          (v_record->>'팀명')::text,
          ''
        )), ''),

        -- Safe address fallback
        NULLIF(TRIM(COALESCE(
          (v_record->>'address')::text,
          (v_record->>'주소')::text,
          ''
        )), ''),

        -- Safe manager_info fallback
        CASE 
          WHEN v_record ? 'manager_name' OR v_record ? 'manager_phone' OR v_record ? 'manager_email'
             OR v_record ? '담당자 성명' OR v_record ? '담당자 연락처' OR v_record ? '담당자 이메일'
          THEN jsonb_strip_nulls(jsonb_build_object(
            'name', NULLIF(TRIM(COALESCE(
              (v_record->>'manager_name')::text,
              (v_record->>'담당자 성명')::text,
              ''
            )), ''),
            'phone', NULLIF(TRIM(COALESCE(
              (v_record->>'manager_phone')::text,
              (v_record->>'담당자 연락처')::text,
              ''
            )), ''),
            'email', NULLIF(TRIM(COALESCE(
              (v_record->>'manager_email')::text,
              (v_record->>'담당자 이메일')::text,
              ''
            )), '')
          ))
          ELSE NULL
        END,

        '참석자', '대기중', '대기중', true
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET 
        organization = EXCLUDED.organization,
        email = EXCLUDED.email,
        position = EXCLUDED.position,
        department = EXCLUDED.department,
        address = EXCLUDED.address,
        manager_info = COALESCE(EXCLUDED.manager_info, participants.manager_info),
        is_active = true,
        updated_at = NOW();

      -- Track insert vs update
      IF FOUND THEN
        v_inserted := v_inserted + 1;
      END IF;

      -- 4. Logging
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
        AND part.name = COALESCE(
          NULLIF(TRIM((v_record->>'name')::text), ''),
          NULLIF(TRIM((v_record->>'고객 성명')::text), ''),
          NULLIF(TRIM((v_record->>'성명')::text), '')
        )
        AND part.phone = COALESCE(
          NULLIF(TRIM((v_record->>'phone')::text), ''),
          NULLIF(TRIM((v_record->>'고객 연락처')::text), ''),
          NULLIF(TRIM((v_record->>'연락처')::text), '')
        )
      LIMIT 1;

    EXCEPTION
      WHEN OTHERS THEN
        v_skipped := v_skipped + 1;
        v_error_detail := SQLERRM;

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
              'sqlstate', SQLSTATE,
              'record_sample', v_record
            ),
            auth.uid(),
            NOW(),
            v_agency_id
          );
        EXCEPTION WHEN OTHERS THEN 
          NULL;
        END;
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean)
TO authenticated, service_role;