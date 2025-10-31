-- [Phase 77-Upload-FIX] Excel Upload & Log System Recovery

-- 1️⃣ participants_log 스키마 패치: NULL 허용 + 맥락 저장용 필드
ALTER TABLE public.participants_log
  ALTER COLUMN participant_id DROP NOT NULL;

-- 기존 컬럼 존재 여부 확인 후 추가
ALTER TABLE public.participants_log
  ADD COLUMN IF NOT EXISTS context_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_id text;

-- actor_user_id는 edited_by로 이미 존재하므로 추가 안 함

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_participants_log_event_created
  ON public.participants_log (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_log_session
  ON public.participants_log (session_id) WHERE session_id IS NOT NULL;

-- 2️⃣ rooming_status ENUM 확인 및 표준화 (이미 존재하면 skip)
DO $$ 
BEGIN
  -- enum이 이미 존재하는지 확인
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rooming_status') THEN
    CREATE TYPE rooming_status AS ENUM ('대기', '배정완료', '취소', '확정');
  END IF;
END $$;

-- 3️⃣ 업로드 함수 재구성
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean);
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean, text);

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
  v_error_detail TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_participant_id UUID;
  v_old_count INTEGER;
BEGIN
  -- Session ID 생성 또는 사용
  v_session_id := COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text);
  
  -- Get agency_id
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND: event_id % not found or has no agency_id', p_event_id;
  END IF;

  -- [로그] 업로드 시작
  INSERT INTO public.participants_log (
    event_id, agency_id, participant_id, action,
    context_json, session_id, edited_by, created_at
  ) VALUES (
    p_event_id, v_agency_id, NULL, 'upload_start',
    jsonb_build_object('mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END, 'total_rows', jsonb_array_length(p_data)),
    v_session_id, auth.uid(), NOW()
  );

  -- Replace mode: 기존 데이터 백업 후 삭제
  IF p_replace THEN
    SELECT COUNT(*) INTO v_old_count
    FROM public.participants
    WHERE event_id = p_event_id AND is_active = true;

    -- 각 삭제 행을 로그에 기록
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

    -- 실제 삭제 (soft delete)
    UPDATE public.participants
    SET is_active = false, updated_at = NOW()
    WHERE event_id = p_event_id AND is_active = true;

    v_deleted := v_old_count;
  END IF;

  -- 유효 rows 처리
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      -- 필수 필드 추출 및 검증
      v_name := COALESCE(NULLIF(TRIM(v_record->>'name'), ''), NULLIF(TRIM(v_record->>'고객 성명'), ''));
      v_phone := COALESCE(NULLIF(TRIM(v_record->>'phone'), ''), NULLIF(TRIM(v_record->>'고객 연락처'), ''));

      -- 필수 필드 누락 시 스킵
      IF v_name IS NULL OR v_phone IS NULL THEN
        v_skipped := v_skipped + 1;
        
        INSERT INTO public.participants_log (
          event_id, agency_id, participant_id, action,
          context_json, session_id, edited_by, created_at
        ) VALUES (
          p_event_id, v_agency_id, NULL, 'skip',
          jsonb_build_object(
            'reason', CASE 
              WHEN v_name IS NULL AND v_phone IS NULL THEN 'name_and_phone_missing'
              WHEN v_name IS NULL THEN 'name_missing'
              ELSE 'phone_missing'
            END,
            'record', v_record
          ),
          v_session_id, auth.uid(), NOW()
        );
        CONTINUE;
      END IF;

      -- Insert or Update
      INSERT INTO public.participants (
        event_id,
        agency_id,
        name,
        phone,
        email,
        organization,
        position,
        department,
        address,
        request_note,
        sfe_company_code,
        sfe_customer_code,
        manager_info,
        manager_email,
        role_badge,
        call_status,
        is_active
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
        sfe_company_code = EXCLUDED.sfe_company_code,
        sfe_customer_code = EXCLUDED.sfe_customer_code,
        manager_info = EXCLUDED.manager_info,
        manager_email = EXCLUDED.manager_email,
        role_badge = EXCLUDED.role_badge,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id INTO v_participant_id;

      -- 성공 로그
      IF FOUND THEN
        IF v_participant_id IS NOT NULL THEN
          v_inserted := v_inserted + 1;
          INSERT INTO public.participants_log (
            event_id, agency_id, participant_id, action,
            context_json, session_id, edited_by, created_at
          ) VALUES (
            p_event_id, v_agency_id, v_participant_id, 'insert',
            jsonb_build_object('source', 'excel', 'mapped', true, 'name', v_name, 'phone', v_phone),
            v_session_id, auth.uid(), NOW()
          );
        END IF;
      ELSE
        v_updated := v_updated + 1;
        INSERT INTO public.participants_log (
          event_id, agency_id, participant_id, action,
          context_json, session_id, edited_by, created_at
        ) VALUES (
          p_event_id, v_agency_id, v_participant_id, 'update',
          jsonb_build_object('source', 'excel', 'mapped', true, 'name', v_name, 'phone', v_phone),
          v_session_id, auth.uid(), NOW()
        );
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        v_error_detail := SQLERRM;

        -- 에러 로그
        INSERT INTO public.participants_log (
          event_id, agency_id, participant_id, action,
          context_json, session_id, edited_by, created_at
        ) VALUES (
          p_event_id, v_agency_id, NULL, 'parse_error',
          jsonb_build_object('error', v_error_detail, 'record', v_record),
          v_session_id, auth.uid(), NOW()
        );
        CONTINUE;
    END;
  END LOOP;

  -- [로그] 업로드 완료
  INSERT INTO public.participants_log (
    event_id, agency_id, participant_id, action,
    context_json, session_id, edited_by, created_at
  ) VALUES (
    p_event_id, v_agency_id, NULL, 'upload_done',
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

  -- 반환
  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'deleted', v_deleted,
    'errors', v_errors,
    'session_id', v_session_id,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 실패 로그
    INSERT INTO public.participants_log (
      event_id, agency_id, participant_id, action,
      context_json, session_id, edited_by, created_at
    ) VALUES (
      p_event_id, v_agency_id, NULL, 'upload_failed',
      jsonb_build_object('error', SQLERRM),
      v_session_id, auth.uid(), NOW()
    );
    
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.ai_participant_import_from_excel IS 
'[Phase 77-Upload-FIX] Excel upload with comprehensive logging to participants_log';

-- 4️⃣ 검증용 뷰 생성
CREATE OR REPLACE VIEW public.v_upload_session_summary AS
SELECT
  session_id,
  event_id,
  action,
  COUNT(*) as count,
  MAX(created_at) as last_at
FROM public.participants_log
WHERE session_id IS NOT NULL
GROUP BY session_id, event_id, action
ORDER BY last_at DESC;

COMMENT ON VIEW public.v_upload_session_summary IS 
'[Phase 77-Upload-FIX] Upload session summary for debugging';