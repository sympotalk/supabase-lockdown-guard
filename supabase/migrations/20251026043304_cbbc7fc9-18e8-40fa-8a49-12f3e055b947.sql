-- Phase 3.14-V: Create views for real data wiring (fixed column names)

-- View 1: qa_reports_latest
CREATE OR REPLACE VIEW qa_reports_latest AS
SELECT *
FROM qa_reports
ORDER BY generated_at DESC
LIMIT 1;

-- View 2: error_logs_recent (using logs table)
CREATE OR REPLACE VIEW error_logs_recent AS
SELECT 
  id, 
  COALESCE(target_table, 'system') AS module,
  CASE 
    WHEN action LIKE '%ERROR%' OR action LIKE '%CRITICAL%' THEN 'critical'
    WHEN action LIKE '%WARNING%' OR action LIKE '%WARN%' THEN 'warning'
    ELSE 'info'
  END AS level,
  action AS message,
  created_at
FROM logs
WHERE created_at > now() - INTERVAL '30 days'
  AND (action LIKE '%ERROR%' OR action LIKE '%WARNING%' OR action LIKE '%FAIL%' OR action LIKE '%CRITICAL%')
ORDER BY created_at DESC
LIMIT 100;

-- View 3: master_system_insights (aggregate metrics with correct columns)
CREATE OR REPLACE VIEW master_system_insights AS
WITH f AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'ok' OR status = 'healthy') AS ok_f,
    COUNT(*) AS total_f,
    COALESCE(AVG(latency_ms), 0)::NUMERIC(10,2) AS avg_latency_ms
  FROM functions_health
  WHERE last_checked > now() - INTERVAL '24 hours'
),
r AS (
  SELECT 
    COUNT(*) FILTER (WHERE is_connected = true) AS ok_r,
    COUNT(*) AS total_r
  FROM realtime_health
  WHERE last_event > now() - INTERVAL '24 hours'
),
q AS (
  SELECT 
    COUNT(*) AS total_reports,
    ROUND(
      (COUNT(*) FILTER (WHERE LOWER(status) IN ('pass', 'ok', 'success')) * 100.0 / NULLIF(COUNT(*), 0)), 
      1
    ) AS success_rate
  FROM qa_reports
  WHERE generated_at > now() - INTERVAL '7 days'
)
SELECT
  COALESCE(q.total_reports, 0) AS total_reports,
  COALESCE(q.success_rate, 0) AS success_rate,
  COALESCE(f.avg_latency_ms, 0) AS avg_processing_time,
  COALESCE((f.total_f - f.ok_f), 0) + COALESCE((r.total_r - r.ok_r), 0) AS warning_count,
  COALESCE(f.total_f, 0) AS total_functions,
  COALESCE(r.total_r, 0) AS total_channels
FROM f
FULL OUTER JOIN r ON true
FULL OUTER JOIN q ON true;