-- Fix fn_healthcheck_all to avoid GROUP BY issues
CREATE OR REPLACE FUNCTION fn_healthcheck_all()
RETURNS jsonb AS $$
DECLARE
  func_summary jsonb;
  rt_summary jsonb;
BEGIN
  -- Get functions health without GROUP BY issues
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO func_summary
  FROM (
    SELECT 
      function_name,
      status,
      latency_ms,
      last_checked,
      error_message
    FROM functions_health
    WHERE last_checked > now() - interval '1 hour'
    ORDER BY last_checked DESC
  ) t;

  -- Get realtime health without GROUP BY issues
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO rt_summary
  FROM (
    SELECT 
      channel_name,
      is_connected,
      last_event,
      message_count,
      error_message
    FROM realtime_health
    WHERE last_event > now() - interval '1 hour'
    ORDER BY last_event DESC
  ) t;

  RETURN jsonb_build_object(
    'functions', func_summary,
    'realtime', rt_summary,
    'checked_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;