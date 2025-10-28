-- [72-RULE.R2.FIX.CONTEXT] Add RLS policies for rooming_participants

-- Enable RLS if not already enabled
ALTER TABLE rooming_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "rooming_participants_select" ON rooming_participants;
DROP POLICY IF EXISTS "rooming_participants_modify" ON rooming_participants;

-- Create comprehensive SELECT policy
CREATE POLICY "rooming_participants_select" ON rooming_participants
  FOR SELECT USING (
    -- Masters can see all
    has_role(auth.uid(), 'master'::app_role)
    OR
    -- Agency members can see their agency's data
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN events e ON e.agency_id = ur.agency_id
      WHERE e.id = rooming_participants.event_id
        AND ur.user_id = auth.uid()
    )
  );

-- Create comprehensive INSERT/UPDATE/DELETE policy
CREATE POLICY "rooming_participants_modify" ON rooming_participants
  FOR ALL USING (
    -- Masters can modify all
    has_role(auth.uid(), 'master'::app_role)
    OR
    -- Agency members can modify their agency's data
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN events e ON e.agency_id = ur.agency_id
      WHERE e.id = rooming_participants.event_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'master'::app_role)
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN events e ON e.agency_id = ur.agency_id
      WHERE e.id = rooming_participants.event_id
        AND ur.user_id = auth.uid()
    )
  );

-- Verify foreign key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rooming_participants_participant_id_fkey'
  ) THEN
    ALTER TABLE rooming_participants
    ADD CONSTRAINT rooming_participants_participant_id_fkey
    FOREIGN KEY (participant_id)
    REFERENCES participants(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Reload schema
NOTIFY pgrst, 'reload schema';