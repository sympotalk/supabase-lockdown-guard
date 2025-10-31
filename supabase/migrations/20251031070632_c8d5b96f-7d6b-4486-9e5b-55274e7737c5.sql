-- [Phase 77-C] AI 룸핑 리포트 & Companion Sync 자동 동기화

-- 1️⃣ AI 매칭 로그 기반 리포트 RPC 생성
CREATE OR REPLACE FUNCTION public.ai_rooming_report(p_event_id UUID)
RETURNS TABLE(
  participant_id UUID,
  participant_name TEXT,
  fixed_role TEXT,
  room_type_name TEXT,
  room_credit TEXT,
  room_status TEXT,
  match_reason TEXT,
  match_score INT,
  companion_names TEXT,
  request_summary TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS participant_id,
    p.name AS participant_name,
    p.fixed_role,
    rt.type_name AS room_type_name,
    err.credit AS room_credit,
    rp.status AS room_status,
    rml.match_reason,
    rml.match_score,
    -- 동반자 이름들을 쉼표로 구분하여 표시
    CASE 
      WHEN rp.companions IS NOT NULL AND jsonb_array_length(rp.companions) > 0 THEN
        (
          SELECT string_agg(cp.name, ', ')
          FROM jsonb_array_elements_text(rp.companions) AS comp_id
          JOIN public.participants cp ON cp.id = comp_id::uuid
        )
      ELSE '없음'
    END AS companion_names,
    -- 요청사항 요약 (우선순위순)
    COALESCE(
      (
        SELECT string_agg(
          rq.request_type || 
          CASE 
            WHEN rq.is_fulfilled THEN ' ✓' 
            ELSE '' 
          END, 
          ', ' 
          ORDER BY rq.priority ASC
        )
        FROM public.participant_requests rq
        WHERE rq.participant_id = p.id 
          AND rq.event_id = p_event_id
      ),
      '요청사항 없음'
    ) AS request_summary,
    rp.assigned_at
  FROM public.rooming_participants rp
  JOIN public.participants p ON rp.participant_id = p.id
  LEFT JOIN public.rooming_match_logs rml 
    ON rml.participant_id = p.id 
    AND rml.event_id = p_event_id
  LEFT JOIN public.event_room_refs err ON err.id = rp.room_type_id
  LEFT JOIN public.room_types rt ON rt.id = err.room_type_id
  WHERE rp.event_id = p_event_id
    AND rp.is_active = true
  ORDER BY p.participant_no ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_rooming_report TO authenticated;

-- 2️⃣ 동반의료인(companion) 자동 동기화 Trigger
CREATE OR REPLACE FUNCTION public.sync_rooming_companions()
RETURNS TRIGGER AS $$
DECLARE
  v_companion_id UUID;
BEGIN
  -- companions 배열에 있는 모든 동반자를 동일 룸으로 자동 배정
  IF NEW.companions IS NOT NULL AND jsonb_array_length(NEW.companions) > 0 THEN
    FOR v_companion_id IN 
      SELECT jsonb_array_elements_text(NEW.companions)::uuid
    LOOP
      -- 동반자 레코드 업데이트 (무한 루프 방지: manual_assigned가 true가 아닐 때만)
      UPDATE public.rooming_participants
      SET
        room_type_id = NEW.room_type_id,
        room_credit = NEW.room_credit,
        status = '동반배정',
        manual_assigned = FALSE,
        assigned_at = now(),
        companions = NEW.companions
      WHERE participant_id = v_companion_id
        AND event_id = NEW.event_id
        AND (manual_assigned = FALSE OR manual_assigned IS NULL)
        AND (room_type_id IS DISTINCT FROM NEW.room_type_id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_rooming_companions ON public.rooming_participants;
CREATE TRIGGER trg_sync_rooming_companions
AFTER INSERT OR UPDATE ON public.rooming_participants
FOR EACH ROW
WHEN (NEW.room_type_id IS NOT NULL)
EXECUTE FUNCTION public.sync_rooming_companions();

-- 3️⃣ SmartBadge 이행 상태 자동 갱신 RPC
CREATE OR REPLACE FUNCTION public.ai_update_request_fulfillment(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  -- 배정된 참가자의 필수 요청사항(우선순위 1)을 자동으로 이행 완료 처리
  UPDATE public.participant_requests rq
  SET is_fulfilled = TRUE,
      updated_at = now()
  FROM public.rooming_participants rp
  WHERE rq.participant_id = rp.participant_id
    AND rq.event_id = p_event_id
    AND rq.priority = 1  -- 필수 요청사항만
    AND rq.request_type IN ('아기침대', '엑스트라베드', '침대가드')
    AND rp.room_type_id IS NOT NULL  -- 객실 배정이 완료된 경우만
    AND rp.status IN ('자동배정', '수동배정', '동반배정')
    AND rq.is_fulfilled = FALSE;  -- 아직 이행되지 않은 것만

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- 배정 완료 시 선호/편의 요청사항도 pending → confirmed 상태로 변경
  UPDATE public.participant_requests rq
  SET status = 'confirmed',
      updated_at = now()
  FROM public.rooming_participants rp
  WHERE rq.participant_id = rp.participant_id
    AND rq.event_id = p_event_id
    AND rq.priority IN (2, 3, 4)
    AND rp.room_type_id IS NOT NULL
    AND rq.status = 'pending';

  RETURN jsonb_build_object(
    'success', TRUE,
    'updated', v_updated_count,
    'event_id', p_event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_update_request_fulfillment TO authenticated;