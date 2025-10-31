-- Phase 77-RPC-AI-COMPANION-MATCH.v1
-- 목적: 업로드 완료 후 동반의료인 감지를 별도 수행

CREATE OR REPLACE FUNCTION public.ai_match_companion_after_upload(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_detected JSONB;
  v_total INTEGER := 0;
  v_matched INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT id, name, memo, request_note
    FROM public.participants
    WHERE event_id = p_event_id
  LOOP
    v_total := v_total + 1;

    -- "동반", "의료인", "원장", "부부" 등 키워드 탐지
    IF COALESCE(rec.memo, rec.request_note, '') ~* '(동반|원장|의료인|부부|함께)' THEN
      v_detected := jsonb_build_object(
        'keyword_detected', TRUE,
        'source_text', COALESCE(rec.memo, rec.request_note, ''),
        'timestamp', now()
      );

      UPDATE public.participants
      SET companion_info = v_detected
      WHERE id = rec.id;

      INSERT INTO public.participants_log(event_id, participant_id, action, context_json)
      VALUES (p_event_id, rec.id, 'companion_detected', v_detected);

      v_matched := v_matched + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_checked', v_total,
    'matched', v_matched
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_match_companion_after_upload(uuid)
  TO authenticated, service_role;