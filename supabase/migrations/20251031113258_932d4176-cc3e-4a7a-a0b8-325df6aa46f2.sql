-- Phase 77-RPC-AI-MEMO-FIX: Allow empty memo rows to pass through
-- Remove CONTINUE to keep data even when AI extraction is skipped

CREATE OR REPLACE FUNCTION public.ai_extract_requests_from_memo(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_text TEXT;
  v_clean TEXT;
  v_request JSONB;
  v_is_request BOOLEAN;
  v_has_keyword BOOLEAN;
  v_confident_requests INTEGER := 0;
  v_review_required INTEGER := 0;
  v_skipped INTEGER := 0;
  v_total_processed INTEGER := 0;
BEGIN
  -- memo 컬럼 존재 여부 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'participants'
      AND column_name = 'memo'
  ) THEN
    RETURN jsonb_build_object(
      'error', 'memo_column_missing',
      'message', 'participants.memo column does not exist'
    );
  END IF;

  FOR rec IN
    SELECT id, name, organization,
           COALESCE(memo, request_note, '') AS note_field
    FROM public.participants
    WHERE event_id = p_event_id
  LOOP
    v_total_processed := v_total_processed + 1;
    v_text := TRIM(rec.note_field);

    -- [수정된 부분 시작]
    -- memo가 비어있어도 데이터는 유지하고 AI 추출만 스킵
    IF v_text IS NULL OR v_text = '' THEN
      v_skipped := v_skipped + 1;
      INSERT INTO participants_log(event_id, participant_id, action, context_json)
      VALUES (
        p_event_id,
        rec.id,
        'skip_request_extraction',
        jsonb_build_object('reason', 'empty_memo', 'name', rec.name, 'organization', rec.organization)
      );
      -- 기존 CONTINUE 제거: 데이터는 그대로 유지하고 AI 추출만 스킵
    ELSE
      v_clean := regexp_replace(v_text, E'[\\n\\r\\t]+', ' ', 'g');
      v_clean := regexp_replace(v_clean, E'\\s{2,}', ' ', 'g');

      v_has_keyword := v_clean ~* '(요청|필요|희망|원함|부탁|숙박|룸|객실|투숙|동반|특이|비고|추가|변경)';
      v_is_request := v_has_keyword AND v_clean ~* '(해주세요|해주시기|필요합니다|부탁드립니다|변경|요청합니다|예약)';

      IF v_is_request THEN
        v_confident_requests := v_confident_requests + 1;
        v_request := jsonb_build_object(
          'participant_id', rec.id,
          'name', rec.name,
          'organization', rec.organization,
          'detected_text', v_clean,
          'type', 'AI_CONFIDENT',
          'timestamp', now()
        );

        INSERT INTO participants_log(event_id, participant_id, action, context_json)
        VALUES (p_event_id, rec.id, 'request_extracted', v_request);

      ELSE
        v_review_required := v_review_required + 1;
        v_request := jsonb_build_object(
          'participant_id', rec.id,
          'name', rec.name,
          'organization', rec.organization,
          'raw_memo', v_clean,
          'type', 'HUMAN_REVIEW_REQUIRED',
          'timestamp', now()
        );

        INSERT INTO participants_log(event_id, participant_id, action, context_json)
        VALUES (p_event_id, rec.id, 'request_review_pending', v_request);
      END IF;
    END IF;
    -- [수정된 부분 끝]
  END LOOP;

  RETURN jsonb_build_object(
    'confident_requests', v_confident_requests,
    'review_required', v_review_required,
    'skipped', v_skipped,
    'total_processed', v_total_processed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_extract_requests_from_memo(uuid)
  TO authenticated, service_role;