-- [72-RULE.R2] Add manual assignment tracking and refresh function

-- Add manual_assigned field to rooming_participants
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooming_participants' AND column_name = 'manual_assigned'
  ) THEN
    ALTER TABLE rooming_participants ADD COLUMN manual_assigned BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create function to refresh all rooming assignments for an event
CREATE OR REPLACE FUNCTION refresh_rooming_assignments(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Re-trigger assignment for all participants in the event
  UPDATE participants
  SET updated_at = now()
  WHERE event_id = p_event_id
    AND is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM rooming_participants rp
      WHERE rp.participant_id = participants.id
        AND rp.manual_assigned = true
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'refreshed', v_count,
    'event_id', p_event_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to respect manual assignments
CREATE OR REPLACE FUNCTION assign_room_based_on_participant()
RETURNS TRIGGER AS $$
DECLARE
  v_rule RECORD;
  v_room_type TEXT;
  v_room_credit NUMERIC;
  v_adult INTEGER;
  v_child INTEGER;
  v_infant INTEGER;
  v_manual_assigned BOOLEAN;
BEGIN
  -- Skip if event_id is missing
  IF NEW.event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this participant has manual assignment
  SELECT manual_assigned INTO v_manual_assigned
  FROM rooming_participants
  WHERE participant_id = NEW.id
    AND event_id = NEW.event_id;

  -- Skip auto-assignment if manually assigned
  IF v_manual_assigned = true THEN
    RETURN NEW;
  END IF;

  -- Parse participant composition
  v_adult := COALESCE((NEW.composition->>'adult')::INTEGER, 1);
  v_child := COALESCE((NEW.composition->>'child')::INTEGER, 0);
  v_infant := COALESCE((NEW.composition->>'infant')::INTEGER, 0);

  -- Check for preferred room type first
  IF NEW.room_preference IS NOT NULL AND NEW.room_preference != '' THEN
    v_room_type := NEW.room_preference;
  ELSE
    -- Find matching rule with highest priority
    SELECT preferred_room_type INTO v_room_type
    FROM rooming_rules
    WHERE event_id = NEW.event_id
      AND is_active = true
      AND v_adult >= min_adult AND v_adult <= max_adult
      AND v_child >= min_child AND v_child <= max_child
    ORDER BY priority DESC, (max_adult - min_adult) ASC, (max_child - min_child) ASC
    LIMIT 1;
  END IF;

  -- Get room credit from event_rooms
  IF v_room_type IS NOT NULL THEN
    SELECT room_credit INTO v_room_credit
    FROM event_rooms
    WHERE event_id = NEW.event_id
      AND room_name = v_room_type
      AND is_active = true
    LIMIT 1;

    -- Insert or update rooming_participants
    INSERT INTO rooming_participants (
      event_id,
      participant_id,
      room_type,
      room_credit,
      assigned_at,
      agency_id,
      manual_assigned
    ) VALUES (
      NEW.event_id,
      NEW.id,
      v_room_type,
      COALESCE(v_room_credit, 0),
      now(),
      NEW.agency_id,
      false
    )
    ON CONFLICT (participant_id, event_id)
    DO UPDATE SET
      room_type = v_room_type,
      room_credit = COALESCE(v_room_credit, 0),
      assigned_at = now(),
      updated_at = now()
    WHERE rooming_participants.manual_assigned = false;
  ELSE
    -- No matching rule, mark as pending
    INSERT INTO rooming_participants (
      event_id,
      participant_id,
      room_type,
      room_credit,
      assigned_at,
      agency_id,
      manual_assigned
    ) VALUES (
      NEW.event_id,
      NEW.id,
      '배정대기',
      0,
      now(),
      NEW.agency_id,
      false
    )
    ON CONFLICT (participant_id, event_id)
    DO UPDATE SET
      room_type = '배정대기',
      room_credit = 0,
      assigned_at = now(),
      updated_at = now()
    WHERE rooming_participants.manual_assigned = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_assign_room ON participants;
CREATE TRIGGER trg_assign_room
  AFTER INSERT OR UPDATE OF composition, room_preference ON participants
  FOR EACH ROW
  EXECUTE FUNCTION assign_room_based_on_participant();

-- Reload schema
NOTIFY pgrst, 'reload schema';