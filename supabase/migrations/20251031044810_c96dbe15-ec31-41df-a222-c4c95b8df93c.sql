-- Phase 75-A: Critical Participants Stability Patches
-- 1) Add participants tables to realtime publication
-- 2) Clean duplicate records and add unique constraint

-- [75-A.1] Enable realtime for participants tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants_log;

ALTER TABLE public.participants REPLICA IDENTITY FULL;
ALTER TABLE public.participants_log REPLICA IDENTITY FULL;

-- [75-A.2] Remove duplicate records and enforce unique constraint
-- Step 1: Keep only latest record per (event_id, phone), delete rest
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_id, phone
      ORDER BY COALESCE(updated_at, created_at) DESC
    ) AS rn
  FROM public.participants
  WHERE phone IS NOT NULL
)
DELETE FROM public.participants p
USING ranked r
WHERE p.id = r.id AND r.rn > 1;

-- Step 2: Add unique constraint (event_id, phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_participants_event_phone'
  ) THEN
    ALTER TABLE public.participants
    ADD CONSTRAINT uq_participants_event_phone UNIQUE (event_id, phone);
  END IF;
END $$;

-- Step 3: Performance index for upload/query
CREATE INDEX IF NOT EXISTS idx_participants_event_phone ON public.participants(event_id, phone);