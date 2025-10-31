-- [74-B.0-FIX.18.R1] Fix profile_update type case mismatch

-- Drop existing check constraint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_type_check;

-- Add new check constraint with lowercase 'profile_update' for consistency
ALTER TABLE activity_logs 
ADD CONSTRAINT activity_logs_type_check 
CHECK (type = ANY (ARRAY[
  'upload'::text, 
  'rooming'::text, 
  'message'::text, 
  'form'::text, 
  'system'::text, 
  'announcement'::text,
  'profile_update'::text
]));