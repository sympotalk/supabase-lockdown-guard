-- [71-I.QA3-FIX.R9] Recreate views dropped by CASCADE

-- Recreate agency_summary view
CREATE OR REPLACE VIEW agency_summary AS
SELECT 
  a.id,
  a.name,
  a.code,
  a.is_active,
  a.created_at,
  COUNT(DISTINCT e.id) as event_count,
  COUNT(DISTINCT p.id) as participant_count,
  MAX(GREATEST(e.updated_at, p.updated_at)) as last_activity
FROM agencies a
LEFT JOIN events e ON e.agency_id = a.id AND e.is_active = true
LEFT JOIN participants p ON p.agency_id = a.id AND p.is_active = true
GROUP BY a.id, a.name, a.code, a.is_active, a.created_at;

-- Recreate event_progress_view
CREATE OR REPLACE VIEW event_progress_view AS
SELECT 
  e.id as event_id,
  e.name,
  e.status,
  e.start_date,
  e.end_date,
  e.agency_id,
  COUNT(DISTINCT p.id) as participant_count,
  COUNT(DISTINCT CASE WHEN rp.id IS NOT NULL THEN p.id END) as assigned_room_count,
  CASE 
    WHEN COUNT(DISTINCT p.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN rp.id IS NOT NULL THEN p.id END)::numeric / COUNT(DISTINCT p.id)::numeric) * 100, 1)
    ELSE 0
  END as rooming_rate,
  CASE 
    WHEN COUNT(DISTINCT p.id) > 0 
    THEN ROUND((COUNT(DISTINCT p.id)::numeric / NULLIF(COUNT(DISTINCT p.id), 0)::numeric) * 100, 1)
    ELSE 0
  END as participant_rate,
  CASE 
    WHEN COUNT(DISTINCT p.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN rp.id IS NOT NULL THEN p.id END)::numeric / COUNT(DISTINCT p.id)::numeric) * 100, 1)
    ELSE 0
  END as progress_rate
FROM events e
LEFT JOIN participants p ON p.event_id = e.id AND p.is_active = true
LEFT JOIN rooming_participants rp ON rp.participant_id = p.id AND rp.is_active = true
WHERE e.is_active = true
GROUP BY e.id, e.name, e.status, e.start_date, e.end_date, e.agency_id;

-- Recreate master_agency_overview if it doesn't exist
CREATE OR REPLACE VIEW master_agency_overview AS
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  a.code,
  a.is_active,
  a.created_at,
  COUNT(DISTINCT e.id) as total_events,
  COUNT(DISTINCT p.id) as total_participants,
  COUNT(DISTINCT ur.user_id) as total_users,
  MAX(GREATEST(e.updated_at, p.updated_at)) as last_activity
FROM agencies a
LEFT JOIN events e ON e.agency_id = a.id AND e.is_active = true
LEFT JOIN participants p ON p.agency_id = a.id AND p.is_active = true
LEFT JOIN user_roles ur ON ur.agency_id = a.id
GROUP BY a.id, a.name, a.code, a.is_active, a.created_at;