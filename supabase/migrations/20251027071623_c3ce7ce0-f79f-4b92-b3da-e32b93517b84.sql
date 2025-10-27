-- Add child_ages column to participants table
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS child_ages text[] DEFAULT '{}';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_child_ages ON participants USING GIN(child_ages);

-- Add comment
COMMENT ON COLUMN participants.child_ages IS 'Array of child ages (e.g., {"4세", "6세"})';
