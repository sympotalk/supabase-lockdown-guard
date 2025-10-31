-- [74-B.0-FIX.18] Extend activity_logs type check to include PROFILE_UPDATE

-- Drop existing check constraint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_type_check;

-- Add new check constraint with PROFILE_UPDATE included
ALTER TABLE activity_logs 
ADD CONSTRAINT activity_logs_type_check 
CHECK (type = ANY (ARRAY[
  'upload'::text, 
  'rooming'::text, 
  'message'::text, 
  'form'::text, 
  'system'::text, 
  'announcement'::text,
  'PROFILE_UPDATE'::text
]));