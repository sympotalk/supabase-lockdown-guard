-- [Phase 91-HOTFIX] Fix Excel Upload Conflict - Change unique constraint and trigger

-- 1️⃣ Drop old unique constraint (event_id, name, phone)
ALTER TABLE participants DROP CONSTRAINT IF EXISTS uq_participants_event_name_phone;

-- 2️⃣ Create new unique constraint (event_id, phone)
-- This allows duplicate names as long as phone is different
CREATE UNIQUE INDEX IF NOT EXISTS uq_participants_event_phone 
ON participants(event_id, phone) 
WHERE is_active = true AND phone IS NOT NULL AND phone != '';

-- 3️⃣ Fix participants_log trigger to prevent conflict loop
CREATE OR REPLACE FUNCTION log_participant_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- For UPDATE operations, just log and return
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO participants_log (
      participant_id,
      event_id,
      agency_id,
      action,
      old_data,
      new_data,
      created_by
    ) VALUES (
      NEW.id,
      NEW.event_id,
      NEW.agency_id,
      'update',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;

  -- For INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO participants_log (
      participant_id,
      event_id,
      agency_id,
      action,
      new_data,
      created_by
    ) VALUES (
      NEW.id,
      NEW.event_id,
      NEW.agency_id,
      'insert',
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;

  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO participants_log (
      participant_id,
      event_id,
      agency_id,
      action,
      old_data,
      created_by
    ) VALUES (
      OLD.id,
      OLD.event_id,
      OLD.agency_id,
      'delete',
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_log_participant_changes ON participants;
CREATE TRIGGER trg_log_participant_changes
  AFTER INSERT OR UPDATE OR DELETE ON participants
  FOR EACH ROW EXECUTE FUNCTION log_participant_changes();