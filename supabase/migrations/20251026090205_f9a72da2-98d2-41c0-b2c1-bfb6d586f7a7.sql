-- [71-B.STABLE] Agency Dashboard Core — Progress View & RPC (final)

-- 1. Create event_progress_view (using rooming_participants table)
CREATE OR REPLACE VIEW public.event_progress_view AS
SELECT
  e.id AS event_id,
  e.agency_id,
  e.name,
  e.start_date,
  e.end_date,
  e.status,
  COALESCE(p.participant_count, 0) AS participant_count,
  COALESCE(r.assigned_count, 0) AS assigned_room_count,
  CASE 
    WHEN COALESCE(p.participant_count, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(r.assigned_count, 0)::NUMERIC / COALESCE(p.participant_count, 0)::NUMERIC) * 100, 1)
  END AS rooming_rate,
  100.0 AS participant_rate,
  ROUND(
    (CASE 
      WHEN COALESCE(p.participant_count, 0) = 0 THEN 0
      ELSE (COALESCE(r.assigned_count, 0)::NUMERIC / COALESCE(p.participant_count, 0)::NUMERIC) * 100
    END + 100.0) / 2, 1
  ) AS progress_rate
FROM events e
LEFT JOIN (
  SELECT event_id, COUNT(*) AS participant_count
  FROM participants
  WHERE is_active = true
  GROUP BY event_id
) p ON p.event_id = e.id
LEFT JOIN (
  SELECT event_id, COUNT(DISTINCT participant_id) AS assigned_count
  FROM rooming_participants
  WHERE is_active = true
  GROUP BY event_id
) r ON r.event_id = e.id;

-- 2. Bulk upload participants RPC
CREATE OR REPLACE FUNCTION public.fn_bulk_upload_participants(
  p_event_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_agency_id UUID;
  v_user_agency_id UUID;
BEGIN
  -- Get event's agency_id
  SELECT agency_id INTO v_agency_id
  FROM events
  WHERE id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Get user's agency_id
  SELECT agency_id INTO v_user_agency_id
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Check authorization
  IF NOT (
    has_role(auth.uid(), 'master'::app_role)
    OR (
      has_min_role(auth.uid(), 'staff'::app_role)
      AND v_user_agency_id = v_agency_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Insert participants
  INSERT INTO participants (event_id, agency_id, name, phone, email, is_active, created_by)
  SELECT 
    p_event_id,
    v_agency_id,
    x->>'name',
    x->>'phone',
    x->>'email',
    true,
    auth.uid()
  FROM jsonb_array_elements(p_rows) x
  WHERE x->>'name' IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log the upload
  INSERT INTO logs (
    agency_id,
    actor_role,
    action,
    target_table,
    payload,
    created_by
  )
  SELECT
    v_agency_id,
    ur.role::TEXT,
    'BULK_UPLOAD_PARTICIPANTS',
    'participants',
    jsonb_build_object(
      'event_id', p_event_id,
      'count', v_count
    ),
    auth.uid()
  FROM user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  RETURN jsonb_build_object('inserted', v_count);
END;
$$;