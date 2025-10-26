-- Create module_insights table
CREATE TABLE IF NOT EXISTS public.module_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL CHECK (module IN ('participants', 'rooming', 'uploads', 'messages')),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'critical')),
  title text NOT NULL,
  detail jsonb,
  created_at timestamptz DEFAULT now(),
  agency_id uuid REFERENCES public.agencies(id)
);

-- Create index for performance
CREATE INDEX idx_module_insights_module_agency ON public.module_insights(module, agency_id, created_at DESC);
CREATE INDEX idx_module_insights_created_at ON public.module_insights(created_at DESC);

-- Enable RLS
ALTER TABLE public.module_insights ENABLE ROW LEVEL SECURITY;

-- Master can see all
CREATE POLICY "master_view_all_module_insights"
ON public.module_insights FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'master'
  )
);

-- Agency users can see their own
CREATE POLICY "agency_view_own_module_insights"
ON public.module_insights FOR SELECT
TO authenticated
USING (
  agency_id IN (
    SELECT ur.agency_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

-- Master and agency owners can insert
CREATE POLICY "authorized_insert_module_insights"
ON public.module_insights FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('master', 'agency_owner', 'admin')
  )
);

-- Create RPC function to generate module insights
CREATE OR REPLACE FUNCTION public.rpc_generate_module_insights(
  p_module text,
  p_agency_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_level text;
  v_title text;
  v_detail jsonb;
  v_count integer;
  v_agency_filter uuid;
BEGIN
  -- Determine agency scope
  v_agency_filter := p_agency_id;
  
  -- If no agency specified, use caller's agency (if not master)
  IF v_agency_filter IS NULL THEN
    SELECT ur.agency_id INTO v_agency_filter
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role != 'master'
    LIMIT 1;
  END IF;

  -- Clean old insights (keep only last 50 per module)
  DELETE FROM module_insights
  WHERE id IN (
    SELECT id FROM module_insights
    WHERE module = p_module
    AND (v_agency_filter IS NULL OR agency_id = v_agency_filter)
    ORDER BY created_at DESC
    OFFSET 50
  );

  -- Generate insights based on module type
  IF p_module = 'participants' THEN
    -- Check AI mapping failure rate
    SELECT 
      COUNT(*) FILTER (WHERE action = 'AI_MAPPING_FAILED'),
      COUNT(*)
    INTO v_count, v_detail
    FROM participants_log
    WHERE created_at > now() - interval '7 days'
    AND (v_agency_filter IS NULL OR agency_id = v_agency_filter);

    IF v_count::float / GREATEST(v_detail::integer, 1) > 0.15 THEN
      v_level := 'warn';
      v_title := 'AI 매핑 실패율 증가';
      v_detail := jsonb_build_object(
        'failure_count', v_count,
        'total_count', v_detail,
        'rate', ROUND((v_count::float / GREATEST(v_detail::integer, 1) * 100)::numeric, 2)
      );
      
      INSERT INTO module_insights (module, level, title, detail, agency_id)
      VALUES (p_module, v_level, v_title, v_detail, v_agency_filter);
    END IF;

  ELSIF p_module = 'rooming' THEN
    -- Check unassigned participants
    SELECT COUNT(*)
    INTO v_count
    FROM participants p
    WHERE NOT EXISTS (
      SELECT 1 FROM rooming r WHERE r.participant_id = p.id
    )
    AND p.created_at > now() - interval '7 days'
    AND (v_agency_filter IS NULL OR p.agency_id = v_agency_filter);

    IF v_count > 10 THEN
      v_level := 'critical';
      v_title := '미배정 참가자 다수 발견';
      v_detail := jsonb_build_object('unassigned_count', v_count);
      
      INSERT INTO module_insights (module, level, title, detail, agency_id)
      VALUES (p_module, v_level, v_title, v_detail, v_agency_filter);
    END IF;

  ELSIF p_module = 'messages' THEN
    -- Check message failure rate
    SELECT 
      COUNT(*) FILTER (WHERE status = 'failed'),
      COUNT(*)
    INTO v_count, v_detail
    FROM messages
    WHERE created_at > now() - interval '7 days'
    AND (v_agency_filter IS NULL OR agency_id = v_agency_filter);

    IF v_count::float / GREATEST(v_detail::integer, 1) > 0.05 THEN
      v_level := 'warn';
      v_title := '메시지 전송 실패율 증가';
      v_detail := jsonb_build_object(
        'failure_count', v_count,
        'total_count', v_detail,
        'rate', ROUND((v_count::float / GREATEST(v_detail::integer, 1) * 100)::numeric, 2)
      );
      
      INSERT INTO module_insights (module, level, title, detail, agency_id)
      VALUES (p_module, v_level, v_title, v_detail, v_agency_filter);
    END IF;

  ELSIF p_module = 'uploads' THEN
    -- Check upload errors
    SELECT COUNT(*)
    INTO v_count
    FROM logs
    WHERE action LIKE '%UPLOAD%ERROR%'
    AND created_at > now() - interval '7 days'
    AND (v_agency_filter IS NULL OR agency_id = v_agency_filter);

    IF v_count >= 3 THEN
      v_level := 'warn';
      v_title := '업로드 오류 빈번 발생';
      v_detail := jsonb_build_object('error_count', v_count);
      
      INSERT INTO module_insights (module, level, title, detail, agency_id)
      VALUES (p_module, v_level, v_title, v_detail, v_agency_filter);
    END IF;
  END IF;

  RETURN json_build_object(
    'status', 'success',
    'module', p_module,
    'agency_id', v_agency_filter
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;