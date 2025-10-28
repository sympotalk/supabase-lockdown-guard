-- [72-RULE.R1.FIX.1] Restore rooming_participants schema

-- Add missing columns to rooming_participants
ALTER TABLE rooming_participants
ADD COLUMN IF NOT EXISTS room_credit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS manual_assigned BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_rooming_participants_event_participant 
ON rooming_participants(event_id, participant_id);

CREATE INDEX IF NOT EXISTS idx_rooming_participants_manual 
ON rooming_participants(event_id, manual_assigned);

-- Reload schema
NOTIFY pgrst, 'reload schema';