-- [Phase 73-L.7.31-B] RoleBadge Simplification & Data Cleanup
-- Standardize all role badges to '참석자', '좌장', '연자' only

-- Step 1: Update all variants of '참가자', '패널', '스폰서' to '참석자'
UPDATE participants
SET role_badge = '참석자'
WHERE role_badge IN ('패널', '스폰서', '참가자', 'Panel', 'Sponsor', 'Participant');

UPDATE participants
SET fixed_role = '참석자'
WHERE fixed_role IN ('패널', '스폰서', '참가자', 'Panel', 'Sponsor', 'Participant');

-- Step 2: Ensure default value is '참석자'
ALTER TABLE participants 
ALTER COLUMN role_badge SET DEFAULT '참석자';

ALTER TABLE participants 
ALTER COLUMN fixed_role SET DEFAULT '참석자';

-- Step 3: Add check constraint to enforce only 3 allowed values
ALTER TABLE participants DROP CONSTRAINT IF EXISTS role_badge_check;
ALTER TABLE participants ADD CONSTRAINT role_badge_check 
CHECK (role_badge IN ('참석자', '좌장', '연자'));

ALTER TABLE participants DROP CONSTRAINT IF EXISTS fixed_role_check;
ALTER TABLE participants ADD CONSTRAINT fixed_role_check 
CHECK (fixed_role IN ('참석자', '좌장', '연자'));

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_participants_role_badge ON participants(role_badge);

-- Step 5: Log the migration
COMMENT ON COLUMN participants.role_badge IS 'Allowed values: 참석자, 좌장, 연자 (updated 2025-01-30)';
COMMENT ON COLUMN participants.fixed_role IS 'Allowed values: 참석자, 좌장, 연자 (updated 2025-01-30)';