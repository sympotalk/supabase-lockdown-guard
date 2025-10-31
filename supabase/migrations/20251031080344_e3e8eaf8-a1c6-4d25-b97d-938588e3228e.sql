-- [Phase 77-FULL-RECOVERY] Fix participants_log schema and rooming_status enum usage

-- 1️⃣ Add missing columns to participants_log
ALTER TABLE public.participants_log 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_participants_log_event_id ON public.participants_log(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_log_agency_id ON public.participants_log(agency_id);

-- Update existing logs with event_id and agency_id from participants
UPDATE public.participants_log pl
SET 
  event_id = p.event_id,
  agency_id = p.agency_id
FROM public.participants p
WHERE pl.participant_id = p.id
  AND pl.event_id IS NULL;

-- Add trigger to auto-populate event_id and agency_id
CREATE OR REPLACE FUNCTION public.set_participants_log_context()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_id IS NULL OR NEW.agency_id IS NULL THEN
    SELECT event_id, agency_id INTO NEW.event_id, NEW.agency_id
    FROM public.participants
    WHERE id = NEW.participant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_participants_log_context ON public.participants_log;
CREATE TRIGGER trg_set_participants_log_context
  BEFORE INSERT ON public.participants_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_participants_log_context();

-- 2️⃣ Fix ai_rooming_stats to use correct enum value
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

  -- 배정 대기 인원 (Fix: use '대기' instead of '배정대기')
  SELECT COUNT(*) INTO v_pending
  FROM public.rooming_participants
  WHERE event_id = p_event_id
    AND (room_type_id IS NULL OR status = '대기')
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

-- 3️⃣ Update rooming_participants initialization function
CREATE OR REPLACE FUNCTION public.init_rooming_for_event(p_event UUID)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
BEGIN
  INSERT INTO public.rooming_participants (
    event_id,
    participant_id,
    agency_id,
    adults,
    children,
    infants,
    room_type,
    room_credit,
    status,
    updated_at
  )
  SELECT
    p.event_id, 
    p.id,
    p.agency_id,
    COALESCE((p.composition->>'adult')::int, 1),
    COALESCE((p.composition->>'child')::int, 0),
    COALESCE((p.composition->>'infant')::int, 0),
    COALESCE(NULLIF(p.room_preference, ''), '미지정'),
    0,
    '대기'::rooming_status,
    now()
  FROM public.participants p
  WHERE p.event_id = p_event
    AND p.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.rooming_participants rp
      WHERE rp.event_id = p.event_id AND rp.participant_id = p.id
    )
  ON CONFLICT (event_id, participant_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ai_rooming_stats IS '[Phase 77-RECOVERY] Fixed enum value from 배정대기 to 대기';
COMMENT ON COLUMN public.participants_log.event_id IS '[Phase 77-RECOVERY] Added for filtering logs by event';
COMMENT ON COLUMN public.participants_log.agency_id IS '[Phase 77-RECOVERY] Added for filtering logs by agency';