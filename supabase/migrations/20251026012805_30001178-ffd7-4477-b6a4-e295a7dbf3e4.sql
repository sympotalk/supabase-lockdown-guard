-- Phase 3.10-A: Optimization & Stabilization (Minimal Safe Version)

-- 1. Create system cache table
CREATE TABLE IF NOT EXISTS public.system_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on cache
ALTER TABLE public.system_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache_select_policy"
ON public.system_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "cache_insert_update_policy"
ON public.system_cache FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('master', 'agency_owner', 'admin')
  )
);

-- 2. Create cache refresh function
CREATE OR REPLACE FUNCTION public.refresh_cache(_key text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.system_cache (key, payload, updated_at)
  VALUES (_key, _payload, now())
  ON CONFLICT (key)
  DO UPDATE SET 
    payload = EXCLUDED.payload,
    updated_at = now();
END;
$$;

-- 3. Create function to get cached data with TTL check
CREATE OR REPLACE FUNCTION public.get_cached_data(_key text, _ttl_seconds integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cached_data jsonb;
  last_update timestamptz;
BEGIN
  SELECT payload, updated_at 
  INTO cached_data, last_update
  FROM public.system_cache
  WHERE key = _key;

  -- Check if cache is still valid
  IF cached_data IS NOT NULL AND (now() - last_update) < (_ttl_seconds || ' seconds')::interval THEN
    RETURN cached_data;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Performance indexes for existing tables with existing columns
CREATE INDEX IF NOT EXISTS idx_participants_created ON public.participants (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_active ON public.events (is_active);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.logs (created_at DESC);

-- 5. Optimize module_insights queries
CREATE INDEX IF NOT EXISTS idx_module_insights_created ON public.module_insights (created_at DESC);

-- 6. Optimize ai_insights queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON public.ai_insights (status, created_at DESC);

-- 7. Clean up old cache entries (keep last 1000)
CREATE OR REPLACE FUNCTION public.cleanup_old_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.system_cache
  WHERE key IN (
    SELECT key FROM public.system_cache
    ORDER BY updated_at DESC
    OFFSET 1000
  );
END;
$$;

-- 8. Auto-cleanup trigger for cache
CREATE OR REPLACE FUNCTION public.trigger_cache_cleanup()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF random() < 0.01 THEN
    PERFORM cleanup_old_cache();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cache_cleanup_trigger ON public.system_cache;
CREATE TRIGGER cache_cleanup_trigger
AFTER INSERT ON public.system_cache
FOR EACH ROW
EXECUTE FUNCTION public.trigger_cache_cleanup();