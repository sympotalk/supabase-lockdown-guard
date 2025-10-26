-- Phase 3.11-Final: Complete Error Resolution & Table Synchronization

-- Ensure qa_reports table exists with all columns
CREATE TABLE IF NOT EXISTS qa_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz DEFAULT now(),
  total_anomalies integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  info_count integer DEFAULT 0,
  summary text,
  report_json jsonb DEFAULT '{}'::jsonb,
  ai_recommendations text,
  period_start timestamptz DEFAULT now() - interval '24 hours',
  period_end timestamptz DEFAULT now()
);

-- Ensure ops_executions table exists with all columns
CREATE TABLE IF NOT EXISTS ops_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_key text NOT NULL,
  trigger_source text NOT NULL,
  trigger_payload jsonb,
  status text CHECK (status IN ('queued','running','succeeded','failed','skipped')) DEFAULT 'queued',
  result jsonb,
  dedup_key text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Ensure notifications table exists with all columns
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text CHECK (scope IN ('master','agency')) DEFAULT 'master',
  level text CHECK (level IN ('info','warn','critical')) DEFAULT 'info',
  title text,
  body text,
  meta jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Ensure functions_health table exists with all columns
CREATE TABLE IF NOT EXISTS functions_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text CHECK (status IN ('healthy', 'degraded', 'error')) DEFAULT 'healthy',
  latency_ms numeric,
  last_checked timestamptz DEFAULT now(),
  error_message text
);

-- Ensure realtime_health table exists with all columns
CREATE TABLE IF NOT EXISTS realtime_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name text NOT NULL,
  is_connected boolean DEFAULT true,
  last_event timestamptz DEFAULT now(),
  message_count integer DEFAULT 0,
  error_message text
);

-- Ensure ai_anomaly_logs table exists
CREATE TABLE IF NOT EXISTS ai_anomaly_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at timestamptz DEFAULT now(),
  category text,
  severity text CHECK (severity IN ('Critical', 'Warning', 'Info')),
  title text,
  description text,
  related_function text,
  resolved boolean DEFAULT false,
  resolved_at timestamptz
);

-- Ensure ops_playbooks table exists
CREATE TABLE IF NOT EXISTS ops_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  enabled boolean DEFAULT true,
  actions jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_qa_reports_generated ON qa_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_exec_created ON ops_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_exec_dedup ON ops_executions(dedup_key);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_functions_health_name ON functions_health(function_name);
CREATE INDEX IF NOT EXISTS idx_realtime_health_name ON realtime_health(channel_name);

-- Enable RLS on all tables if not already enabled
ALTER TABLE qa_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE functions_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_anomaly_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_playbooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts, then recreate
DROP POLICY IF EXISTS "Masters can view qa_reports" ON qa_reports;
DROP POLICY IF EXISTS "Masters can manage ops_executions" ON ops_executions;
DROP POLICY IF EXISTS "Users can read their notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Masters can view functions_health" ON functions_health;
DROP POLICY IF EXISTS "Masters can view realtime_health" ON realtime_health;

-- Create RLS policies
CREATE POLICY "Masters can view qa_reports"
  ON qa_reports FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can manage ops_executions"
  ON ops_executions FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Users can read their notifications"
  ON notifications FOR SELECT
  USING (
    (scope = 'master' AND has_role(auth.uid(), 'master'::app_role))
    OR (scope = 'agency' AND auth.uid() IS NOT NULL)
  );

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (
    (scope = 'master' AND has_role(auth.uid(), 'master'::app_role))
    OR (scope = 'agency' AND auth.uid() IS NOT NULL)
  );

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Masters can view functions_health"
  ON functions_health FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can view realtime_health"
  ON realtime_health FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can view ai_anomaly_logs"
  ON ai_anomaly_logs FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can view ops_playbooks"
  ON ops_playbooks FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Insert sample data if tables are empty
INSERT INTO functions_health (function_name, status, latency_ms, last_checked)
SELECT 'ops_execute', 'healthy', 45, now()
WHERE NOT EXISTS (SELECT 1 FROM functions_health WHERE function_name = 'ops_execute');

INSERT INTO functions_health (function_name, status, latency_ms, last_checked)
SELECT 'fn_healthcheck_all', 'healthy', 32, now()
WHERE NOT EXISTS (SELECT 1 FROM functions_health WHERE function_name = 'fn_healthcheck_all');

INSERT INTO functions_health (function_name, status, latency_ms, last_checked)
SELECT 'fn_generate_qa_report', 'healthy', 156, now()
WHERE NOT EXISTS (SELECT 1 FROM functions_health WHERE function_name = 'fn_generate_qa_report');

INSERT INTO realtime_health (channel_name, is_connected, last_event, message_count)
SELECT 'master-dashboard', true, now(), 127
WHERE NOT EXISTS (SELECT 1 FROM realtime_health WHERE channel_name = 'master-dashboard');

INSERT INTO realtime_health (channel_name, is_connected, last_event, message_count)
SELECT 'notifications-changes', true, now(), 43
WHERE NOT EXISTS (SELECT 1 FROM realtime_health WHERE channel_name = 'notifications-changes');

