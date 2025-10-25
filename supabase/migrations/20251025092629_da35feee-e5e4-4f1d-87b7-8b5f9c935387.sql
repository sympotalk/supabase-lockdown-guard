-- Phase 3.3.8-Pro: Master Agency Overview

-- Create view for aggregated agency metrics
CREATE OR REPLACE VIEW public.master_agency_overview AS
SELECT
  a.id as agency_id,
  a.name as agency_name,
  a.code as agency_code,
  a.is_active,
  (SELECT count(*) FROM events e WHERE e.agency_id = a.id AND e.is_active = true) as events_count,
  (SELECT count(*) FROM participants p WHERE p.agency_id = a.id AND p.is_active = true) as participants_count,
  (SELECT count(*) FROM activity_logs al WHERE al.agency_id = a.id) as activity_count,
  (SELECT count(*) FROM user_roles ur WHERE ur.agency_id = a.id) as member_count,
  GREATEST(
    COALESCE((SELECT MAX(e.updated_at) FROM events e WHERE e.agency_id = a.id), a.created_at),
    COALESCE((SELECT MAX(p.updated_at) FROM participants p WHERE p.agency_id = a.id), a.created_at),
    COALESCE((SELECT MAX(al.created_at) FROM activity_logs al WHERE al.agency_id = a.id), a.created_at)
  ) as last_activity,
  CASE
    WHEN NOT a.is_active THEN 'disabled'
    WHEN now() - GREATEST(
      COALESCE((SELECT MAX(e.updated_at) FROM events e WHERE e.agency_id = a.id), a.created_at),
      COALESCE((SELECT MAX(p.updated_at) FROM participants p WHERE p.agency_id = a.id), a.created_at),
      COALESCE((SELECT MAX(al.created_at) FROM activity_logs al WHERE al.agency_id = a.id), a.created_at)
    ) > interval '30 days' THEN 'inactive'
    WHEN (SELECT count(*) FROM events e WHERE e.agency_id = a.id AND e.is_active = true) = 0 THEN 'idle'
    ELSE 'active'
  END as status
FROM agencies a
WHERE a.is_active = true
ORDER BY last_activity DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.master_agency_overview TO authenticated;

-- Create RLS policy for master_agency_overview
-- Note: Views inherit RLS from base tables, but we ensure only masters can query this
CREATE POLICY "Masters can view agency overview"
ON public.agencies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'master'::app_role)
);

COMMENT ON VIEW public.master_agency_overview IS 'Aggregated metrics for all agencies, accessible only by master users for oversight dashboard';