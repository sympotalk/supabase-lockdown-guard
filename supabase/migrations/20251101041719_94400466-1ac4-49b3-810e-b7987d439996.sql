-- Phase 77-UF-FIX.7: FK Constraint Deferrable Conversion
-- Purpose: Allow FK validation to be deferred until transaction commit
-- This resolves Replace mode FK violations during DELETE → INSERT sequences

-- Step 1: Drop existing FK constraint
ALTER TABLE public.participants_log
DROP CONSTRAINT IF EXISTS participants_log_participant_id_fkey;

-- Step 2: Recreate with DEFERRABLE INITIALLY DEFERRED
ALTER TABLE public.participants_log
ADD CONSTRAINT participants_log_participant_id_fkey
FOREIGN KEY (participant_id)
REFERENCES public.participants(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Verify the change
DO $$
DECLARE
  v_deferrable BOOLEAN;
  v_deferred BOOLEAN;
BEGIN
  SELECT condeferrable, condeferred INTO v_deferrable, v_deferred
  FROM pg_constraint
  WHERE conrelid = 'public.participants_log'::regclass
    AND conname = 'participants_log_participant_id_fkey';
  
  IF v_deferrable AND v_deferred THEN
    RAISE NOTICE '[77-UF-FIX.7] FK constraint successfully converted to DEFERRABLE INITIALLY DEFERRED';
  ELSE
    RAISE EXCEPTION '[77-UF-FIX.7] FK constraint conversion failed - deferrable:%, deferred:%', v_deferrable, v_deferred;
  END IF;
END $$;