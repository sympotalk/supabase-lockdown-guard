-- [Phase 73-L.7.12] role_badge Default Enforcement
-- 목표: 모든 신규 참가자는 기본 구분값 '참석자' 자동 설정

-- Step 1. 컬럼 기본값 지정
ALTER TABLE public.participants
ALTER COLUMN role_badge SET DEFAULT '참석자';

-- Step 2. 기존 NULL/빈 값 보정
UPDATE public.participants
SET role_badge = '참석자'
WHERE role_badge IS NULL OR role_badge = '';

-- Step 3. RPC 함수 내 하드코딩 제거 (DEFAULT 사용)
CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_data jsonb,
  p_replace boolean DEFAULT false
) RETURNS jsonb AS $$
DECLARE
  v_agency_id uuid;
  v_row jsonb;
  v_name text;
  v_phone text;
  v_organization text;
  v_email text;
  v_position text;
  v_department text;
  v_address text;
  v_manager_name text;
  v_manager_phone text;
  v_manager_email text;
  v_manager_info jsonb;
  v_inserted int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_session_id text;
  v_participant_id uuid;
  v_skip_reason text;
BEGIN
  -- [73-L.7.12] Session ID 생성
  v_session_id := 'import_' || extract(epoch from now())::text || '_' || left(gen_random_uuid()::text, 8);
  
  -- [73-L.7.12] Agency ID 조회
  SELECT COALESCE(agency_id, (
    SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
  )) INTO v_agency_id
  FROM public.events WHERE id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'AGENCY_CONTEXT_NOT_FOUND';
  END IF;

  -- [73-L.7.12] Replace 모드: 기존 참가자 soft delete
  IF p_replace THEN
    UPDATE public.participants
    SET is_active = false, updated_at = now()
    WHERE event_id = p_event_id;
    
    PERFORM public.log_info('participant_import_replace_mode', 
                           jsonb_build_object('event_id', p_event_id, 'session_id', v_session_id));
  END IF;

  -- [73-L.7.12] 각 행 처리
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    -- name, phone 필수값 검증 (Guard)
    v_name := COALESCE(NULLIF(TRIM(v_row->>'name'), ''), NULLIF(TRIM(v_row->>'고객 성명'), ''));
    v_phone := COALESCE(NULLIF(TRIM(v_row->>'phone'), ''), NULLIF(TRIM(v_row->>'고객 연락처'), ''));
    
    IF v_name IS NULL OR v_phone IS NULL THEN
      v_skipped := v_skipped + 1;
      
      -- Skip reason 상세 로깅
      IF v_name IS NULL AND v_phone IS NULL THEN
        v_skip_reason := 'name_and_phone_missing';
      ELSIF v_name IS NULL THEN
        v_skip_reason := 'name_missing';
      ELSE
        v_skip_reason := 'phone_missing';
      END IF;
      
      PERFORM public.log_error('participant_import_skip_missing_required',
                               jsonb_build_object(
                                 'session_id', v_session_id,
                                 'skip_reason', v_skip_reason,
                                 'row', v_row
                               ));
      CONTINUE;
    END IF;

    -- [73-L.7.12] 필드 추출
    v_organization := COALESCE(v_row->>'organization', v_row->>'거래처명');
    v_email := COALESCE(v_row->>'email', v_row->>'이메일');
    v_position := COALESCE(v_row->>'position', v_row->>'직급');
    v_department := COALESCE(v_row->>'department', v_row->>'팀명', v_row->>'부서');
    v_address := COALESCE(v_row->>'address', v_row->>'주소');
    v_manager_name := COALESCE(v_row->>'manager_name', v_row->>'담당자 성명');
    v_manager_phone := COALESCE(v_row->>'manager_phone', v_row->>'담당자 연락처');
    v_manager_email := COALESCE(v_row->>'manager_email', v_row->>'담당자 이메일');

    -- [73-L.7.12] manager_info JSONB 구성
    v_manager_info := jsonb_build_object(
      'name', v_manager_name,
      'phone', v_manager_phone,
      'email', v_manager_email,
      'department', v_department
    );

    -- [73-L.7.12] UPSERT with role_badge DEFAULT
    INSERT INTO public.participants (
      event_id,
      agency_id,
      name,
      phone,
      organization,
      email,
      position,
      manager_info,
      call_status,
      is_active
    ) VALUES (
      p_event_id,
      v_agency_id,
      v_name,
      v_phone,
      v_organization,
      v_email,
      v_position,
      v_manager_info,
      '대기중',
      true
    )
    ON CONFLICT (event_id, name, phone)
    DO UPDATE SET
      organization = EXCLUDED.organization,
      email = EXCLUDED.email,
      position = EXCLUDED.position,
      manager_info = EXCLUDED.manager_info,
      is_active = true,
      updated_at = now()
    RETURNING id INTO v_participant_id;

    -- [73-L.7.12] 신규/업데이트 카운트
    IF v_participant_id IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.participants WHERE id = v_participant_id AND created_at = updated_at) > 0 THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;
    END IF;

    -- [73-L.7.12] 로그 기록
    PERFORM public.log_info('participant_import_upsert', 
                           jsonb_build_object(
                             'session_id', v_session_id,
                             'participant_id', v_participant_id,
                             'name', v_name,
                             'phone', v_phone
                           ));
  END LOOP;

  -- [73-L.7.12] 실시간 알림
  PERFORM pg_notify('participant_import_complete', 
                    json_build_object(
                      'event_id', p_event_id,
                      'session_id', v_session_id,
                      'inserted', v_inserted,
                      'updated', v_updated,
                      'skipped', v_skipped,
                      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
                    )::text);

  -- [73-L.7.12] 결과 반환
  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
    'session_id', v_session_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [73-L.7.12] 권한 유지
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel TO authenticated;