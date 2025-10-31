-- Phase 77-G: AI 룸핑 재배정 with 요청사항 가중치 반영

CREATE OR REPLACE FUNCTION public.ai_auto_assign_rooms_v2(p_event_id UUID, p_dry_run BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_participant RECORD;
  v_assigned INT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
  v_target_room_type_id UUID;
  v_score_total INT;
  v_role_weight INT;
  v_comp_weight INT;
  v_req_weight INT;
  v_req_text TEXT;
BEGIN
  FOR v_participant IN
    SELECT 
      p.*,
      COALESCE(
        string_agg(pr.request_value, '|') FILTER (WHERE pr.id IS NOT NULL),
        ''
      ) AS requests
    FROM participants p
    LEFT JOIN participant_requests pr ON pr.participant_id = p.id AND pr.event_id = p_event_id
    WHERE p.event_id = p_event_id AND p.is_active = TRUE
    GROUP BY p.id
  LOOP
    -- 역할 가중치
    v_role_weight := CASE 
      WHEN v_participant.fixed_role = '좌장' THEN 20
      WHEN v_participant.fixed_role = '연자' THEN 15
      ELSE 10
    END;

    -- 인원 기반 가중치 (소아 포함 시 +)
    v_comp_weight := COALESCE((v_participant.composition->>'child')::INT, 0) * 10
                   + COALESCE((v_participant.composition->>'infant')::INT, 0) * 15;

    -- 요청사항 기반 가중치 계산
    v_req_weight := 0;
    v_req_text := COALESCE(v_participant.requests, '');

    IF v_req_text ILIKE '%오션뷰%' OR v_req_text ILIKE '%ocean%' THEN 
      v_req_weight := v_req_weight + 15; 
    END IF;
    IF v_req_text ILIKE '%시티뷰%' OR v_req_text ILIKE '%city%' THEN 
      v_req_weight := v_req_weight + 10; 
    END IF;
    IF v_req_text ILIKE '%고층%' OR v_req_text ILIKE '%high%' THEN 
      v_req_weight := v_req_weight + 10; 
    END IF;
    IF v_req_text ILIKE '%저층%' OR v_req_text ILIKE '%low%' THEN 
      v_req_weight := v_req_weight + 5; 
    END IF;
    IF v_req_text ILIKE '%금연%' OR v_req_text ILIKE '%non%smoking%' THEN 
      v_req_weight := v_req_weight + 10; 
    END IF;
    IF v_req_text ILIKE '%흡연%' AND NOT (v_req_text ILIKE '%금연%') THEN 
      v_req_weight := v_req_weight + 5; 
    END IF;
    IF v_req_text ILIKE '%아기침대%' OR v_req_text ILIKE '%infant%' OR v_req_text ILIKE '%crib%' THEN 
      v_req_weight := v_req_weight + 10; 
    END IF;
    IF v_req_text ILIKE '%엑스트라%' OR v_req_text ILIKE '%extra%bed%' THEN 
      v_req_weight := v_req_weight + 8; 
    END IF;
    IF v_req_text ILIKE '%가습기%' OR v_req_text ILIKE '%humidifier%' THEN 
      v_req_weight := v_req_weight + 4; 
    END IF;
    IF v_req_text ILIKE '%공기청정기%' OR v_req_text ILIKE '%purifier%' THEN 
      v_req_weight := v_req_weight + 4; 
    END IF;

    v_score_total := v_role_weight + v_comp_weight + v_req_weight;

    -- 배정 로직 (요청사항 + 점수 반영)
    SELECT err.id INTO v_target_room_type_id
    FROM public.event_room_refs err
    JOIN public.room_types rt ON err.room_type_id = rt.id
    WHERE err.event_id = p_event_id
      AND err.is_active = TRUE
    ORDER BY 
      -- 요청사항이 많거나 역할이 중요할수록 상위 객실 우선
      (CASE 
        WHEN v_score_total >= 40 AND (rt.type_name ILIKE '%스위트%' OR rt.type_name ILIKE '%suite%') THEN 1
        WHEN v_score_total >= 30 AND (rt.type_name ILIKE '%패밀리%' OR rt.type_name ILIKE '%family%') THEN 2
        WHEN v_score_total >= 20 AND (rt.type_name ILIKE '%프리미엄%' OR rt.type_name ILIKE '%premium%') THEN 3
        ELSE 4
      END),
      err.credit ASC,
      rt.default_credit ASC
    LIMIT 1;

    -- 배정 저장 (dry_run이 아닐 때만)
    IF NOT p_dry_run AND v_target_room_type_id IS NOT NULL THEN
      INSERT INTO rooming_participants(
        event_id, 
        participant_id, 
        room_type_id, 
        room_status, 
        manual_assigned, 
        assigned_at, 
        is_active
      )
      VALUES (
        p_event_id, 
        v_participant.id, 
        v_target_room_type_id, 
        'AI가중배정', 
        FALSE, 
        now(), 
        TRUE
      )
      ON CONFLICT (event_id, participant_id)
      DO UPDATE SET 
        room_type_id = EXCLUDED.room_type_id, 
        room_status = 'AI가중배정', 
        updated_at = now();
      
      v_assigned := v_assigned + 1;
      
      -- 매칭 로그 기록
      INSERT INTO rooming_match_logs(
        event_id,
        participant_id,
        room_type_id,
        match_score,
        match_reason
      )
      VALUES (
        p_event_id,
        v_participant.id,
        v_target_room_type_id,
        v_score_total,
        format('역할:%s점 / 인원:%s점 / 요청:%s점 = 총 %s점', 
               v_role_weight, v_comp_weight, v_req_weight, v_score_total)
      )
      ON CONFLICT (event_id, participant_id) 
      DO UPDATE SET
        room_type_id = EXCLUDED.room_type_id,
        match_score = EXCLUDED.match_score,
        match_reason = EXCLUDED.match_reason,
        created_at = now();
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'success', TRUE,
    'assigned', v_assigned,
    'errors', v_errors,
    'warnings', v_warnings,
    'mode', CASE WHEN p_dry_run THEN 'dry_run' ELSE 'live' END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_auto_assign_rooms_v2 TO authenticated;