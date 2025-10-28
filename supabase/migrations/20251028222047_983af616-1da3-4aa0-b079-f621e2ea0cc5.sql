-- [72-RULE.R2.FIX.REINIT] Re-initialize rooming assignments with proper data

-- First, ensure composition field has default values for all participants
UPDATE participants
SET composition = jsonb_build_object(
  'adult', 1,
  'child', 0,
  'infant', 0
)
WHERE event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6'
  AND composition IS NULL;

-- Now trigger the room assignment for all participants
SELECT initialize_rooming_for_event('da4a5d5e-f469-4f96-a389-36f0a54e29d6');

-- Verify the data was created
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM rooming_participants
  WHERE event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6';
  
  RAISE NOTICE 'Rooming participants created: %', v_count;
END $$;