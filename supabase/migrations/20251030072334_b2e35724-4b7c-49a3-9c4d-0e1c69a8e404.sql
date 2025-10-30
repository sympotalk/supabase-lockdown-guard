-- Phase 73-L.7.3: Rooming Enum & Workflow Alignment Fix

-- Step 1: Add '배정완료' to rooming_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = '배정완료'
    AND enumtypid = 'public.rooming_status'::regtype
  ) THEN
    ALTER TYPE public.rooming_status ADD VALUE '배정완료';
  END IF;
END $$;

-- Step 2: Set default status to '대기'
ALTER TABLE public.rooming_participants
ALTER COLUMN status SET DEFAULT '대기';

-- Step 3: Update trigger function to use default status
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
    RETURN NEW; -- No available rooms
  END IF;

  -- 2. Create rooming_participants record (status uses default)
  INSERT INTO public.rooming_participants(
    event_id,
    participant_id,
    room_type,
    room_credit,
    assigned_at
  ) VALUES (
    v_event_id,
    v_participant_id,
    v_room_type_name,
    COALESCE(v_credit, 0),
    NOW()
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

-- Step 4: Create batch assignment RPC
CREATE OR REPLACE FUNCTION public.rooming_auto_assign(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE public.rooming_participants
  SET status = '배정완료'
  WHERE event_id = p_event_id
    AND status = '대기'
    AND room_type IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'updated_count', v_updated_count,
    'event_id', p_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rooming_auto_assign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rooming_auto_assign(uuid) TO service_role;