INSERT INTO realtime_health (channel_name, is_connected, last_event, message_count)
SELECT 'ops-executions-changes', true, now(), 18
WHERE NOT EXISTS (SELECT 1 FROM realtime_health WHERE channel_name = 'ops-executions-changes');

-- Insert playbooks if not exist
INSERT INTO ops_playbooks (key, name, actions) VALUES
('rt_reconnect', 'Realtime 재연결', '[
  {"type":"realtime.reconnect","params":{"maxAttempts":3,"backoffMs":1500}},
  {"type":"cache.invalidate","params":{"keys":["health.realtime"]}},
  {"type":"notify","params":{"level":"info","title":"Realtime 재연결 시도","body":"연결 재수립을 시도했습니다."}}
]'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO ops_playbooks (key, name, actions) VALUES
('fn_rollback', '함수 오류 롤백', '[
  {"type":"deploy.rollback","params":{"service":"edge","to":"last_stable"}},
  {"type":"cache.invalidate","params":{"keys":["health.functions"]}},
  {"type":"notify","params":{"level":"critical","title":"Edge 함수 롤백","body":"마지막 안정 빌드로 복귀했습니다."}}
]'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO ops_playbooks (key, name, actions) VALUES
('queue_quarantine', '문제 큐 격리', '[
  {"type":"queue.pause","params":{"queue":"messages"}},
  {"type":"notify","params":{"level":"warn","title":"큐 일시 중지","body":"messages 큐를 일시적으로 중지했습니다."}}
]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Recreate RPC functions with correct logic
CREATE OR REPLACE FUNCTION fn_generate_qa_report()
RETURNS jsonb AS $$
DECLARE
  total_count int;
  critical_count int;
  warning_count int;
  info_count int;
  summary_text text;
  report jsonb;
  new_report_id uuid;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE severity='Critical'),
    COUNT(*) FILTER (WHERE severity='Warning'),
    COUNT(*) FILTER (WHERE severity='Info')
  INTO total_count, critical_count, warning_count, info_count
  FROM ai_anomaly_logs
  WHERE detected_at >= now() - interval '24 hours';

  summary_text := format(
    '지난 24시간 동안 총 %s건의 이상 중 Critical %s건, Warning %s건, Info %s건이 탐지되었습니다.',
    total_count, critical_count, warning_count, info_count
  );

  report := jsonb_build_object(
    'detected', total_count,
    'critical', critical_count,
    'warning', warning_count,
    'info', info_count,
    'summary', summary_text,
    'generated_at', now()
  );

  INSERT INTO qa_reports (
    total_anomalies, 
    critical_count, 
    warning_count, 
    info_count, 
    summary, 
    report_json,
    period_start,
    period_end
  )
  VALUES (
    total_count, 
    critical_count, 
    warning_count, 
    info_count, 
    summary_text, 
    report,
    now() - interval '24 hours',
    now()
  )
  RETURNING id INTO new_report_id;

  RETURN jsonb_build_object('report_id', new_report_id, 'report', report);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION fn_healthcheck_all()
RETURNS jsonb AS $$
DECLARE
  func_summary jsonb;
  rt_summary jsonb;
BEGIN
  -- Get functions health
  SELECT jsonb_agg(jsonb_build_object(
    'function_name', function_name,
    'status', status,
    'latency_ms', latency_ms,
    'last_checked', last_checked,
    'error_message', error_message
  )) INTO func_summary
  FROM functions_health
  WHERE last_checked > now() - interval '1 hour'
  ORDER BY last_checked DESC;

  -- Get realtime health
  SELECT jsonb_agg(jsonb_build_object(
    'channel_name', channel_name,
    'is_connected', is_connected,
    'last_event', last_event,
    'message_count', message_count,
    'error_message', error_message
  )) INTO rt_summary
  FROM realtime_health
  WHERE last_event > now() - interval '1 hour'
  ORDER BY last_event DESC;

  RETURN jsonb_build_object(
    'functions', COALESCE(func_summary, '[]'::jsonb),
    'realtime', COALESCE(rt_summary, '[]'::jsonb),
    'checked_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION ops_execute(_playbook_key text, _trigger text, _payload jsonb DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  pb jsonb;
  exec_id uuid := gen_random_uuid();
  _dedup text := md5(_playbook_key || coalesce(_payload::text,'') || date_trunc('minute', now())::text);
BEGIN
  -- 10분 내 중복 방지
  IF EXISTS (
    SELECT 1 FROM ops_executions 
    WHERE dedup_key = _dedup 
    AND created_at > now() - interval '10 minutes'
  ) THEN
    INSERT INTO ops_executions(id, playbook_key, trigger_source, trigger_payload, status, dedup_key, result)
    VALUES (exec_id, _playbook_key, _trigger, _payload, 'skipped', _dedup, '{"reason":"dedup"}'::jsonb);
    RETURN exec_id;
  END IF;

  SELECT to_jsonb(p) INTO pb 
  FROM ops_playbooks p 
  WHERE key = _playbook_key AND enabled = true;
  
  IF pb IS NULL THEN 
    RAISE EXCEPTION 'playbook not found or disabled'; 
  END IF;

  INSERT INTO ops_executions(id, playbook_key, trigger_source, trigger_payload, status, started_at, dedup_key)
  VALUES (exec_id, _playbook_key, _trigger, _payload, 'running', now(), _dedup);

  RETURN exec_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;