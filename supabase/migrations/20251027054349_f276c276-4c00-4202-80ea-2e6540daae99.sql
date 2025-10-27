-- Add adult/child count and age fields to participants
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS adult_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS child_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS child_age text,
ADD COLUMN IF NOT EXISTS companion_memo text;