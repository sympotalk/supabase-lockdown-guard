-- [71-I.QA3-FIX.R9] Update master_agency_overview to match expected types

DROP VIEW IF EXISTS master_agency_overview;

CREATE OR REPLACE VIEW master_agency_overview AS
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  a.code as agency_code,
  a.is_active,
  a.created_at,
  COUNT(DISTINCT e.id) as events_count,
  COUNT(DISTINCT p.id) as participants_count,
  COUNT(DISTINCT al.id) as activity_count,
  COUNT(DISTINCT ur.user_id) as member_count,
  MAX(GREATEST(e.updated_at, p.updated_at, al.created_at)) as last_activity,
  CASE 
    WHEN a.is_active = false THEN 'disabled'
    WHEN COUNT(DISTINCT e.id) = 0 AND COUNT(DISTINCT p.id) = 0 THEN 'idle'
    WHEN MAX(GREATEST(e.updated_at, p.updated_at, al.created_at)) > now() - interval '7 days' THEN 'active'
    ELSE 'inactive'
  END as status
FROM agencies a
LEFT JOIN events e ON e.agency_id = a.id AND e.is_active = true
LEFT JOIN participants p ON p.agency_id = a.id AND p.is_active = true
LEFT JOIN activity_logs al ON al.agency_id = a.id
LEFT JOIN user_roles ur ON ur.agency_id = a.id
GROUP BY a.id, a.name, a.code, a.is_active, a.created_at;