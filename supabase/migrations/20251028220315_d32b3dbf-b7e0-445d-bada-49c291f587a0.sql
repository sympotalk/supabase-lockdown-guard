-- [72-RULE.R1] Automatic Room Assignment Engine

-- Create rooming_rules table
CREATE TABLE IF NOT EXISTS rooming_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  min_adult INTEGER DEFAULT 0,
  max_adult INTEGER DEFAULT 99,
  min_child INTEGER DEFAULT 0,
  max_child INTEGER DEFAULT 99,
  preferred_room_type TEXT,
  allow_extra_bed BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooming_rules_event ON rooming_rules(event_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rooming_rules_priority ON rooming_rules(event_id, priority DESC) WHERE is_active = true;

-- Enable RLS
ALTER TABLE rooming_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for rooming_rules
CREATE POLICY "rooming_rules_select" ON rooming_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN events e ON e.agency_id = ur.agency_id
      WHERE e.id = rooming_rules.event_id
        AND ur.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY "rooming_rules_modify" ON rooming_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN events e ON e.agency_id = ur.agency_id
      WHERE e.id = rooming_rules.event_id
        AND ur.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'master'::app_role)
  );

-- Add composition and room_preference fields to participants if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'composition'
  ) THEN
    ALTER TABLE participants ADD COLUMN composition JSONB DEFAULT '{"adult":1,"child":0,"infant":0}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'room_preference'
  ) THEN
    ALTER TABLE participants ADD COLUMN room_preference TEXT;
  END IF;
END $$;

-- Create function to assign room based on participant composition
CREATE OR REPLACE FUNCTION assign_room_based_on_participant()
RETURNS TRIGGER AS $$
DECLARE
  v_rule RECORD;
  v_room_type TEXT;
  v_room_credit NUMERIC;
  v_adult INTEGER;
  v_child INTEGER;
  v_infant INTEGER;
BEGIN
  -- Skip if event_id is missing
  IF NEW.event_id IS NULL THEN
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
      agency_id
    ) VALUES (
      NEW.event_id,
      NEW.id,
      v_room_type,
      COALESCE(v_room_credit, 0),
      now(),
      NEW.agency_id
    )
    ON CONFLICT (participant_id, event_id)
    DO UPDATE SET
      room_type = v_room_type,
      room_credit = COALESCE(v_room_credit, 0),
      assigned_at = now(),
      updated_at = now();
    
    -- Log the assignment
    INSERT INTO participants_log (
      participant_id,
      event_id,
      agency_id,
      changed_by,
      action,
      metadata
    ) VALUES (
      NEW.id,
      NEW.event_id,
      NEW.agency_id,
      auth.uid(),
      'auto_room_assignment',
      jsonb_build_object(
        'room_type', v_room_type,
        'room_credit', v_room_credit,
        'composition', NEW.composition,
        'timestamp', now()
      )
    );
  ELSE
    -- No matching rule, mark as pending
    INSERT INTO rooming_participants (
      event_id,
      participant_id,
      room_type,
      room_credit,
      assigned_at,
      agency_id
    ) VALUES (
      NEW.event_id,
      NEW.id,
      '배정대기',
      0,
      now(),
      NEW.agency_id
    )
    ON CONFLICT (participant_id, event_id)
    DO UPDATE SET
      room_type = '배정대기',
      room_credit = 0,
      assigned_at = now(),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on participants
DROP TRIGGER IF EXISTS trg_assign_room ON participants;
CREATE TRIGGER trg_assign_room
  AFTER INSERT OR UPDATE OF composition, room_preference ON participants
  FOR EACH ROW
  EXECUTE FUNCTION assign_room_based_on_participant();

-- Create default rooming rules for common scenarios
-- Rule 1: Single adult -> Single room
INSERT INTO rooming_rules (event_id, min_adult, max_adult, min_child, max_child, preferred_room_type, priority)
SELECT e.id, 1, 1, 0, 0, 'Single', 100
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM rooming_rules WHERE event_id = e.id
)
ON CONFLICT DO NOTHING;

-- Rule 2: 2 adults -> Double/Twin
INSERT INTO rooming_rules (event_id, min_adult, max_adult, min_child, max_child, preferred_room_type, priority)
SELECT e.id, 2, 2, 0, 0, 'Double', 90
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM rooming_rules WHERE event_id = e.id AND min_adult = 2
)
ON CONFLICT DO NOTHING;

-- Rule 3: 2 adults + 1-2 children -> Family room
INSERT INTO rooming_rules (event_id, min_adult, max_adult, min_child, max_child, preferred_room_type, priority, allow_extra_bed)
SELECT e.id, 2, 2, 1, 2, 'Family', 80, true
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM rooming_rules WHERE event_id = e.id AND min_child > 0
)
ON CONFLICT DO NOTHING;

-- Enable realtime for rooming_participants
ALTER PUBLICATION supabase_realtime ADD TABLE rooming_participants;

-- Reload schema
NOTIFY pgrst, 'reload schema';