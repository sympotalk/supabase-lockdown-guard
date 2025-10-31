-- Phase 77-L: AI Fine-Tune & User Bias Compensation

-- 1) User rooming bias table
CREATE TABLE IF NOT EXISTS public.user_rooming_bias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  agency_id UUID REFERENCES public.agencies(id),
  room_type TEXT NOT NULL,
  bias_score NUMERIC DEFAULT 0,
  sample_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_bias_unique ON public.user_rooming_bias(user_id, room_type);
CREATE INDEX IF NOT EXISTS idx_user_bias_score ON public.user_rooming_bias(bias_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_bias_agency ON public.user_rooming_bias(agency_id);

-- 2) Update user bias based on feedback logs
CREATE OR REPLACE FUNCTION public.ai_update_user_bias(p_user_id UUID, p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  r RECORD;
  v_updated INT := 0;
  v_agency_id UUID;
BEGIN
  -- Get agency_id for this event
  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;
  
  -- Calculate bias for each room type based on feedback patterns
  FOR r IN
    SELECT 
      new_rt.type_name as room_type,
      AVG(fl.score_delta) as avg_delta,
      COUNT(*) as sample_count
    FROM public.rooming_feedback_logs fl
    JOIN public.event_room_refs new_err ON new_err.id = fl.new_room_id
    JOIN public.room_types new_rt ON new_rt.id = new_err.room_type_id
    WHERE fl.event_id = p_event_id
      AND fl.modified_by = p_user_id
    GROUP BY new_rt.type_name
    HAVING COUNT(*) >= 3  -- Minimum 3 samples to establish bias
  LOOP
    -- Insert or update bias
    INSERT INTO public.user_rooming_bias(user_id, agency_id, room_type, bias_score, sample_count, last_updated)
    VALUES (
      p_user_id,
      v_agency_id,
      r.room_type,
      GREATEST(-100, LEAST(100, r.avg_delta * 5)),  -- Scale and cap between -100 and 100
      r.sample_count,
      now()
    )
    ON CONFLICT (user_id, room_type)
    DO UPDATE SET
      bias_score = GREATEST(-100, LEAST(100, 
        (user_rooming_bias.bias_score * user_rooming_bias.sample_count + EXCLUDED.bias_score * EXCLUDED.sample_count) 
        / (user_rooming_bias.sample_count + EXCLUDED.sample_count)
      )),
      sample_count = user_rooming_bias.sample_count + EXCLUDED.sample_count,
      last_updated = now();
    
    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'updated_types', v_updated,
    'user_id', p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_update_user_bias(UUID, UUID) TO authenticated;

-- 3) Get user bias profile
CREATE OR REPLACE FUNCTION public.get_user_bias_profile(p_user_id UUID)
RETURNS TABLE (
  room_type TEXT,
  bias_score NUMERIC,
  sample_count INTEGER,
  preference_level TEXT,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    urb.room_type,
    urb.bias_score,
    urb.sample_count,
    CASE 
      WHEN urb.bias_score > 30 THEN 'Strong Preference'
      WHEN urb.bias_score > 10 THEN 'Moderate Preference'
      WHEN urb.bias_score > -10 THEN 'Neutral'
      WHEN urb.bias_score > -30 THEN 'Moderate Avoidance'
      ELSE 'Strong Avoidance'
    END as preference_level,
    urb.last_updated
  FROM public.user_rooming_bias urb
  WHERE urb.user_id = p_user_id
  ORDER BY urb.bias_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_bias_profile(UUID) TO authenticated;

-- 4) Enhanced AI rebalance with bias compensation
CREATE OR REPLACE FUNCTION public.ai_rebalance_preview_with_bias(p_event_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_changes JSONB := '[]'::JSONB;
  r_short RECORD;
  r_spare RECORD;
  r_cand RECORD;
  v_shortage INT;
  v_bias NUMERIC;
  v_adjusted_score NUMERIC;
BEGIN
  FOR r_short IN
    SELECT * FROM public.v_room_stock_status 
    WHERE event_id = p_event_id AND remaining < 0
    ORDER BY remaining ASC
  LOOP
    v_shortage := ABS(r_short.remaining);
    
    FOR r_spare IN
      SELECT 
        vrs.*,
        COALESCE(urb.bias_score, 0) as user_bias
      FROM public.v_room_stock_status vrs
      LEFT JOIN public.user_rooming_bias urb ON (
        urb.room_type = vrs.room_type_name 
        AND urb.user_id = p_user_id
      )
      WHERE vrs.event_id = p_event_id AND vrs.remaining > 0
      ORDER BY 
        -- Prefer rooms with positive bias
        (COALESCE(urb.bias_score, 0) * 0.2) DESC,
        vrs.remaining DESC
    LOOP
      EXIT WHEN v_shortage = 0;
      
      v_bias := COALESCE(r_spare.user_bias, 0);
      
      FOR r_cand IN
        SELECT 
          rp.participant_id, 
          p.fixed_role, 
          p.name,
          COALESCE(pr.priority, 4) AS req_priority,
          rp.manual_assigned,
          rp.ai_score,
          (SELECT COUNT(*) FROM unnest(COALESCE(p.companions, ARRAY[]::UUID[])) AS c) AS companion_count
        FROM public.rooming_participants rp
        JOIN public.participants p ON p.id = rp.participant_id
        LEFT JOIN (
          SELECT participant_id, MIN(priority) AS priority
          FROM public.participant_requests 
          GROUP BY participant_id
        ) pr ON pr.participant_id = rp.participant_id
        WHERE rp.event_id = p_event_id
          AND rp.room_type_id = r_short.room_type_ref
          AND COALESCE(rp.manual_assigned, FALSE) = FALSE
          AND (pr.priority IS NULL OR pr.priority > 1)
        ORDER BY 
          COALESCE(pr.priority, 4) DESC,
          CASE 
            WHEN p.fixed_role = '좌장' THEN 3 
            WHEN p.fixed_role = '연자' THEN 2 
            ELSE 1 
          END ASC
        LIMIT v_shortage
      LOOP
        EXIT WHEN v_shortage = 0;
        EXIT WHEN r_spare.remaining = 0;

        -- Calculate adjusted score with bias
        v_adjusted_score := COALESCE(r_cand.ai_score, 50) + (v_bias * 0.2);

        v_changes := v_changes || jsonb_build_object(
          'participant_id', r_cand.participant_id,
          'participant_name', r_cand.name,
          'from_ref', r_short.room_type_ref,
          'from_name', r_short.room_type_name,
          'to_ref', r_spare.room_type_ref,
          'to_name', r_spare.room_type_name,
          'reason', 'stock_rebalance_with_bias',
          'role', r_cand.fixed_role,
          'companion_count', r_cand.companion_count,
          'base_score', COALESCE(r_cand.ai_score, 50),
          'bias_applied', v_bias,
          'adjusted_score', v_adjusted_score
        );

        v_shortage := v_shortage - 1;
        r_spare.remaining := r_spare.remaining - 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'preview', v_changes, 
    'count', jsonb_array_length(v_changes),
    'bias_enabled', TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_rebalance_preview_with_bias(UUID, UUID) TO authenticated;

-- 5) Agency-wide bias summary
CREATE OR REPLACE FUNCTION public.get_agency_bias_summary(p_agency_id UUID)
RETURNS TABLE (
  user_name TEXT,
  user_id UUID,
  total_biases INTEGER,
  strongest_preference TEXT,
  strongest_preference_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_biases AS (
    SELECT 
      urb.user_id,
      urb.room_type,
      urb.bias_score,
      ROW_NUMBER() OVER (PARTITION BY urb.user_id ORDER BY urb.bias_score DESC) as rn
    FROM public.user_rooming_bias urb
    WHERE urb.agency_id = p_agency_id
  )
  SELECT 
    COALESCE(am.display_name, u.email) as user_name,
    rb.user_id,
    COUNT(DISTINCT urb.room_type)::INTEGER as total_biases,
    rb.room_type as strongest_preference,
    rb.bias_score as strongest_preference_score
  FROM ranked_biases rb
  LEFT JOIN auth.users u ON u.id = rb.user_id
  LEFT JOIN public.agency_members am ON am.user_id = rb.user_id
  LEFT JOIN public.user_rooming_bias urb ON urb.user_id = rb.user_id
  WHERE rb.rn = 1
  GROUP BY rb.user_id, rb.room_type, rb.bias_score, u.email, am.display_name
  ORDER BY rb.bias_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_agency_bias_summary(UUID) TO authenticated;

-- RLS Policies
ALTER TABLE public.user_rooming_bias ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_rooming_bias_select ON public.user_rooming_bias
  FOR SELECT USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'master'::app_role)
    OR (agency_id IN (
      SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY user_rooming_bias_insert ON public.user_rooming_bias
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY user_rooming_bias_update ON public.user_rooming_bias
  FOR UPDATE USING (
    user_id = auth.uid() OR has_role(auth.uid(), 'master'::app_role)
  );