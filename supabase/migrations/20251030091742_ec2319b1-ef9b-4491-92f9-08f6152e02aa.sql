-- Phase 73-L.7.15: Role Default + Dynamic Index Re-Sync

-- Step 1. DB 레벨 기본값 재검증
ALTER TABLE public.participants
ALTER COLUMN role_badge SET DEFAULT '참석자';

-- Step 2. NULL 값 보정
UPDATE public.participants
SET role_badge = '참석자'
WHERE role_badge IS NULL OR role_badge = '';

-- Step 3. RPC 내부 보완 (fail-safe default)
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
  -- Get agency_id
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- Replace 모드인 경우 기존 데이터 삭제
  IF p_replace THEN
    DELETE FROM public.participants_log WHERE participant_id IN (
      SELECT id FROM public.participants WHERE event_id = p_event_id
    );
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- JSON 데이터 반복 처리
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
        manager_info,
        role_badge,
        call_status,
        is_active
      ) VALUES (
        p_event_id,
        v_agency_id,
        COALESCE(NULLIF(TRIM(v_record->>'name'), ''), NULLIF(TRIM(v_record->>'고객 성명'), ''), ''),
        COALESCE(NULLIF(TRIM(v_record->>'phone'), ''), NULLIF(TRIM(v_record->>'고객 연락처'), ''), ''),
        COALESCE(NULLIF(TRIM(v_record->>'email'), ''), NULLIF(TRIM(v_record->>'이메일'), ''), NULL),
        COALESCE(NULLIF(TRIM(v_record->>'organization'), ''), NULLIF(TRIM(v_record->>'거래처명'), ''), NULL),
        CASE
          WHEN v_record ? 'manager_name' OR v_record ? 'manager_phone' OR v_record ? 'manager_email' THEN
            jsonb_build_object(
              'name', COALESCE(NULLIF(TRIM(v_record->>'manager_name'), ''), NULLIF(TRIM(v_record->>'담당자 성명'), '')),
              'phone', COALESCE(NULLIF(TRIM(v_record->>'manager_phone'), ''), NULLIF(TRIM(v_record->>'담당자 연락처'), '')),
              'email', COALESCE(NULLIF(TRIM(v_record->>'manager_email'), ''), NULLIF(TRIM(v_record->>'담당자 이메일'), ''))
            )
          ELSE NULL
        END,
        COALESCE(NULLIF(TRIM(v_record->>'role_badge'), ''), NULLIF(TRIM(v_record->>'구분'), ''), '참석자'),
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

  -- 업로드 결과 로그 기록
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