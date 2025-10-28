-- [72-RULE.R1.FIX.2] Trigger initial room assignments for existing participants

-- Create a function to initialize rooming for existing participants
CREATE OR REPLACE FUNCTION initialize_rooming_for_event(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Update all participants to trigger the assignment
  UPDATE participants
  SET updated_at = now()
  WHERE event_id = p_event_id
    AND is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM rooming_participants rp
      WHERE rp.participant_id = participants.id
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'initialized', v_count,
    'event_id', p_event_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize rooming for the current event
SELECT initialize_rooming_for_event('da4a5d5e-f469-4f96-a389-36f0a54e29d6');

-- Reload schema
NOTIFY pgrst, 'reload schema';