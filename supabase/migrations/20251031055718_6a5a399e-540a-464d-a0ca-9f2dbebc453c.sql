-- Phase 76-F.DB-Fix: Rooming participants schema correction

-- 1. Add room_type_id column to rooming_participants
ALTER TABLE public.rooming_participants
  ADD COLUMN IF NOT EXISTS room_type_id uuid;

-- 2. Rename room_type to room_status (if room_type exists and room_status doesn't)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rooming_participants' AND column_name='room_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rooming_participants' AND column_name='room_status'
  ) THEN
    ALTER TABLE public.rooming_participants RENAME COLUMN room_type TO room_status;
  END IF;
END$$;

-- 3. Create index on room_type_id
CREATE INDEX IF NOT EXISTS idx_rooming_participants_room_type_id 
  ON public.rooming_participants(room_type_id);

-- 4. Convert credit fields to integer (event_room_refs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' 
    AND table_name='event_room_refs' 
    AND column_name='credit'
    AND data_type != 'integer'
  ) THEN
    ALTER TABLE public.event_room_refs
      ALTER COLUMN credit TYPE integer USING NULLIF(credit, '')::integer;
  END IF;
END$$;

-- 5. Convert room_credit to integer in rooming_participants
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' 
    AND table_name='rooming_participants' 
    AND column_name='room_credit'
    AND data_type != 'integer'
  ) THEN
    ALTER TABLE public.rooming_participants
      ALTER COLUMN room_credit TYPE integer USING COALESCE(NULLIF(room_credit, '')::integer, 0);
  END IF;
END$$;

-- 6. Ensure event_room_refs has room_type_id
ALTER TABLE public.event_room_refs
  ADD COLUMN IF NOT EXISTS room_type_id uuid;

-- 7. Create index on event_room_refs.room_type_id
CREATE INDEX IF NOT EXISTS idx_event_room_refs_room_type_id 
  ON public.event_room_refs(room_type_id);