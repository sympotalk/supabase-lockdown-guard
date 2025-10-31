-- [Phase 77-E] AI 기반 동반의료인 자동 매핑

-- 1️⃣ AI 텍스트 추출 및 패턴 감지 RPC
CREATE OR REPLACE FUNCTION public.ai_detect_companions_from_memo(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  rec RECORD;
  v_target RECORD;
  v_confidence NUMERIC;
BEGIN
  FOR rec IN
    SELECT id, name, memo
    FROM public.participants
    WHERE event_id = p_event_id
      AND is_active = true
      AND memo IS NOT NULL
      AND TRIM(memo) != ''
  LOOP
    -- 1️⃣ "동반의료인" 키워드 탐색 (높은 확신도)
    IF rec.memo ILIKE '%동반의료인%' OR rec.memo ILIKE '%동반인%' THEN
      FOR v_target IN
        SELECT id, name
        FROM public.participants
        WHERE event_id = p_event_id
          AND is_active = true
          AND rec.memo ILIKE '%' || name || '%'
          AND id <> rec.id
      LOOP
        v_result := v_result || jsonb_build_object(
          'source_id', rec.id,
          'source_name', rec.name,
          'target_id', v_target.id,
          'target_name', v_target.name,
          'confidence', 0.95,
          'reason', '동반의료인 키워드 감지',
          'text', rec.memo
        );
      END LOOP;
    
    -- 2️⃣ "부원장", "부인", "배우자" 등 모호한 표현 (낮은 확신도)
    ELSIF rec.memo ILIKE '%부원장%' OR rec.memo ILIKE '%부인%' OR rec.memo ILIKE '%배우자%' THEN
      FOR v_target IN
        SELECT id, name
        FROM public.participants
        WHERE event_id = p_event_id
          AND is_active = true
          AND rec.memo ILIKE '%' || name || '%'
          AND id <> rec.id
      LOOP
        v_result := v_result || jsonb_build_object(
          'source_id', rec.id,
          'source_name', rec.name,
          'target_id', v_target.id,
          'target_name', v_target.name,
          'confidence', 0.6,
          'reason', '가족/동반 관계 추정',
          'text', rec.memo
        );
      END LOOP;
    
    -- 3️⃣ "함께", "같이" 등의 표현 (중간 확신도)
    ELSIF rec.memo ILIKE '%함께%' OR rec.memo ILIKE '%같이%' OR rec.memo ILIKE '%동반%' THEN
      FOR v_target IN
        SELECT id, name
        FROM public.participants
        WHERE event_id = p_event_id
          AND is_active = true
          AND rec.memo ILIKE '%' || name || '%'
          AND id <> rec.id
      LOOP
        v_result := v_result || jsonb_build_object(
          'source_id', rec.id,
          'source_name', rec.name,
          'target_id', v_target.id,
          'target_name', v_target.name,
          'confidence', 0.75,
          'reason', '동반 관계 키워드 감지',
          'text', rec.memo
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_detect_companions_from_memo TO authenticated;

-- 2️⃣ 동반자 쌍 연결 RPC (양방향 동기화)
CREATE OR REPLACE FUNCTION public.link_companions_pair(
  p_source_id UUID,
  p_target_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- 이벤트 ID 확인
  SELECT event_id INTO v_event_id
  FROM public.participants
  WHERE id = p_source_id
  LIMIT 1;

  -- Source에 Target 추가
  UPDATE public.participants
  SET companions = CASE
    WHEN companions IS NULL THEN jsonb_build_array(p_target_id)
    WHEN companions ? p_target_id::text THEN companions
    ELSE companions || jsonb_build_array(p_target_id)
  END,
  updated_at = now()
  WHERE id = p_source_id;

  -- Target에 Source 추가 (양방향)
  UPDATE public.participants
  SET companions = CASE
    WHEN companions IS NULL THEN jsonb_build_array(p_source_id)
    WHEN companions ? p_source_id::text THEN companions
    ELSE companions || jsonb_build_array(p_source_id)
  END,
  updated_at = now()
  WHERE id = p_target_id;

  -- rooming_participants에도 동기화
  UPDATE public.rooming_participants rp
  SET companions = CASE
    WHEN companions IS NULL THEN jsonb_build_array(p_target_id)
    WHEN companions ? p_target_id::text THEN companions
    ELSE companions || jsonb_build_array(p_target_id)
  END,
  updated_at = now()
  WHERE participant_id = p_source_id
    AND event_id = v_event_id;

  UPDATE public.rooming_participants rp
  SET companions = CASE
    WHEN companions IS NULL THEN jsonb_build_array(p_source_id)
    WHEN companions ? p_source_id::text THEN companions
    ELSE companions || jsonb_build_array(p_source_id)
  END,
  updated_at = now()
  WHERE participant_id = p_target_id
    AND event_id = v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'source_id', p_source_id,
    'target_id', p_target_id,
    'event_id', v_event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.link_companions_pair TO authenticated;

-- 3️⃣ 동반자 연결 해제 RPC
CREATE OR REPLACE FUNCTION public.unlink_companions_pair(
  p_source_id UUID,
  p_target_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- 이벤트 ID 확인
  SELECT event_id INTO v_event_id
  FROM public.participants
  WHERE id = p_source_id
  LIMIT 1;

  -- Source에서 Target 제거
  UPDATE public.participants
  SET companions = companions - p_target_id::text,
      updated_at = now()
  WHERE id = p_source_id
    AND companions ? p_target_id::text;

  -- Target에서 Source 제거
  UPDATE public.participants
  SET companions = companions - p_source_id::text,
      updated_at = now()
  WHERE id = p_target_id
    AND companions ? p_source_id::text;

  -- rooming_participants에서도 제거
  UPDATE public.rooming_participants
  SET companions = companions - p_target_id::text,
      updated_at = now()
  WHERE participant_id = p_source_id
    AND event_id = v_event_id
    AND companions ? p_target_id::text;

  UPDATE public.rooming_participants
  SET companions = companions - p_source_id::text,
      updated_at = now()
  WHERE participant_id = p_target_id
    AND event_id = v_event_id
    AND companions ? p_source_id::text;

  RETURN jsonb_build_object(
    'success', true,
    'source_id', p_source_id,
    'target_id', p_target_id,
    'event_id', v_event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.unlink_companions_pair TO authenticated;