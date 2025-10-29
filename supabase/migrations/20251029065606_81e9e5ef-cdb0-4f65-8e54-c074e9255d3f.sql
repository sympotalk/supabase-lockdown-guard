-- [Phase 72–RM.BADGE.SYNC.RENUM] Auto-reorder participant numbers based on role priority

-- 1. Create reordering function
CREATE OR REPLACE FUNCTION public.reorder_participant_numbers(p_event uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  idx int := 0;
  rec RECORD;
BEGIN
  -- 좌장 우선 (chairperson first)
  FOR rec IN
    SELECT id FROM participants
    WHERE event_id = p_event AND fixed_role = '좌장' AND is_active = true
    ORDER BY name
  LOOP
    idx := idx + 1;
    UPDATE participants SET participant_no = idx WHERE id = rec.id;
  END LOOP;

  -- 연자 그다음 (speakers next)
  FOR rec IN
    SELECT id FROM participants
    WHERE event_id = p_event AND fixed_role = '연자' AND is_active = true
    ORDER BY name
  LOOP
    idx := idx + 1;
    UPDATE participants SET participant_no = idx WHERE id = rec.id;
  END LOOP;

  -- 나머지(참석자 등)는 가나다순 (others alphabetically)
  FOR rec IN
    SELECT id FROM participants
    WHERE event_id = p_event
      AND is_active = true
      AND (fixed_role IS NULL OR fixed_role NOT IN ('좌장','연자'))
    ORDER BY name
  LOOP
    idx := idx + 1;
    UPDATE participants SET participant_no = idx WHERE id = rec.id;
  END LOOP;
END;
$$;

-- 2. Create trigger function for role changes
CREATE OR REPLACE FUNCTION public.trg_reorder_on_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only reorder if fixed_role actually changed
  IF OLD.fixed_role IS DISTINCT FROM NEW.fixed_role THEN
    PERFORM reorder_participant_numbers(NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_reorder_on_role_change ON public.participants;

CREATE TRIGGER trg_reorder_on_role_change
AFTER UPDATE OF fixed_role ON public.participants
FOR EACH ROW
EXECUTE FUNCTION trg_reorder_on_role_change();

-- 4. Sync role changes to rooming_participants (update existing trigger)
CREATE OR REPLACE FUNCTION fn_sync_roles_to_rooming()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rooming_participants
  SET 
    fixed_role = NEW.fixed_role,
    custom_role = NEW.custom_role,
    participant_no = NEW.participant_no,
    updated_at = now()
  WHERE participant_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_roles_to_rooming ON public.participants;

CREATE TRIGGER trg_sync_roles_to_rooming
AFTER UPDATE OF fixed_role, custom_role, participant_no ON public.participants
FOR EACH ROW
EXECUTE FUNCTION fn_sync_roles_to_rooming();