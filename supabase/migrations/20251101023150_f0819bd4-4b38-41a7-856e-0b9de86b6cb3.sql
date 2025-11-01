-- [Phase 77-UF-FIX.5] Trigger FK Safe-Guard 확정 적용
-- Purpose: Add FK existence check to prevent violations during Replace mode

-- 1. Rebuild trigger function with FK safe-guard
CREATE OR REPLACE FUNCTION public.set_participants_log_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_agency_id UUID;
BEGIN
  -- [Phase 77-UF-FIX.5] FK 존재 확인 보호 구문
  -- Skip if participant_id is NULL or participant doesn't exist
  IF NEW.participant_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.participants
    WHERE id = NEW.participant_id
  ) THEN
    RAISE NOTICE '[77-UF-FIX.5] Skipping log context - participant_id: % (NULL or not found)', NEW.participant_id;
    RETURN NEW;
  END IF;

  -- 기존 로직 유지: Get event_id and agency_id from participant
  SELECT event_id, agency_id INTO v_event_id, v_agency_id
  FROM public.participants
  WHERE id = NEW.participant_id;

  -- Set context if found
  IF v_event_id IS NOT NULL THEN
    NEW.event_id := v_event_id;
    NEW.agency_id := v_agency_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Re-register trigger on participants_log table
DROP TRIGGER IF EXISTS trg_set_participants_log_context ON public.participants_log;

CREATE TRIGGER trg_set_participants_log_context
BEFORE INSERT OR UPDATE ON public.participants_log
FOR EACH ROW
EXECUTE FUNCTION public.set_participants_log_context();

-- 3. Verification query
-- QA: Run this to verify trigger is properly registered
-- SELECT 
--   tgname as trigger_name,
--   tgenabled as enabled,
--   pg_get_triggerdef(oid) as definition
-- FROM pg_trigger
-- WHERE tgrelid = 'public.participants_log'::regclass
-- AND tgname = 'trg_set_participants_log_context';

COMMENT ON FUNCTION public.set_participants_log_context() IS 
  '[Phase 77-UF-FIX.5] FK safe-guard: Prevents FK violations during Replace mode by checking participant existence before setting context';

COMMENT ON TRIGGER trg_set_participants_log_context ON public.participants_log IS 
  '[Phase 77-UF-FIX.5] Automatically sets event_id and agency_id from participant, with FK existence check';