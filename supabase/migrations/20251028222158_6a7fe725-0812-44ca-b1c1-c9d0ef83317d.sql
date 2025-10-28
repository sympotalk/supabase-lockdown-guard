-- [72-RULE.R2.FIX.FINAL] Add unique constraint and insert data

-- Add unique constraint
ALTER TABLE rooming_participants
DROP CONSTRAINT IF EXISTS rooming_participants_unique_participant_event;

ALTER TABLE rooming_participants
ADD CONSTRAINT rooming_participants_unique_participant_event
UNIQUE (participant_id, event_id);

-- Insert rooming data
INSERT INTO rooming_participants (
  event_id,
  participant_id,
  room_type,
  room_credit,
  assigned_at,
  agency_id,
  manual_assigned
)
SELECT 
  p.event_id,
  p.id,
  '배정대기',
  0,
  now(),
  p.agency_id,
  false
FROM participants p
WHERE p.event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
  AND p.is_active = true
ON CONFLICT (participant_id, event_id) DO NOTHING;

-- Reload schema
NOTIFY pgrst, 'reload schema';