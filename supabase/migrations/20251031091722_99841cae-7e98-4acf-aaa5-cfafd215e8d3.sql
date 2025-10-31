-- Phase 77-FIX.AI-MEMO-PRO.HUMAN: Preserve unclear memos + auto-recognition logging

-- 1️⃣ Replace AI extraction function with confidence-based categorization
CREATE OR REPLACE FUNCTION public.ai_extract_requests_from_memo(p_event_id UUID)
RETURNS JSONB
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
  v_confident_count INT := 0;
  v_review_count INT := 0;
  v_skip_count INT := 0;
BEGIN
  FOR rec IN
    SELECT id, name, organization,
           COALESCE(memo, request_note, '') AS note_field
    FROM public.participants
    WHERE event_id = p_event_id
  LOOP
    v_text := TRIM(rec.note_field);

    -- Skip empty memos but log it
    IF v_text IS NULL OR v_text = '' THEN
      INSERT INTO participants_log(event_id, participant_id, action, context_json, created_at)
      VALUES (p_event_id, rec.id, 'skip_request_extraction',
              jsonb_build_object('reason','empty_memo','name',rec.name,'organization',rec.organization),
              now());
      v_skip_count := v_skip_count + 1;
      CONTINUE;
    END IF;

    -- Basic text cleanup
    v_clean := regexp_replace(v_text, E'[\\n\\r\\t]+', ' ', 'g');
    v_clean := regexp_replace(v_clean, E'\\s{2,}', ' ', 'g');
    v_clean := TRIM(v_clean);

    -- Detect key request keywords
    v_has_keyword := v_clean ~* '(요청|필요|희망|원함|부탁|숙박|룸|객실|투숙|동반|특이|비고|추가|변경|배정|층|금연|흡연|조식|트윈|더블|싱글)';

    -- AI context analysis - confident request detection
    v_is_request := v_has_keyword AND v_clean ~* '(해주세요|해주시기|필요합니다|부탁드립니다|변경|요청합니다|예약|배정|조정|확인|가능|불가능|원합니다)';

    IF v_is_request THEN
      -- ✅ Clear request sentence → auto-log as AI_CONFIDENT
      v_request := jsonb_build_object(
        'participant_id', rec.id,
        'name', rec.name,
        'organization', rec.organization,
        'detected_text', v_clean,
        'type', 'AI_CONFIDENT',
        'timestamp', now()
      );

      INSERT INTO participants_log(event_id, participant_id, action, context_json, created_at)
      VALUES (p_event_id, rec.id, 'request_extracted', v_request, now());
      
      v_confident_count := v_confident_count + 1;

    ELSE
      -- ⚠️ Has meaning but ambiguous → preserve for human review
      v_request := jsonb_build_object(
        'participant_id', rec.id,
        'name', rec.name,
        'organization', rec.organization,
        'raw_memo', v_clean,
        'type', 'HUMAN_REVIEW_REQUIRED',
        'timestamp', now()
      );

      INSERT INTO participants_log(event_id, participant_id, action, context_json, created_at)
      VALUES (p_event_id, rec.id, 'request_review_pending', v_request, now());
      
      v_review_count := v_review_count + 1;
    END IF;
  END LOOP;

  -- Return summary
  RETURN jsonb_build_object(
    'confident_requests', v_confident_count,
    'review_required', v_review_count,
    'skipped', v_skip_count,
    'total_processed', v_confident_count + v_review_count + v_skip_count
  );

EXCEPTION 
  WHEN undefined_column THEN
    INSERT INTO participants_log(event_id, action, context_json, created_at)
    VALUES (p_event_id, 'skip_all_request_extraction',
            jsonb_build_object('reason','memo_column_missing'), now());
    RAISE NOTICE '⚠️ memo column not found — safely skipped extraction.';
    RETURN jsonb_build_object('error', 'memo_column_missing');
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error in ai_extract_requests_from_memo: %', SQLERRM;
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_extract_requests_from_memo TO authenticated;

COMMENT ON FUNCTION public.ai_extract_requests_from_memo IS 
'Phase 77-FIX.AI-MEMO-PRO.HUMAN: Extracts clear requests while preserving ambiguous memos for human review';
