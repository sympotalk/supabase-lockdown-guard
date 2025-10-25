-- Phase 3.3.6-Pro: Dashboard Performance Indexes and Views

-- Add indexes for fast counting on dashboard metrics
CREATE INDEX IF NOT EXISTS idx_events_agency_id ON public.events(agency_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_participants_agency_id ON public.participants(agency_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_activity_logs_agency_id ON public.activity_logs(agency_id);

-- Create materialized view for dashboard metrics (optional but recommended for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_metrics AS
SELECT
  a.id as agency_id,
  a.name as agency_name,
  a.code as agency_code,
  (SELECT count(*) FROM events e WHERE e.agency_id = a.id AND e.is_active = true) as events_count,
  (SELECT count(*) FROM participants p WHERE p.agency_id = a.id AND p.is_active = true) as participants_count,
  (SELECT count(*) FROM activity_logs al WHERE al.agency_id = a.id) as activities_count,
  now() as last_updated
FROM agencies a
WHERE a.is_active = true;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_agency ON public.dashboard_metrics(agency_id);

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_metrics;
END;
$$;

-- Grant access to authenticated users
GRANT SELECT ON public.dashboard_metrics TO authenticated;

-- Add comment
COMMENT ON MATERIALIZED VIEW public.dashboard_metrics IS 'Aggregated dashboard metrics for each agency. Refresh periodically for best performance.';