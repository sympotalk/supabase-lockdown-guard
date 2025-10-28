-- [72-FIX.RELATIONSHIP.R1] Add foreign key relationship between rooming_participants and participants

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_rooming_participants_participant'
  ) THEN
    ALTER TABLE rooming_participants
    ADD CONSTRAINT fk_rooming_participants_participant
    FOREIGN KEY (participant_id)
    REFERENCES participants (id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';