-- [72-RM.BADGE.HYBRID] Hybrid role badge system with fixed + custom roles

-- 1. Add new columns to participants table
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS fixed_role text,       -- 좌장/연자/참석자 중 하나
ADD COLUMN IF NOT EXISTS custom_role text,      -- 추가 직접입력 뱃지
ADD COLUMN IF NOT EXISTS participant_no int;    -- 참가자 번호

-- 2. Add same columns to rooming_participants table
ALTER TABLE public.rooming_participants
ADD COLUMN IF NOT EXISTS fixed_role text,
ADD COLUMN IF NOT EXISTS custom_role text,
ADD COLUMN IF NOT EXISTS participant_no int;

-- 3. Migrate existing classification data to fixed_role
UPDATE public.participants
SET fixed_role = classification
WHERE fixed_role IS NULL 
  AND classification IN ('좌장', '연자', '참석자');

-- 4. Create sync trigger function (participants → rooming_participants)
CREATE OR REPLACE FUNCTION fn_sync_roles_to_rooming()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rooming_participants
  SET fixed_role = NEW.fixed_role,
      custom_role = NEW.custom_role,
      participant_no = NEW.participant_no
  WHERE participant_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_sync_roles_to_rooming ON public.participants;
CREATE TRIGGER trg_sync_roles_to_rooming
AFTER UPDATE OF fixed_role, custom_role, participant_no ON public.participants
FOR EACH ROW
EXECUTE FUNCTION fn_sync_roles_to_rooming();

-- 6. Create function to auto-assign participant numbers on insert
CREATE OR REPLACE FUNCTION fn_auto_participant_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.participant_no IS NULL THEN
    SELECT COALESCE(MAX(participant_no), 0) + 1
    INTO NEW.participant_no
    FROM public.participants
    WHERE event_id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for auto participant number
DROP TRIGGER IF EXISTS trg_auto_participant_no ON public.participants;
CREATE TRIGGER trg_auto_participant_no
BEFORE INSERT ON public.participants
FOR EACH ROW
EXECUTE FUNCTION fn_auto_participant_no();

-- 8. Backfill participant numbers for existing records
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at) as row_num
  FROM public.participants
  WHERE participant_no IS NULL
)
UPDATE public.participants p
SET participant_no = n.row_num
FROM numbered n
WHERE p.id = n.id;