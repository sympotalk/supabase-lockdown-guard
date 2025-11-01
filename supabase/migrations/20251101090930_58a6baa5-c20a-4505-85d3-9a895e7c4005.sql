-- Phase 78-E : commit_staged_participants 리빌드 (match_hash 제거 버전)
-- 목적: 단순 구조 업로드용 RPC 함수로 정비

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
  -- 소속 에이전시 식별
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event_id or agency_id not found';
  END IF;

  -- 스테이징 → 본 테이블 반영
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

  -- 업로드 로그 기록
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
    'event_id', p_event_id
  );
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.commit_staged_participants(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_staged_participants(uuid, text) TO service_role;