-- [71-J.1] Clean and recreate participants_log table

-- Drop existing table if it exists
DROP TABLE IF EXISTS participants_log CASCADE;

-- Create participants_log table fresh
CREATE TABLE participants_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  action text NOT NULL,
  changed_fields jsonb,
  memo_diff text,
  edited_by uuid REFERENCES profiles(id),
  edited_at timestamptz DEFAULT timezone('utc', now()),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_participants_log_participant ON participants_log(participant_id);
CREATE INDEX idx_participants_log_edited_at ON participants_log(edited_at DESC);

-- Enable RLS
ALTER TABLE participants_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Masters can view all participant logs"
  ON participants_log FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Agency users can view their participant logs"
  ON participants_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN user_roles ur ON ur.agency_id = p.agency_id
      WHERE p.id = participants_log.participant_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert participant logs"
  ON participants_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON participants_log TO authenticated;
GRANT ALL ON participants_log TO service_role;

COMMENT ON TABLE participants_log IS '[71-J.1] Participant change log table';