-- Phase 77-H: Auto Rebalance & Stock Guard

-- 1) 경고 로그 테이블
CREATE TABLE IF NOT EXISTS public.rooming_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id),
  room_type_ref UUID NOT NULL REFERENCES public.event_room_refs(id),
  shortage INT NOT NULL,
  needed INT NOT NULL,
  stock INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) 리밸런스 실행 로그
CREATE TABLE IF NOT EXISTS public.rooming_rebalance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id),
  run_id UUID NOT NULL,
  actor UUID REFERENCES auth.users(id),
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) 재고 진단 뷰
CREATE OR REPLACE VIEW public.v_room_stock_status AS
SELECT
  err.event_id,
  err.id AS room_type_ref,
  rt.type_name AS room_type_name,
  COALESCE(err.stock, 0) AS stock,
  (
    SELECT COUNT(*)
    FROM public.rooming_participants rp
    WHERE rp.event_id = err.event_id
      AND rp.room_type_id = err.id
      AND rp.is_active = true
  ) AS needed,
  (COALESCE(err.stock, 0) - (
    SELECT COUNT(*) 
    FROM public.rooming_participants rp
    WHERE rp.event_id = err.event_id
      AND rp.room_type_id = err.id 
      AND rp.is_active = true
  )) AS remaining
FROM public.event_room_refs err
JOIN public.room_types rt ON rt.id = err.room_type_id
WHERE err.is_active = true;

-- 4) 과재고 자동 경고
CREATE OR REPLACE FUNCTION public.ai_stock_guard(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_alerts JSONB := '[]'::JSONB;
  r RECORD;
BEGIN
  DELETE FROM public.rooming_stock_alerts WHERE event_id = p_event_id;
  
  FOR r IN
    SELECT * FROM public.v_room_stock_status 
    WHERE event_id = p_event_id AND remaining < 0
  LOOP
    INSERT INTO public.rooming_stock_alerts (event_id, room_type_ref, shortage, needed, stock)
    VALUES (p_event_id, r.room_type_ref, (r.needed - r.stock), r.needed, r.stock);

    v_alerts := v_alerts || jsonb_build_object(
      'room_type_ref', r.room_type_ref,
      'room_type_name', r.room_type_name,
      'needed', r.needed,
      'stock', r.stock,
      'shortage', (r.needed - r.stock)
    );
  END LOOP;

  RETURN jsonb_build_object('alerts', v_alerts);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_stock_guard(UUID) TO authenticated;

-- 5) 리밸런스 시뮬레이션
CREATE OR REPLACE FUNCTION public.ai_rebalance_preview(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_changes JSONB := '[]'::JSONB;
  r_short RECORD;
  r_spare RECORD;
  r_cand RECORD;
  v_shortage INT;
BEGIN
  FOR r_short IN
    SELECT * FROM public.v_room_stock_status 
    WHERE event_id = p_event_id AND remaining < 0
    ORDER BY remaining ASC
  LOOP
    v_shortage := ABS(r_short.remaining);
    
    FOR r_spare IN
      SELECT * FROM public.v_room_stock_status 
      WHERE event_id = p_event_id AND remaining > 0
      ORDER BY remaining DESC
    LOOP
      EXIT WHEN v_shortage = 0;
      
      FOR r_cand IN
        SELECT 
          rp.participant_id, 
          p.fixed_role, 
          p.name,
          COALESCE(pr.priority, 4) AS req_priority,
          rp.manual_assigned,
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

        v_changes := v_changes || jsonb_build_object(
          'participant_id', r_cand.participant_id,
          'participant_name', r_cand.name,
          'from_ref', r_short.room_type_ref,
          'from_name', r_short.room_type_name,
          'to_ref', r_spare.room_type_ref,
          'to_name', r_spare.room_type_name,
          'reason', 'stock_rebalance',
          'role', r_cand.fixed_role,
          'companion_count', r_cand.companion_count
        );

        v_shortage := v_shortage - 1;
        r_spare.remaining := r_spare.remaining - 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('preview', v_changes, 'count', jsonb_array_length(v_changes));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_rebalance_preview(UUID) TO authenticated;

-- 6) 리밸런스 적용
CREATE OR REPLACE FUNCTION public.ai_rebalance_apply(p_event_id UUID, p_changes JSONB)
RETURNS JSONB AS $$
DECLARE
  v_run UUID := gen_random_uuid();
  r JSONB;
  v_count INT := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('rebalance_' || p_event_id::TEXT));

  FOR r IN SELECT * FROM jsonb_array_elements(p_changes)
  LOOP
    UPDATE public.rooming_participants
      SET room_type_id = (r->>'to_ref')::UUID,
          room_status = 'AI재배정',
          updated_at = now()
    WHERE event_id = p_event_id
      AND participant_id = (r->>'participant_id')::UUID
      AND COALESCE(manual_assigned, FALSE) = FALSE;
    
    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.rooming_rebalance_logs(event_id, run_id, actor, changes)
  VALUES (p_event_id, v_run, auth.uid(), p_changes);

  RETURN jsonb_build_object('success', TRUE, 'run_id', v_run, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_rebalance_apply(UUID, JSONB) TO authenticated;

-- RLS Policies
ALTER TABLE public.rooming_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooming_rebalance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY rooming_stock_alerts_select ON public.rooming_stock_alerts
  FOR SELECT USING (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY rooming_rebalance_logs_select ON public.rooming_rebalance_logs
  FOR SELECT USING (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY rooming_rebalance_logs_insert ON public.rooming_rebalance_logs
  FOR INSERT WITH CHECK (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );