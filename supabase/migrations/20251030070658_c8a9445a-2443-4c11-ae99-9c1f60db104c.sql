-- Phase 73-L.7.2: Room Assignment Trigger - Schema Alignment Fix
-- Fix rooming_participants insert to match actual table schema (room_type TEXT, not room_id UUID)

DROP FUNCTION IF EXISTS public.assign_room_based_on_participant() CASCADE;

CREATE FUNCTION public.assign_room_based_on_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID := NEW.event_id;
  v_participant_id UUID := NEW.id;
  v_room_type_name TEXT;
  v_credit INT := 0;
BEGIN
  -- 1. Find available room type
  SELECT 
    t.type_name,
    t.default_credit
  INTO 
    v_room_type_name,
    v_credit
  FROM public.event_room_refs r
  JOIN public.room_types t ON r.room_type_id = t.id
  WHERE r.event_id = v_event_id
    AND r.is_active IS TRUE
    AND COALESCE(r.stock, 0) > 0
  ORDER BY t.default_credit DESC
  LIMIT 1;

  IF v_room_type_name IS NULL THEN
    -- No available rooms
    RETURN NEW;
  END IF;

  -- 2. Create rooming_participants record (matches actual schema)
  INSERT INTO public.rooming_participants(
    event_id,
    participant_id,
    room_type,
    room_credit,
    assigned_at,
    status
  ) VALUES (
    v_event_id,
    v_participant_id,
    v_room_type_name,
    COALESCE(v_credit, 0),
    NOW(),
    '배정완료'
  )
  ON CONFLICT (event_id, participant_id) DO NOTHING;

  -- 3. Decrease stock
  UPDATE public.event_room_refs r
  SET stock = stock - 1
  FROM public.room_types t
  WHERE r.room_type_id = t.id
    AND t.type_name = v_room_type_name
    AND r.event_id = v_event_id
    AND r.stock > 0;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_assign_room ON public.participants;
CREATE TRIGGER trg_assign_room
AFTER INSERT ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.assign_room_based_on_participant();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.assign_room_based_on_participant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_room_based_on_participant() TO service_role;