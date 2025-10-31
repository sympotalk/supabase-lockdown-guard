-- Phase 77-K: AI Feedback Loop + Score History Visualization

-- 1) Feedback logs table
CREATE TABLE IF NOT EXISTS public.rooming_feedback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id),
  participant_id UUID NOT NULL REFERENCES public.participants(id),
  prev_room_id UUID REFERENCES public.event_room_refs(id),
  new_room_id UUID REFERENCES public.event_room_refs(id),
  ai_score NUMERIC,
  score_delta NUMERIC,
  user_reason TEXT,
  modified_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_logs_event ON public.rooming_feedback_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_logs_timestamp ON public.rooming_feedback_logs(timestamp DESC);

-- 2) Add ai_score field to rooming_participants if not exists
ALTER TABLE public.rooming_participants 
  ADD COLUMN IF NOT EXISTS ai_score NUMERIC,
  ADD COLUMN IF NOT EXISTS score_components JSONB;

-- 3) Trigger to auto-log room changes
CREATE OR REPLACE FUNCTION public.trg_rooming_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_new_score NUMERIC;
  v_prev_room_name TEXT;
  v_new_room_name TEXT;
BEGIN
  -- Only log if room_type_id actually changed and it was previously assigned
  IF OLD.room_type_id IS DISTINCT FROM NEW.room_type_id 
     AND OLD.room_type_id IS NOT NULL 
     AND NEW.room_type_id IS NOT NULL THEN
    
    -- Calculate score delta (simplified - could be enhanced with actual scoring)
    v_new_score := COALESCE(NEW.ai_score, 0);
    
    -- Get room type names
    SELECT rt.type_name INTO v_prev_room_name
    FROM public.event_room_refs err
    JOIN public.room_types rt ON rt.id = err.room_type_id
    WHERE err.id = OLD.room_type_id;
    
    SELECT rt.type_name INTO v_new_room_name
    FROM public.event_room_refs err
    JOIN public.room_types rt ON rt.id = err.room_type_id
    WHERE err.id = NEW.room_type_id;
    
    INSERT INTO public.rooming_feedback_logs(
      event_id,
      participant_id,
      prev_room_id,
      new_room_id,
      ai_score,
      score_delta,
      user_reason,
      modified_by
    ) VALUES (
      NEW.event_id,
      NEW.participant_id,
      OLD.room_type_id,
      NEW.room_type_id,
      COALESCE(OLD.ai_score, 0),
      v_new_score - COALESCE(OLD.ai_score, 0),
      CONCAT('Changed from ', v_prev_room_name, ' to ', v_new_room_name),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_rooming_feedback ON public.rooming_participants;
CREATE TRIGGER trg_rooming_feedback
AFTER UPDATE ON public.rooming_participants
FOR EACH ROW
EXECUTE FUNCTION public.trg_rooming_feedback();

-- 4) Feedback analysis function
CREATE OR REPLACE FUNCTION public.ai_feedback_analyze(p_event_id UUID, p_days_back INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  v_total_changes INT;
  v_avg_delta NUMERIC;
  v_accuracy NUMERIC;
  v_corrections JSONB;
BEGIN
  -- Count total room changes in period
  SELECT COUNT(*) INTO v_total_changes
  FROM public.rooming_feedback_logs
  WHERE event_id = p_event_id
    AND timestamp >= NOW() - (p_days_back || ' days')::INTERVAL;
  
  -- Average score delta
  SELECT AVG(score_delta) INTO v_avg_delta
  FROM public.rooming_feedback_logs
  WHERE event_id = p_event_id
    AND timestamp >= NOW() - (p_days_back || ' days')::INTERVAL;
  
  -- Calculate accuracy (how often AI assignment was kept vs changed)
  WITH total_assignments AS (
    SELECT COUNT(*) as total
    FROM public.rooming_participants
    WHERE event_id = p_event_id
  )
  SELECT 
    CASE 
      WHEN ta.total > 0 
      THEN ROUND((1.0 - (v_total_changes::NUMERIC / ta.total)) * 100, 2)
      ELSE 100.0
    END INTO v_accuracy
  FROM total_assignments ta;
  
  -- Most common correction patterns
  SELECT jsonb_agg(
    jsonb_build_object(
      'from_room', prev_rt.type_name,
      'to_room', new_rt.type_name,
      'count', correction_counts.cnt,
      'avg_delta', correction_counts.avg_delta
    )
  ) INTO v_corrections
  FROM (
    SELECT 
      prev_room_id,
      new_room_id,
      COUNT(*) as cnt,
      AVG(score_delta) as avg_delta
    FROM public.rooming_feedback_logs
    WHERE event_id = p_event_id
      AND timestamp >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY prev_room_id, new_room_id
    ORDER BY cnt DESC
    LIMIT 5
  ) correction_counts
  LEFT JOIN public.event_room_refs prev_err ON prev_err.id = correction_counts.prev_room_id
  LEFT JOIN public.room_types prev_rt ON prev_rt.id = prev_err.room_type_id
  LEFT JOIN public.event_room_refs new_err ON new_err.id = correction_counts.new_room_id
  LEFT JOIN public.room_types new_rt ON new_rt.id = new_err.room_type_id;
  
  RETURN jsonb_build_object(
    'total_changes', v_total_changes,
    'accuracy_percent', COALESCE(v_accuracy, 100.0),
    'avg_score_delta', COALESCE(v_avg_delta, 0),
    'top_corrections', COALESCE(v_corrections, '[]'::JSONB),
    'analysis_period_days', p_days_back
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_feedback_analyze(UUID, INT) TO authenticated;

-- 5) Get feedback timeline
CREATE OR REPLACE FUNCTION public.get_feedback_timeline(p_event_id UUID, p_days_back INT DEFAULT 30)
RETURNS TABLE (
  day DATE,
  total_changes BIGINT,
  avg_delta NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(fl.timestamp) as day,
    COUNT(*) as total_changes,
    AVG(fl.score_delta) as avg_delta
  FROM public.rooming_feedback_logs fl
  WHERE fl.event_id = p_event_id
    AND fl.timestamp >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY DATE(fl.timestamp)
  ORDER BY day DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_feedback_timeline(UUID, INT) TO authenticated;

-- RLS Policies
ALTER TABLE public.rooming_feedback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY rooming_feedback_logs_select ON public.rooming_feedback_logs
  FOR SELECT USING (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY rooming_feedback_logs_insert ON public.rooming_feedback_logs
  FOR INSERT WITH CHECK (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );