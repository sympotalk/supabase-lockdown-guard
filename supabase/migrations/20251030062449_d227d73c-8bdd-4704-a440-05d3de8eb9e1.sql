-- [Phase 73-L.7] Room Credit Logic Rebuild

-- 1️⃣ 기존 트리거 함수 삭제 및 재생성
DROP FUNCTION IF EXISTS public.assign_room_based_on_participant() CASCADE;

CREATE FUNCTION public.assign_room_based_on_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID := NEW.event_id;
  v_participant_id UUID := NEW.id;
  v_room_id UUID;
  v_credit INT := 0;
BEGIN
  -- 1. 가용 객실 탐색 (event_room_refs → room_types 순서)
  SELECT r.id
  INTO v_room_id
  FROM public.event_room_refs r
  JOIN public.room_types t ON r.room_type = t.code
  WHERE r.event_id = v_event_id
    AND r.is_active IS TRUE
    AND COALESCE(r.assigned_count, 0) < COALESCE(r.capacity, 0)
  ORDER BY r.priority, t.credit_value DESC
  LIMIT 1;

  IF v_room_id IS NULL THEN
    -- 가용 객실 없음 → 로그 기록
    INSERT INTO public.rooming_logs(event_id, participant_id, message, created_at)
    VALUES (v_event_id, v_participant_id, '배정 가능한 객실이 없습니다.', NOW());
    RETURN NEW;
  END IF;

  -- 2. 룸 크레딧 계산 (기준 room_types)
  SELECT t.credit_value
  INTO v_credit
  FROM public.room_types t
  JOIN public.event_room_refs r ON r.room_type = t.code
  WHERE r.id = v_room_id;

  -- 3. rooming_participants 레코드 생성
  INSERT INTO public.rooming_participants(
    event_id,
    participant_id,
    room_id,
    room_credit,
    assigned_by,
    assigned_at
  ) VALUES (
    v_event_id,
    v_participant_id,
    v_room_id,
    v_credit,
    auth.uid(),
    NOW()
  );

  -- 4. event_room_refs 배정 수 갱신
  UPDATE public.event_room_refs
  SET assigned_count = COALESCE(assigned_count, 0) + 1
  WHERE id = v_room_id;

  RETURN NEW;
END;
$$;

-- 2️⃣ 트리거 재생성 (참가자 삽입 시 자동 배정)
DROP TRIGGER IF EXISTS trg_assign_room ON public.participants;

CREATE TRIGGER trg_assign_room
AFTER INSERT ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.assign_room_based_on_participant();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.assign_room_based_on_participant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_room_based_on_participant() TO service_role;