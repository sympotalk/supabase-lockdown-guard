-- Phase 73-L.7.13 — Legacy Log Helper Cleanup & Direct Logging

-- Step 1: Drop legacy log helper functions
DROP FUNCTION IF EXISTS public.log_info(text, jsonb);
DROP FUNCTION IF EXISTS public.log_error(text, jsonb);
DROP FUNCTION IF EXISTS public.log_debug(text, jsonb);

-- Step 2: Replace ai_participant_import_from_excel with direct logging
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
  -- Get agency_id
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- Replace mode: delete existing data
  IF p_replace THEN
    DELETE FROM public.participants_log WHERE participant_id IN (
      SELECT id FROM public.participants WHERE event_id = p_event_id
    );
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- Process JSON data
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      -- Extract and validate required fields
      v_name := COALESCE(NULLIF(TRIM(v_record->>'name'), ''), NULLIF(TRIM(v_record->>'고객 성명'), ''));
      v_phone := COALESCE(NULLIF(TRIM(v_record->>'phone'), ''), NULLIF(TRIM(v_record->>'고객 연락처'), ''));

      -- Skip if name or phone is missing
      IF v_name IS NULL OR v_phone IS NULL THEN
        v_skipped := v_skipped + 1;
        
        INSERT INTO public.logs (
          event_id,
          actor_role,
          action,
          target_table,
          payload,
          created_by,
          created_at
        )
        VALUES (
          p_event_id,
          'system',
          'participant_import_skip',
          'participants',
          jsonb_build_object(
            'session_id', v_session_id,
            'reason', CASE 
              WHEN v_name IS NULL AND v_phone IS NULL THEN 'name_and_phone_missing'
              WHEN v_name IS NULL THEN 'name_missing'
              ELSE 'phone_missing'
            END,
            'record', v_record
          ),
          auth.uid(),
          NOW()
        );
        CONTINUE;
      END IF;

      -- Insert or update participant
      INSERT INTO public.participants (
        event_id,
        agency_id,
        name,
        phone,
        email,
        organization,
        manager_info,
        role_badge,
        call_status,
        is_active
      ) VALUES (
        p_event_id,
        v_agency_id,
        v_name,
        v_phone,
        COALESCE(NULLIF(TRIM(v_record->>'email'), ''), NULLIF(TRIM(v_record->>'이메일'), ''), NULL),
        COALESCE(NULLIF(TRIM(v_record->>'organization'), ''), NULLIF(TRIM(v_record->>'거래처명'), ''), NULL),
        CASE
          WHEN v_record ? 'manager_name' OR v_record ? 'manager_phone' OR v_record ? 'manager_email' OR
               v_record ? '담당자 성명' OR v_record ? '담당자 연락처' OR v_record ? '담당자 이메일' THEN
            jsonb_build_object(
              'name', COALESCE(NULLIF(TRIM(v_record->>'manager_name'), ''), NULLIF(TRIM(v_record->>'담당자 성명'), '')),
              'phone', COALESCE(NULLIF(TRIM(v_record->>'manager_phone'), ''), NULLIF(TRIM(v_record->>'담당자 연락처'), '')),
              'email', COALESCE(NULLIF(TRIM(v_record->>'manager_email'), ''), NULLIF(TRIM(v_record->>'담당자 이메일'), ''))
            )
          ELSE NULL
        END,
        DEFAULT,  -- role_badge defaults to '참석자'
        '대기중',
        TRUE
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET organization = EXCLUDED.organization,
          email = EXCLUDED.email,
          manager_info = EXCLUDED.manager_info,
          updated_at = NOW();

      IF FOUND THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        v_skipped := v_skipped + 1;
        v_error_detail := SQLERRM;

        -- Log error to logs table
        INSERT INTO public.logs (
          event_id,
          actor_role,
          action,
          target_table,
          payload,
          created_by,
          created_at
        )
        VALUES (
          p_event_id,
          'system',
          'participant_import_error',
          'participants',
          jsonb_build_object(
            'session_id', v_session_id,
            'error', v_error_detail,
            'record', v_record
          ),
          auth.uid(),
          NOW()
        );
        CONTINUE;
    END;
  END LOOP;

  -- Log import summary
  INSERT INTO public.logs (
    event_id,
    actor_role,
    action,
    target_table,
    payload,
    created_by,
    created_at
  )
  VALUES (
    p_event_id,
    'system',
    'participant_import_info',
    'participants',
    jsonb_build_object(
      'session_id', v_session_id,
      'inserted', v_inserted,
      'updated', v_updated,
      'skipped', v_skipped,
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
    ),
    auth.uid(),
    NOW()
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