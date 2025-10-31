-- Phase 77-F: AI-based request extraction from memo field

-- 1. Create request_category enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_category') THEN
    CREATE TYPE request_category AS ENUM ('equipment','preference','view','floor','smoking','note');
  END IF;
END$$;

-- 2. Extend participant_requests schema
ALTER TABLE public.participant_requests
  ADD COLUMN IF NOT EXISTS category request_category DEFAULT 'equipment',
  ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_requests_event_participant
  ON public.participant_requests(event_id, participant_id);

-- 3. AI extraction function
CREATE OR REPLACE FUNCTION public.ai_extract_requests_from_memo(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  rec RECORD;
  v_out JSONB := '[]'::JSONB;
  v_text TEXT;
BEGIN
  FOR rec IN
    SELECT id, event_id, memo, request_note
    FROM public.participants
    WHERE event_id = p_event_id 
      AND (memo IS NOT NULL OR request_note IS NOT NULL)
      AND (length(trim(COALESCE(memo, ''))) > 0 OR length(trim(COALESCE(request_note, ''))) > 0)
  LOOP
    v_text := lower(COALESCE(rec.memo, '') || ' ' || COALESCE(rec.request_note, ''));

    -- Equipment (Priority 1)
    IF v_text ~ '(아기침대|infant|crib|baby bed)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'equipment',
        'request_value', '아기침대',
        'priority', 1,
        'confidence', 0.95
      );
    END IF;
    
    IF v_text ~ '(침대 ?가드|bed ?guard|베드 ?가드)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'equipment',
        'request_value', '침대가드',
        'priority', 1,
        'confidence', 0.9
      );
    END IF;
    
    IF v_text ~ '(엑스트라 ?베드|extra ?bed|추가 ?침대)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'equipment',
        'request_value', '엑스트라베드',
        'priority', 1,
        'confidence', 0.95
      );
    END IF;
    
    -- Equipment (Priority 2)
    IF v_text ~ '(가습기|humidifier)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'equipment',
        'request_value', '가습기',
        'priority', 2,
        'confidence', 0.8
      );
    END IF;
    
    IF v_text ~ '(공기청정기|air purifier|청정기)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'equipment',
        'request_value', '공기청정기',
        'priority', 2,
        'confidence', 0.8
      );
    END IF;

    -- View (Priority 4)
    IF v_text ~ '(오션 ?뷰|바다 ?뷰|harbor|sea ?view|ocean view)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'view',
        'request_value', '오션뷰',
        'priority', 4,
        'confidence', 0.8
      );
    END IF;
    
    IF v_text ~ '(시티 ?뷰|city ?view|도심 ?뷰)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'view',
        'request_value', '시티뷰',
        'priority', 4,
        'confidence', 0.8
      );
    END IF;

    -- Floor (Priority 3)
    IF v_text ~ '(고층|높은 ?층|high ?floor)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'floor',
        'request_value', '고층',
        'priority', 3,
        'confidence', 0.8
      );
    END IF;
    
    IF v_text ~ '(저층|낮은 ?층|low ?floor)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'floor',
        'request_value', '저층',
        'priority', 3,
        'confidence', 0.8
      );
    END IF;

    -- Smoking (Priority 3, 금연 우선)
    IF v_text ~ '(금연|non[- ]?smoking|non smoking)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'smoking',
        'request_value', '금연',
        'priority', 3,
        'confidence', 0.9
      );
    ELSIF v_text ~ '(흡연|smoking)' THEN
      v_out := v_out || jsonb_build_object(
        'participant_id', rec.id,
        'category', 'smoking',
        'request_value', '흡연',
        'priority', 3,
        'confidence', 0.75
      );
    END IF;
  END LOOP;

  RETURN v_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_extract_requests_from_memo TO authenticated;

-- 4. Apply extracted requests function
CREATE OR REPLACE FUNCTION public.apply_extracted_requests(p_event_id UUID, p_items JSONB)
RETURNS VOID AS $$
DECLARE 
  it JSONB;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.participant_requests(
      event_id, 
      participant_id, 
      category, 
      request_type, 
      request_value, 
      priority, 
      confidence
    )
    VALUES (
      p_event_id,
      (it->>'participant_id')::uuid,
      (it->>'category')::request_category,
      it->>'category',
      it->>'request_value',
      COALESCE((it->>'priority')::int, 3),
      COALESCE((it->>'confidence')::numeric, 0.8)
    )
    ON CONFLICT (event_id, participant_id, request_type, request_value)
      DO UPDATE SET 
        priority = LEAST(participant_requests.priority, EXCLUDED.priority),
        confidence = GREATEST(participant_requests.confidence, EXCLUDED.confidence),
        updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.apply_extracted_requests TO authenticated;