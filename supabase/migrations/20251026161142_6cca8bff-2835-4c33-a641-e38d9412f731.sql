-- [71-H4.FORM.INTEGRATION] Update event statistics to use correct tables

DROP FUNCTION IF EXISTS fn_event_statistics(uuid);

CREATE OR REPLACE FUNCTION fn_event_statistics(p_agency_id uuid)
RETURNS TABLE (
  event_id uuid,
  participant_count bigint,
  rooming_rate numeric,
  form_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    COALESCE(COUNT(DISTINCT p.id), 0) AS participant_count,
    CASE 
      WHEN COUNT(DISTINCT p.id) > 0 
      THEN ROUND((COUNT(DISTINCT rp.participant_id)::numeric / COUNT(DISTINCT p.id)::numeric) * 100, 1)
      ELSE 0
    END AS rooming_rate,
    CASE 
      WHEN COUNT(DISTINCT p.id) > 0 
      THEN ROUND((COUNT(DISTINCT fr.participant_id)::numeric / COUNT(DISTINCT p.id)::numeric) * 100, 1)
      ELSE 0
    END AS form_rate
  FROM events e
  LEFT JOIN participants p ON p.event_id = e.id AND p.is_active = true
  LEFT JOIN rooming_participants rp ON rp.event_id = e.id AND rp.participant_id = p.id AND rp.is_active = true
  LEFT JOIN form_responses fr ON fr.event_id = e.id AND fr.participant_id = p.id AND fr.is_active = true
  WHERE e.agency_id = p_agency_id AND e.is_active = true
  GROUP BY e.id;
END;
$$;