-- Phase 77-I: Advanced Companion Linking System

-- 1) Companion Links Table (bidirectional)
CREATE TABLE IF NOT EXISTS public.participant_companions (
  event_id UUID NOT NULL REFERENCES public.events(id),
  a_participant_id UUID NOT NULL REFERENCES public.participants(id),
  b_participant_id UUID NOT NULL REFERENCES public.participants(id),
  relation TEXT DEFAULT '동반의료인',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, a_participant_id, b_participant_id),
  CHECK (a_participant_id <> b_participant_id)
);

-- Ensure symmetry: A-B creates B-A automatically
CREATE OR REPLACE FUNCTION public.trg_companion_mirror()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.participant_companions(event_id, a_participant_id, b_participant_id, relation)
    VALUES (NEW.event_id, NEW.b_participant_id, NEW.a_participant_id, NEW.relation)
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.participant_companions
    WHERE event_id = OLD.event_id
      AND a_participant_id = OLD.b_participant_id
      AND b_participant_id = OLD.a_participant_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companion_mirror_ins ON public.participant_companions;
CREATE TRIGGER trg_companion_mirror_ins
AFTER INSERT OR DELETE ON public.participant_companions
FOR EACH ROW EXECUTE FUNCTION public.trg_companion_mirror();

-- Prevent duplicate pairs
CREATE UNIQUE INDEX IF NOT EXISTS ux_companion_sorted
ON public.participant_companions(event_id, LEAST(a_participant_id, b_participant_id), GREATEST(a_participant_id, b_participant_id));

-- 2) Extract companion candidates from memo/notes
CREATE OR REPLACE FUNCTION public.ai_extract_companions_from_notes(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  r RECORD;
  v_result JSONB := '[]'::JSONB;
  v_candidates JSONB;
BEGIN
  FOR r IN
    SELECT p.id AS base_id, p.name AS base_name, p.phone, p.memo
    FROM public.participants p
    WHERE p.event_id = p_event_id 
      AND (p.memo IS NOT NULL AND LENGTH(TRIM(p.memo)) > 0)
  LOOP
    -- Find potential companions by name or phone in memo
    SELECT jsonb_agg(jsonb_build_object(
      'id', q.id,
      'name', q.name,
      'phone', q.phone,
      'match_type', CASE 
        WHEN r.memo ILIKE '%' || q.name || '%' THEN 'name'
        WHEN COALESCE(r.memo, '') ILIKE '%' || COALESCE(q.phone, 'x') || '%' THEN 'phone'
        ELSE 'other'
      END
    ))
    INTO v_candidates
    FROM public.participants q
    WHERE q.event_id = p_event_id
      AND q.id <> r.base_id
      AND (
        r.memo ILIKE '%' || q.name || '%' 
        OR (q.phone IS NOT NULL AND r.memo ILIKE '%' || q.phone || '%')
      );

    IF v_candidates IS NOT NULL AND jsonb_array_length(v_candidates) > 0 THEN
      v_result := v_result || jsonb_build_object(
        'base_id', r.base_id,
        'base_name', r.base_name,
        'memo', r.memo,
        'candidates', v_candidates
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('pairs', v_result, 'count', jsonb_array_length(v_result));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_extract_companions_from_notes(UUID) TO authenticated;

-- 3) Batch create companion links
CREATE OR REPLACE FUNCTION public.link_companions(p_event_id UUID, p_pairs JSONB)
RETURNS JSONB AS $$
DECLARE
  r JSONB;
  v_count INT := 0;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_pairs)
  LOOP
    INSERT INTO public.participant_companions(event_id, a_participant_id, b_participant_id)
    VALUES (
      p_event_id,
      (r->>'a')::UUID,
      (r->>'b')::UUID
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', TRUE, 'linked', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.link_companions(UUID, JSONB) TO authenticated;

-- 4) Get companion group for a participant
CREATE OR REPLACE FUNCTION public.get_companion_group(p_event_id UUID, p_participant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_group JSONB;
BEGIN
  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'role', p.fixed_role,
    'phone', p.phone
  ))
  INTO v_group
  FROM public.participants p
  WHERE p.id IN (
    SELECT b_participant_id FROM public.participant_companions
    WHERE event_id = p_event_id AND a_participant_id = p_participant_id
    UNION
    SELECT a_participant_id FROM public.participant_companions
    WHERE event_id = p_event_id AND b_participant_id = p_participant_id
    UNION
    SELECT p_participant_id
  )
  AND p.event_id = p_event_id;

  RETURN COALESCE(v_group, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_companion_group(UUID, UUID) TO authenticated;

-- 5) Unlink companions
CREATE OR REPLACE FUNCTION public.unlink_companions(p_event_id UUID, p_a_id UUID, p_b_id UUID)
RETURNS JSONB AS $$
BEGIN
  DELETE FROM public.participant_companions
  WHERE event_id = p_event_id
    AND (
      (a_participant_id = p_a_id AND b_participant_id = p_b_id)
      OR (a_participant_id = p_b_id AND b_participant_id = p_a_id)
    );

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.unlink_companions(UUID, UUID, UUID) TO authenticated;

-- RLS Policies
ALTER TABLE public.participant_companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY participant_companions_select ON public.participant_companions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = participant_companions.event_id
        AND (
          has_event_access(auth.uid(), e.id) 
          OR has_role(auth.uid(), 'master'::app_role)
        )
    )
  );

CREATE POLICY participant_companions_insert ON public.participant_companions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = participant_companions.event_id
        AND (
          has_event_access(auth.uid(), e.id) 
          OR has_role(auth.uid(), 'master'::app_role)
        )
    )
  );

CREATE POLICY participant_companions_delete ON public.participant_companions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = participant_companions.event_id
        AND (
          has_event_access(auth.uid(), e.id) 
          OR has_role(auth.uid(), 'master'::app_role)
        )
    )
  );