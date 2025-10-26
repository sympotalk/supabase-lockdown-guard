-- Phase 3.10-B: System Health & Master Account Integration

-- 1. Function Health Tracking
CREATE TABLE IF NOT EXISTS public.functions_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text CHECK (status IN ('healthy', 'degraded', 'error')) DEFAULT 'healthy',
  latency_ms numeric,
  last_checked timestamptz DEFAULT now(),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Realtime Channel Health Tracking
CREATE TABLE IF NOT EXISTS public.realtime_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name text NOT NULL,
  is_connected boolean DEFAULT true,
  last_event timestamptz DEFAULT now(),
  message_count integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Account Overview Cache
CREATE TABLE IF NOT EXISTS public.master_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  agency_name text,
  active_users integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.functions_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_accounts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Master only
CREATE POLICY "Masters can view function health"
  ON public.functions_health FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can insert function health"
  ON public.functions_health FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can update function health"
  ON public.functions_health FOR UPDATE
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can view realtime health"
  ON public.realtime_health FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can insert realtime health"
  ON public.realtime_health FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can update realtime health"
  ON public.realtime_health FOR UPDATE
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can view account cache"
  ON public.master_accounts FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can manage account cache"
  ON public.master_accounts FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role));

-- 6. Health Check RPC
CREATE OR REPLACE FUNCTION public.fn_healthcheck_all()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  func_summary jsonb;
  rt_summary jsonb;
BEGIN
  -- Aggregate function health
  SELECT jsonb_agg(jsonb_build_object(
    'function_name', function_name,
    'status', status,
    'latency_ms', latency_ms,
    'last_checked', last_checked,
    'error_message', error_message
  )) INTO func_summary
  FROM public.functions_health
  WHERE last_checked > now() - interval '1 hour'
  ORDER BY last_checked DESC;

  -- Aggregate realtime health
  SELECT jsonb_agg(jsonb_build_object(
    'channel_name', channel_name,
    'is_connected', is_connected,
    'last_event', last_event,
    'message_count', message_count,
    'error_message', error_message
  )) INTO rt_summary
  FROM public.realtime_health
  WHERE last_event > now() - interval '1 hour'
  ORDER BY last_event DESC;

  RETURN jsonb_build_object(
    'functions', COALESCE(func_summary, '[]'::jsonb),
    'realtime', COALESCE(rt_summary, '[]'::jsonb),
    'checked_at', now()
  );
END;
$$;

-- 7. Master Account Summary RPC
CREATE OR REPLACE FUNCTION public.rpc_get_master_account_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_agencies integer;
  active_agencies integer;
  total_users integer;
  recent_logins bigint;
BEGIN
  -- Check if caller is master
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  -- Count agencies
  SELECT COUNT(*) INTO total_agencies FROM public.agencies;
  SELECT COUNT(*) INTO active_agencies FROM public.agencies WHERE is_active = true;

  -- Count users
  SELECT COUNT(DISTINCT user_id) INTO total_users FROM public.user_roles;

  -- Count recent logins (last 24 hours)
  SELECT COUNT(*) INTO recent_logins
  FROM auth.users
  WHERE last_sign_in_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'total_agencies', total_agencies,
    'active_agencies', active_agencies,
    'total_users', total_users,
    'recent_logins', recent_logins,
    'checked_at', now()
  );
END;
$$;

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_functions_health_checked ON public.functions_health(last_checked DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_health_event ON public.realtime_health(last_event DESC);
CREATE INDEX IF NOT EXISTS idx_master_accounts_agency ON public.master_accounts(agency_id);

-- 9. Updated_at triggers
CREATE TRIGGER update_functions_health_updated_at
  BEFORE UPDATE ON public.functions_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_realtime_health_updated_at
  BEFORE UPDATE ON public.realtime_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_accounts_updated_at
  BEFORE UPDATE ON public.master_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();