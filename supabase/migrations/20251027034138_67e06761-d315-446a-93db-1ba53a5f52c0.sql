-- [71-J.1] Add new columns to participants table

-- Add new columns to participants table
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS stay_status text,
  ADD COLUMN IF NOT EXISTS companion text,
  ADD COLUMN IF NOT EXISTS recruitment_status text,
  ADD COLUMN IF NOT EXISTS message_sent text,
  ADD COLUMN IF NOT EXISTS survey_completed text,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;

-- Add foreign key constraint separately
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participants_last_edited_by_fkey'
  ) THEN
    ALTER TABLE participants
      ADD CONSTRAINT participants_last_edited_by_fkey
      FOREIGN KEY (last_edited_by) REFERENCES profiles(id);
  END IF;
END $$;

COMMENT ON COLUMN participants.classification IS '[71-J.1] 구분 field';
COMMENT ON COLUMN participants.stay_status IS '[71-J.1] 숙박 현황 field';
COMMENT ON COLUMN participants.companion IS '[71-J.1] 동반인 field';
COMMENT ON COLUMN participants.recruitment_status IS '[71-J.1] 모객 status';
COMMENT ON COLUMN participants.message_sent IS '[71-J.1] 문자 status';
COMMENT ON COLUMN participants.survey_completed IS '[71-J.1] 설문 status';