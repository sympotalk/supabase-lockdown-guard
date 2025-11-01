-- Phase 78-F : commit_staged_participants 근본 수정 (AI 매칭 코드 완전 제거)
-- 목적: match_hash, AI 매칭 로직 제거 + 단순 업로드 구조로 통합

-- Step 1: 기존 함수 완전 제거
DROP FUNCTION IF EXISTS public.commit_staged_participants(uuid, text);
DROP FUNCTION IF EXISTS public.commit_staged_participants(uuid);

-- Step 2: 신규 함수 재정의 (최신 구조 기준)
CREATE OR REPLACE FUNCTION public.commit_staged_participants(
  p_event_id uuid,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count integer := 0;
  v_agency_id uuid;
BEGIN
  -- 행사에 속한 agency_id 조회
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event_id or agency_id not found';
  END IF;

  -- 본 테이블에 반영
  INSERT INTO public.participants (
    event_id,
    agency_id,
    name,
    organization,
    phone,
    request_note,
    created_at,
    updated_at
  )
  SELECT
    s.event_id,
    v_agency_id,
    s.name,
    s.organization,
    s.phone,
    s.request_note,
    NOW(),
    NOW()
  FROM public.participants_staging s
  WHERE s.event_id = p_event_id;

  GET DIAGNOSTICS v_total_count = ROW_COUNT;

  -- 로그 기록
  INSERT INTO public.participants_log (
    event_id,
    agency_id,
    action,
    metadata,
    created_by,
    created_at
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'bulk_upload',
    jsonb_build_object(
      'total', v_total_count,
      'session_id', COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text)
    ),
    auth.uid(),
    NOW()
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'total', v_total_count,
    'event_id', p_event_id,
    'mode', 'commit'
  );
END;
$$;

-- 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.commit_staged_participants(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_staged_participants(uuid, text) TO service_role;