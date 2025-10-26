-- Create ai_insights table for storing AI-detected anomalies
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  detection_key text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title text NOT NULL,
  description text NOT NULL,
  cause_analysis text,
  recommended_action text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_ai_insights_detected_at ON public.ai_insights(detected_at DESC);
CREATE INDEX idx_ai_insights_status ON public.ai_insights(status);
CREATE INDEX idx_ai_insights_severity ON public.ai_insights(severity);
CREATE INDEX idx_ai_insights_detection_key ON public.ai_insights(detection_key);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Master-only access policy
CREATE POLICY "Masters can view all AI insights"
  ON public.ai_insights
  FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can insert AI insights"
  ON public.ai_insights
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can update AI insights"
  ON public.ai_insights
  FOR UPDATE
  USING (has_role(auth.uid(), 'master'::app_role));

-- Create view for active insights summary
CREATE OR REPLACE VIEW public.ai_insights_summary AS
SELECT
  severity,
  COUNT(*) as count,
  MAX(detected_at) as latest_detection
FROM public.ai_insights
WHERE status = 'active'
  AND detected_at > now() - interval '24 hours'
GROUP BY severity;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ai_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_insights_updated_at
  BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_insights_updated_at();