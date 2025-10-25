-- Add columns to participants_log if they don't exist
ALTER TABLE participants_log 
ADD COLUMN IF NOT EXISTS old_status TEXT,
ADD COLUMN IF NOT EXISTS new_status TEXT,
ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'status_change',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create function to log participant status updates
CREATE OR REPLACE FUNCTION log_participant_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO participants_log (
      participant_id,
      event_id,
      changed_by,
      changed_at,
      old_status,
      new_status,
      action,
      metadata
    )
    VALUES (
      NEW.id,
      NEW.event_id,
      auth.uid(),
      now(),
      OLD.status,
      NEW.status,
      'status_change',
      jsonb_build_object(
        'old_value', OLD.status,
        'new_value', NEW.status,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for participant status changes
DROP TRIGGER IF EXISTS trg_participant_status_update ON participants;

CREATE TRIGGER trg_participant_status_update
AFTER UPDATE OF status ON participants
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_participant_status_update();

-- Enable realtime for participants_log
ALTER TABLE participants_log REPLICA IDENTITY FULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_participants_log_participant_id ON participants_log(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_log_changed_at ON participants_log(changed_at DESC);