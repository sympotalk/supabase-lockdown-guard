-- Phase 73-L.7.1: Room Assignment Trigger Schema Fix

-- Drop existing function
DROP FUNCTION IF EXISTS public.assign_room_based_on_participant() CASCADE;

-- Recreate function with correct column names
CREATE FUNCTION public.assign_room_based_on_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID := NEW.event_id;
  v_participant_id UUID := NEW.id;
  v_room_ref_id UUID;
  v_room_type_id UUID;
  v_credit INT := 0;
BEGIN
  -- 1. Find available room (using room_type_id and stock)
  SELECT 
    r.id,
    r.room_type_id
  INTO 
    v_room_ref_id,
    v_room_type_id
  FROM public.event_room_refs r
  JOIN public.room_types t ON r.room_type_id = t.id
  WHERE r.event_id = v_event_id
    AND r.is_active IS TRUE
    AND COALESCE(r.stock, 0) > 0
  ORDER BY t.default_credit DESC
  LIMIT 1;

  IF v_room_ref_id IS NULL THEN
    -- No available rooms
    RETURN NEW;
  END IF;

  -- 2. Get room credit from room_types
  SELECT default_credit
  INTO v_credit
  FROM public.room_types
  WHERE id = v_room_type_id;

  -- 3. Create rooming_participants record
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
    v_room_ref_id,
    COALESCE(v_credit, 0),
    auth.uid(),
    NOW()
  )
  ON CONFLICT (event_id, participant_id) DO NOTHING;

  -- 4. Decrease stock
  UPDATE public.event_room_refs
  SET stock = stock - 1
  WHERE id = v_room_ref_id AND stock > 0;

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