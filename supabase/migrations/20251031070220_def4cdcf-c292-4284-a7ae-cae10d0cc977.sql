-- [Phase 77-A.1] AI 매칭 필터링 강화 및 통계 RPC

-- 1️⃣ AI 매칭 RPC 개선: 참석자만 대상으로 필터링
CREATE OR REPLACE FUNCTION public.ai_auto_assign_rooms(
  p_event_id UUID,
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_participant RECORD;
  v_room_type_id UUID;
  v_room_credit TEXT;
  v_assigned INT := 0;
  v_warnings JSONB := '[]'::jsonb;
  v_errors JSONB := '[]'::jsonb;
  v_adults INT;
  v_children INT;
  v_child_ages INT[];
  v_requests TEXT[];
BEGIN
  -- [Phase 77-A.1] 참석자만 순회 (TM상태 또는 설문상태 기반)
  FOR v_participant IN
    SELECT 
      p.id,
      p.name,
      p.fixed_role,
      p.composition,
      rp.id as rooming_id,
      rp.manual_assigned,
      rp.room_type_id as current_room_type_id
    FROM public.participants p
    LEFT JOIN public.rooming_participants rp ON rp.participant_id = p.id
    WHERE p.event_id = p_event_id
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND (
        p.call_status IN ('참석', 'Confirmed', '응답(참석)', 'TM완료(참석)')
        OR p.survey_status IN ('참가', 'Yes', 'Attending')
      )
    ORDER BY p.participant_no ASC
  LOOP
    -- 수동 배정된 경우 스킵
    IF v_participant.manual_assigned = true THEN
      CONTINUE;
    END IF;

    -- 인원 구성 파싱
    v_adults := COALESCE((v_participant.composition->>'adult')::int, 1);
    v_children := COALESCE((v_participant.composition->>'child')::int, 0);
    v_child_ages := ARRAY(
      SELECT jsonb_array_elements_text(v_participant.composition->'child_ages')::int
    );

    v_room_type_id := NULL;
    v_requests := ARRAY[]::TEXT[];

    -- 룰셋 적용
    IF v_children = 0 AND v_adults <= 2 THEN
      -- 성인만, 2인 이하 → 디럭스 킹
      SELECT err.id, err.credit INTO v_room_type_id, v_room_credit
      FROM public.event_room_refs err
      JOIN public.room_types rt ON rt.id = err.room_type_id
      WHERE err.event_id = p_event_id
        AND err.is_active = true
        AND rt.type_name ILIKE '%킹%'
      ORDER BY err.credit ASC
      LIMIT 1;

    ELSIF v_children >= 1 AND v_child_ages[1] <= 2 THEN
      -- 영유아(0~2세) → 디럭스 킹 + 아기침대 + 침대가드
      SELECT err.id, err.credit INTO v_room_type_id, v_room_credit
      FROM public.event_room_refs err
      JOIN public.room_types rt ON rt.id = err.room_type_id
      WHERE err.event_id = p_event_id
        AND err.is_active = true
        AND rt.type_name ILIKE '%킹%'
      ORDER BY err.credit ASC
      LIMIT 1;
      
      v_requests := ARRAY['아기침대', '침대가드'];

    ELSIF v_children >= 1 AND v_child_ages[1] BETWEEN 3 AND 5 THEN
      -- 소아(3~5세) → 패밀리 트윈 + 엑스트라베드 + 침대가드
      SELECT err.id, err.credit INTO v_room_type_id, v_room_credit
      FROM public.event_room_refs err
      JOIN public.room_types rt ON rt.id = err.room_type_id
      WHERE err.event_id = p_event_id
        AND err.is_active = true
        AND rt.type_name ILIKE '%트윈%'
      ORDER BY err.credit ASC
      LIMIT 1;
      
      v_requests := ARRAY['엑스트라베드', '침대가드'];

    ELSIF v_children >= 1 AND v_child_ages[1] >= 6 THEN
      -- 아동(6세 이상) → 패밀리 트윈 + 엑스트라베드
      SELECT err.id, err.credit INTO v_room_type_id, v_room_credit
      FROM public.event_room_refs err
      JOIN public.room_types rt ON rt.id = err.room_type_id
      WHERE err.event_id = p_event_id
        AND err.is_active = true
        AND rt.type_name ILIKE '%트윈%'
      ORDER BY err.credit ASC
      LIMIT 1;
      
      v_requests := ARRAY['엑스트라베드'];

    ELSIF v_children >= 2 THEN
      -- 소아 2명 이상 → 스위트
      SELECT err.id, err.credit INTO v_room_type_id, v_room_credit
      FROM public.event_room_refs err
      JOIN public.room_types rt ON rt.id = err.room_type_id
      WHERE err.event_id = p_event_id
        AND err.is_active = true
        AND rt.type_name ILIKE '%스위트%'
      ORDER BY err.credit ASC
      LIMIT 1;
      
      v_requests := ARRAY['엑스트라베드'];
    END IF;

    -- 역할 기반 객실 우선순위 (좌장 → 고급 객실)
    IF v_participant.fixed_role = '좌장' AND v_room_type_id IS NULL THEN
      SELECT err.id, err.credit INTO v_room_type_id, v_room_credit
      FROM public.event_room_refs err
      JOIN public.room_types rt ON rt.id = err.room_type_id
      WHERE err.event_id = p_event_id
        AND err.is_active = true
      ORDER BY err.credit DESC
      LIMIT 1;
    END IF;

    -- 객실 배정 실행 (dry_run이 아닐 때만)
    IF v_room_type_id IS NOT NULL AND NOT p_dry_run THEN
      -- rooming_participants 업데이트 또는 생성
      INSERT INTO public.rooming_participants (
        event_id,
        participant_id,
        room_type_id,
        room_credit,
        status,
        manual_assigned,
        assigned_at
      )
      VALUES (
        p_event_id,
        v_participant.id,
        v_room_type_id,
        v_room_credit,
        '자동배정',
        false,
        now()
      )
      ON CONFLICT (event_id, participant_id)
      DO UPDATE SET
        room_type_id = EXCLUDED.room_type_id,
        room_credit = EXCLUDED.room_credit,
        status = '자동배정',
        assigned_at = now();

      -- 장비 요청 등록
      IF array_length(v_requests, 1) > 0 THEN
        INSERT INTO public.participant_requests (
          event_id,
          participant_id,
          request_type,
          priority,
          status
        )
        SELECT
          p_event_id,
          v_participant.id,
          unnest(v_requests),
          1,
          'pending'
        ON CONFLICT (event_id, participant_id, request_type) DO NOTHING;
      END IF;

      v_assigned := v_assigned + 1;
    ELSIF v_room_type_id IS NULL THEN
      -- 객실 타입을 찾지 못한 경우
      v_errors := v_errors || jsonb_build_object(
        'participant', v_participant.name,
        'message', '적합한 객실 타입을 찾을 수 없습니다'
      );
    END IF;
  END LOOP;

  -- 객실 재고 부족 경고 체크
  DECLARE
    v_shortage RECORD;
  BEGIN
    FOR v_shortage IN
      SELECT 
        rt.type_name,
        COUNT(rp.id) as demand,
        err.stock
      FROM public.rooming_participants rp
      JOIN public.event_room_refs err ON err.id = rp.room_type_id
      JOIN public.room_types rt ON rt.id = err.room_type_id
      WHERE rp.event_id = p_event_id
        AND rp.room_type_id IS NOT NULL
      GROUP BY rt.type_name, err.stock
      HAVING COUNT(rp.id) > err.stock
    LOOP
      v_warnings := v_warnings || jsonb_build_object(
        'type', 'stock_shortage',
        'room_type', v_shortage.type_name,
        'demand', v_shortage.demand,
        'stock', v_shortage.stock,
        'message', format('%s 객실이 부족합니다 (필요: %s, 보유: %s)', 
          v_shortage.type_name, v_shortage.demand, v_shortage.stock)
      );
    END LOOP;
  END;

  RETURN jsonb_build_object(
    'status', 'success',
    'assigned', v_assigned,
    'warnings', v_warnings,
    'errors', v_errors,
    'dry_run', p_dry_run
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ 객실 통계용 RPC 생성
CREATE OR REPLACE FUNCTION public.ai_rooming_stats(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_assigned INT;
  v_pending INT;
  v_total_rooms INT;
  v_remaining INT;
  v_shortage JSONB;
  v_result JSONB;
BEGIN
  -- 배정 완료 인원
  SELECT COUNT(*) INTO v_assigned
  FROM public.rooming_participants
  WHERE event_id = p_event_id
    AND room_type_id IS NOT NULL
    AND is_active = true;

  -- 배정 대기 인원
  SELECT COUNT(*) INTO v_pending
  FROM public.rooming_participants
  WHERE event_id = p_event_id
    AND (room_type_id IS NULL OR status = '배정대기')
    AND is_active = true;

  -- 객실 총 수량
  SELECT COALESCE(SUM(stock), 0) INTO v_total_rooms
  FROM public.event_room_refs
  WHERE event_id = p_event_id
    AND is_active = true;

  -- 잔여 객실
  v_remaining := v_total_rooms - v_assigned;

  -- 부족 객실 감지
  SELECT jsonb_agg(
    jsonb_build_object(
      'room_type', rt.type_name,
      'needed', demand.needed_count,
      'available', err.stock,
      'shortage', demand.needed_count - err.stock
    )
  )
  INTO v_shortage
  FROM (
    SELECT room_type_id, COUNT(*) AS needed_count
    FROM public.rooming_participants
    WHERE event_id = p_event_id 
      AND room_type_id IS NOT NULL
      AND is_active = true
    GROUP BY room_type_id
  ) AS demand
  JOIN public.event_room_refs err ON err.id = demand.room_type_id
  JOIN public.room_types rt ON rt.id = err.room_type_id
  WHERE demand.needed_count > err.stock;

  -- 결과 반환
  v_result := jsonb_build_object(
    'assigned', v_assigned,
    'pending', v_pending,
    'totalRooms', v_total_rooms,
    'remaining', v_remaining,
    'shortage', COALESCE(v_shortage, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_rooming_stats TO authenticated;