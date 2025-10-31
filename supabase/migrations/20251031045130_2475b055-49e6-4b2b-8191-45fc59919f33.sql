-- Phase 75-B.2 & 75-B.3: participants_log Timestamp Standardization + Auto-logging Trigger
-- Goal: Add created_at, create indexes, and implement automatic change tracking

-- [75-B.2] Add created_at timestamp if not exists
ALTER TABLE public.participants_log
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- [75-B.2] Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_log_created
  ON public.participants_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_log_action
  ON public.participants_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_log_session
  ON public.participants_log(upload_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_log_participant
  ON public.participants_log(participant_id, created_at DESC);

-- [75-B.3] Create automatic change logging trigger function
CREATE OR REPLACE FUNCTION public.trg_log_participant_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Safely get user ID from JWT claim
  BEGIN
    v_user_id := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    -- Log update with field-level changes
    INSERT INTO public.participants_log (
      participant_id,
      event_id,
      agency_id,
      action,
      metadata,
      upload_session_id,
      edited_by,
      created_at,
      edited_at
    ) VALUES (
      NEW.id,
      NEW.event_id,
      NEW.agency_id,
      'update',
      jsonb_build_object(
        'trigger', 'auto',
        'changed_fields', (
          SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
          FROM (
            SELECT key, 
                   to_jsonb(OLD) -> key AS old_val,
                   to_jsonb(NEW) -> key AS new_val
            FROM jsonb_object_keys(to_jsonb(OLD)) AS key
            WHERE to_jsonb(OLD) -> key IS DISTINCT FROM to_jsonb(NEW) -> key
          ) changes
        ),
        'updated_at', NEW.updated_at
      ),
      NULL,
      v_user_id::uuid,
      now(),
      now()
    );
  ELSIF TG_OP = 'DELETE' THEN
    -- Log deletion with full record snapshot
    INSERT INTO public.participants_log (
      participant_id,
      event_id,
      agency_id,
      action,
      metadata,
      upload_session_id,
      edited_by,
      created_at,
      edited_at
    ) VALUES (
      OLD.id,
      OLD.event_id,
      OLD.agency_id,
      'delete',
      jsonb_build_object(
        'trigger', 'auto',
        'deleted_record', to_jsonb(OLD),
        'deleted_at', now()
      ),
      NULL,
      v_user_id::uuid,
      now(),
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [75-B.3] Create trigger on participants table
DROP TRIGGER IF EXISTS trg_log_participant_change ON public.participants;
CREATE TRIGGER trg_log_participant_change
AFTER UPDATE OR DELETE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.trg_log_participant_change();

-- Comment for documentation
COMMENT ON FUNCTION public.trg_log_participant_change() IS 
'Phase 75-B.3: Automatically logs all UPDATE and DELETE operations on participants table with field-level change tracking';

COMMENT ON TRIGGER trg_log_participant_change ON public.participants IS 
'Phase 75-B.3: Captures all participant modifications for audit trail and change history';