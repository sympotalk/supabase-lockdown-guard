-- [72-RULE.R2.FIX.DEBUG] Create debug function to check data visibility

CREATE OR REPLACE FUNCTION debug_rooming_data(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total INTEGER;
  v_with_rls INTEGER;
  v_sample JSONB;
BEGIN
  -- Count total without RLS
  SELECT COUNT(*) INTO v_total
  FROM rooming_participants
  WHERE event_id = p_event_id;
  
  -- Get sample data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'participant_id', participant_id,
      'room_type', room_type,
      'manual_assigned', manual_assigned
    )
  ) INTO v_sample
  FROM rooming_participants
  WHERE event_id = p_event_id
  LIMIT 3;
  
  RETURN jsonb_build_object(
    'total_records', v_total,
    'sample_data', v_sample,
    'event_id', p_event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the debug function
SELECT debug_rooming_data('da4a5d5e-f469-4f96-a389-36f0a54e29d6');