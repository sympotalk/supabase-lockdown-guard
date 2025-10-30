-- Phase 73-L.7.6: Excel Column Normalization + RPC Fallback + Error Logging
-- Add COALESCE fallbacks for Korean/English column variations
-- Add error logging to existing logs table structure
-- Maintain hard delete in Replace mode

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

  -- 2. HARD DELETE MODE for Replace
  IF p_replace = true THEN
    DELETE FROM public.rooming_participants WHERE event_id = p_event_id;
    DELETE FROM public.participants_log WHERE participant_id IN (
      SELECT id FROM public.participants WHERE event_id = p_event_id
    );
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- 3. Iterate records with enhanced fallback mapping
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      INSERT INTO public.participants(
        event_id, agency_id, name, phone, email, organization,
        position, department, address, manager_info,
        role_badge, tm_status, call_status, is_active
      ) VALUES (
        p_event_id, 
        v_agency_id,
        -- Fallback for name: standard + Korean + English aliases
        COALESCE(
          NULLIF(TRIM(v_record->>'name'), ''),
          NULLIF(TRIM(v_record->>'고객 성명'), ''),
          NULLIF(TRIM(v_record->>'고객성명'), ''),
          NULLIF(TRIM(v_record->>'성명'), ''),
          NULLIF(TRIM(v_record->>'이름'), ''),
          NULLIF(TRIM(v_record->>'customer_name'), ''),
          NULLIF(TRIM(v_record->>'client_name'), ''),
          ''
        ),
        -- Fallback for phone
        COALESCE(
          NULLIF(TRIM(v_record->>'phone'), ''),
          NULLIF(TRIM(v_record->>'고객 연락처'), ''),
          NULLIF(TRIM(v_record->>'고객연락처'), ''),
          NULLIF(TRIM(v_record->>'연락처'), ''),
          NULLIF(TRIM(v_record->>'전화번호'), ''),
          NULLIF(TRIM(v_record->>'customer_phone'), ''),
          NULLIF(TRIM(v_record->>'client_phone'), ''),
          ''
        ),
        -- Email fallback
        COALESCE(
          NULLIF(TRIM(v_record->>'email'), ''),
          NULLIF(TRIM(v_record->>'이메일'), ''),
          NULL
        ),
        -- Organization fallback
        COALESCE(
          NULLIF(TRIM(v_record->>'organization'), ''),
          NULLIF(TRIM(v_record->>'거래처명'), ''),
          NULLIF(TRIM(v_record->>'소속'), ''),
          NULLIF(TRIM(v_record->>'회사'), ''),
          NULLIF(TRIM(v_record->>'company'), ''),
          NULL
        ),
        -- Position fallback
        COALESCE(
          NULLIF(TRIM(v_record->>'position'), ''),
          NULLIF(TRIM(v_record->>'직급'), ''),
          NULL
        ),
        -- Department fallback
        COALESCE(
          NULLIF(TRIM(v_record->>'department'), ''),
          NULLIF(TRIM(v_record->>'부서'), ''),
          NULLIF(TRIM(v_record->>'팀명'), ''),
          NULLIF(TRIM(v_record->>'팀'), ''),
          NULLIF(TRIM(v_record->>'team'), ''),
          NULL
        ),
        -- Address fallback
        COALESCE(
          NULLIF(TRIM(v_record->>'address'), ''),
          NULLIF(TRIM(v_record->>'주소'), ''),
          NULL
        ),
        -- Manager info JSON with fallback
        CASE 
          WHEN v_record ? 'manager_name' OR v_record ? 'manager_phone' OR v_record ? 'manager_email'
             OR v_record ? '담당자 성명' OR v_record ? '담당자 연락처' OR v_record ? '담당자 이메일'
          THEN jsonb_build_object(
            'name', COALESCE(
              NULLIF(TRIM(v_record->>'manager_name'), ''),
              NULLIF(TRIM(v_record->>'담당자 성명'), ''),
              NULLIF(TRIM(v_record->>'담당자성명'), ''),
              NULLIF(TRIM(v_record->>'담당자'), ''),
              ''
            ),
            'phone', COALESCE(
              NULLIF(TRIM(v_record->>'manager_phone'), ''),
              NULLIF(TRIM(v_record->>'담당자 연락처'), ''),
              NULLIF(TRIM(v_record->>'담당자연락처'), ''),
              ''
            ),
            'email', COALESCE(
              NULLIF(TRIM(v_record->>'manager_email'), ''),
              NULLIF(TRIM(v_record->>'담당자 이메일'), ''),
              ''
            )
          )
          ELSE NULL
        END,
        '참석자', '대기중', '대기중', true
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET organization = EXCLUDED.organization,
          email = EXCLUDED.email,
          position = EXCLUDED.position,
          department = EXCLUDED.department,
          address = EXCLUDED.address,
          manager_info = EXCLUDED.manager_info,
          updated_at = NOW();

      -- Count as insert or update based on actual operation
      IF FOUND THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;

      -- 4. Insert log (actual schema match)
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
        AND part.name = COALESCE(
          NULLIF(TRIM(v_record->>'name'), ''),
          NULLIF(TRIM(v_record->>'고객 성명'), ''),
          ''
        )
        AND part.phone = COALESCE(
          NULLIF(TRIM(v_record->>'phone'), ''),
          NULLIF(TRIM(v_record->>'고객 연락처'), ''),
          ''
        )
      LIMIT 1;

    EXCEPTION
      WHEN OTHERS THEN
        v_skipped := v_skipped + 1;
        v_error_detail := SQLERRM;
        
        -- Log error to existing logs table structure
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
        EXCEPTION
          WHEN OTHERS THEN
            -- Silently continue if logging fails
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

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean)
TO authenticated, service_role;