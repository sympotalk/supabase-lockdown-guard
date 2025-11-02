-- ============================================================
-- Phase 82-STABILIZE-UPLOAD-FLOW: Single RPC Upload with Append/Replace
-- ============================================================

-- 0) 업서트 키 보강: (event_id, name, phone_norm) 유니크
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='uq_participants_event_name_phone_norm'
  ) THEN
    EXECUTE
      'CREATE UNIQUE INDEX uq_participants_event_name_phone_norm
         ON public.participants (event_id, name, COALESCE(phone, ''''))';
  END IF;
END$$;

-- 1) 기존 동명 함수 정리
DROP FUNCTION IF EXISTS public.process_excel_upload(uuid, jsonb, text);

-- 2) 업로드 단일 RPC
CREATE OR REPLACE FUNCTION public.process_excel_upload(
  p_event_id uuid,
  p_rows jsonb,
  p_mode text DEFAULT 'append'  -- 'append' | 'replace'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_mode text := lower(coalesce(p_mode,'append'));
  v_total int := 0;
  v_inserted int := 0;  -- upsert된 수(INSERT+UPDATE)
  v_skipped  int := 0;  -- 필수값 누락 등으로 제외된 수
BEGIN
  -- 행사/에이전시 확인
  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event_id';
  END IF;

  -- 입력 검증
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'rows_json must be a JSON array';
  END IF;

  -- 모드 검증
  IF v_mode NOT IN ('append','replace') THEN
    RAISE EXCEPTION 'mode must be ''append'' or ''replace''';
  END IF;

  -- REPLACE: 대상 행사 데이터 전량 삭제
  IF v_mode = 'replace' THEN
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- 총 입력 행
  SELECT jsonb_array_length(p_rows) INTO v_total;

  -- 정제 → 필수 통과 → 업서트
  WITH parsed AS (
    SELECT
      trim(coalesce(x->>'이름', x->>'name', '')) AS name,
      trim(coalesce(x->>'소속', x->>'organization', '')) AS organization,
      NULLIF(trim(coalesce(x->>'연락처', x->>'phone', '')), '') AS phone_raw,
      NULLIF(trim(coalesce(x->>'요청사항', x->>'request_note', '')), '') AS request_note
    FROM jsonb_array_elements(p_rows) AS x
  ),
  cleaned AS (
    SELECT
      name,
      organization,
      -- 숫자만 남김
      CASE WHEN phone_raw IS NULL THEN NULL
           ELSE REGEXP_REPLACE(phone_raw, '[^0-9]', '', 'g')
      END AS phone,
      request_note
    FROM parsed
    WHERE name <> '' AND organization <> ''
  ),
  upserted AS (
    INSERT INTO public.participants (
      event_id, agency_id, name, organization, phone, request_note,
      created_at, updated_at
    )
    SELECT
      p_event_id, v_agency_id, name, organization, phone, request_note,
      now(), now()
    FROM cleaned
    ON CONFLICT (event_id, name, COALESCE(phone,''))
    DO UPDATE SET
      organization = EXCLUDED.organization,
      request_note = EXCLUDED.request_note,
      updated_at   = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM upserted;

  -- 스킵 = 총 입력 - (필수 통과 후 업서트된 건수)
  -- (필수 통과 수 = cleaned 행 수)
  WITH cleaned_count AS (
    SELECT
      trim(coalesce(x->>'이름', x->>'name', '')) AS name,
      trim(coalesce(x->>'소속', x->>'organization', '')) AS organization
    FROM jsonb_array_elements(p_rows) AS x
    WHERE trim(coalesce(x->>'이름', x->>'name', '')) <> ''
      AND trim(coalesce(x->>'소속', x->>'organization', '')) <> ''
  )
  SELECT (v_total - COUNT(*)) INTO v_skipped FROM cleaned_count;

  -- 로그 기록
  INSERT INTO public.participants_log (
    event_id, agency_id, action, metadata, created_by, created_at
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'excel_process',
    jsonb_build_object(
      'mode', v_mode,
      'total', v_total,
      'processed', v_inserted,
      'skipped', v_skipped
    ),
    auth.uid(),
    now()
  );

  RETURN jsonb_build_object(
    'status', 'ok',
    'mode', v_mode,
    'total', v_total,
    'processed', v_inserted,
    'skipped', v_skipped
  );
END;
$$;

-- 3) 권한
GRANT EXECUTE ON FUNCTION public.process_excel_upload(uuid, jsonb, text)
  TO authenticated, service_role;

-- 4) 간단 뷰: 행사별 참가자 수
CREATE OR REPLACE VIEW public.v_event_participant_count AS
SELECT
  e.id AS event_id,
  e.name AS event_name,
  COUNT(p.id) AS participant_count
FROM public.events e
LEFT JOIN public.participants p ON p.event_id = e.id
GROUP BY e.id;