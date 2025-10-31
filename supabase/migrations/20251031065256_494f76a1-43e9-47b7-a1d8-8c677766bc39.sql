-- [Phase 77-A] AI 룸핑 자동 매칭 RPC 함수

CREATE OR REPLACE FUNCTION public.ai_auto_assign_rooms(
  p_event_id UUID,
  p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_run_id UUID := gen_random_uuid();
  v_result JSONB := '{"assigned": 0, "warnings": [], "errors": []}'::jsonb;
  v_participant RECORD;
  v_room_type RECORD;
  v_assigned_count INTEGER := 0;
  v_warnings JSONB := '[]'::jsonb;
  v_errors JSONB := '[]'::jsonb;
  v_stock_check JSONB;
BEGIN
  -- 1. 이미 수동 배정된 참가자는 제외하고 처리
  FOR v_participant IN
    SELECT 
      p.id AS participant_id,
      p.name,
      p.fixed_role,
      p.custom_role,
      p.adult_count,
      p.child_count,
      p.child_ages,
      p.companion,
      p.room_preference,
      p.composition,
      rp.id AS rooming_id,
      rp.manual_assigned
    FROM public.participants p
    LEFT JOIN public.rooming_participants rp ON rp.participant_id = p.id AND rp.event_id = p_event_id
    WHERE p.event_id = p_event_id 
      AND p.is_active = TRUE
      AND (rp.manual_assigned IS NULL OR rp.manual_assigned = FALSE)
    ORDER BY p.participant_no
  LOOP
    DECLARE
      v_target_room_type_id UUID;
      v_match_reason TEXT := '';
      v_match_score NUMERIC := 0;
      v_child_ages_array TEXT[];
      v_max_child_age INTEGER := 0;
      v_adult_count INTEGER;
      v_child_count INTEGER;
    BEGIN
      -- composition JSONB에서 인원 정보 추출
      v_adult_count := COALESCE((v_participant.composition->>'adult')::INTEGER, v_participant.adult_count, 1);
      v_child_count := COALESCE((v_participant.composition->>'child')::INTEGER, v_participant.child_count, 0);
      
      -- child_ages 배열에서 최대 나이 계산
      IF v_participant.child_ages IS NOT NULL AND array_length(v_participant.child_ages, 1) > 0 THEN
        SELECT MAX(age::INTEGER) INTO v_max_child_age
        FROM unnest(v_participant.child_ages) AS age
        WHERE age ~ '^\d+$';
      END IF;

      -- 2️⃣ 인원·연령 기반 룸타입 결정 로직
      IF v_child_count = 0 AND v_adult_count <= 2 THEN
        -- 성인만 1-2명 → 킹 또는 더블
        SELECT err.id INTO v_target_room_type_id
        FROM public.event_room_refs err
        JOIN public.room_types rt ON err.room_type_id = rt.id
        WHERE err.event_id = p_event_id 
          AND err.is_active = TRUE
          AND (rt.type_name ILIKE '%킹%' OR rt.type_name ILIKE '%더블%')
        ORDER BY err.credit ASC
        LIMIT 1;
        v_match_reason := '성인 ' || v_adult_count || '명 기본 배정';
        v_match_score := 90;

      ELSIF v_child_count >= 1 AND v_max_child_age <= 2 THEN
        -- 소아 1명 + 영유아(0-2세) → 킹 + 아기침대
        SELECT err.id INTO v_target_room_type_id
        FROM public.event_room_refs err
        JOIN public.room_types rt ON err.room_type_id = rt.id
        WHERE err.event_id = p_event_id 
          AND err.is_active = TRUE
          AND rt.type_name ILIKE '%킹%'
        ORDER BY err.credit ASC
        LIMIT 1;
        v_match_reason := '영유아(' || v_max_child_age || '세) 포함 - 킹룸 + 아기침대 필요';
        v_match_score := 85;
        
        -- 필수 요청사항 자동 등록
        IF NOT p_dry_run THEN
          INSERT INTO public.participant_requests (participant_id, event_id, request_type, request_value, priority)
          VALUES (v_participant.participant_id, p_event_id, 'equipment', '아기침대', 1),
                 (v_participant.participant_id, p_event_id, 'equipment', '침대가드', 1)
          ON CONFLICT (participant_id, request_type, request_value) DO NOTHING;
        END IF;

      ELSIF v_child_count >= 1 AND v_max_child_age BETWEEN 3 AND 5 THEN
        -- 소아 1명 + 유아(3-5세) → 패밀리 트윈 + 엑스트라베드
        SELECT err.id INTO v_target_room_type_id
        FROM public.event_room_refs err
        JOIN public.room_types rt ON err.room_type_id = rt.id
        WHERE err.event_id = p_event_id 
          AND err.is_active = TRUE
          AND (rt.type_name ILIKE '%패밀리%' OR rt.type_name ILIKE '%트윈%')
        ORDER BY err.credit ASC
        LIMIT 1;
        v_match_reason := '유아(' || v_max_child_age || '세) 포함 - 패밀리 트윈 + 엑스트라베드';
        v_match_score := 85;
        
        IF NOT p_dry_run THEN
          INSERT INTO public.participant_requests (participant_id, event_id, request_type, request_value, priority)
          VALUES (v_participant.participant_id, p_event_id, 'equipment', '엑스트라베드', 1),
                 (v_participant.participant_id, p_event_id, 'equipment', '침대가드', 1)
          ON CONFLICT (participant_id, request_type, request_value) DO NOTHING;
        END IF;

      ELSIF v_child_count >= 1 AND v_max_child_age >= 6 THEN
        -- 소아 1명 + 어린이(6세 이상) → 패밀리 트윈 + 엑스트라베드
        SELECT err.id INTO v_target_room_type_id
        FROM public.event_room_refs err
        JOIN public.room_types rt ON err.room_type_id = rt.id
        WHERE err.event_id = p_event_id 
          AND err.is_active = TRUE
          AND (rt.type_name ILIKE '%패밀리%' OR rt.type_name ILIKE '%트윈%')
        ORDER BY err.credit ASC
        LIMIT 1;
        v_match_reason := '어린이(' || v_max_child_age || '세) 포함 - 패밀리 트윈 + 엑스트라베드';
        v_match_score := 85;
        
        IF NOT p_dry_run THEN
          INSERT INTO public.participant_requests (participant_id, event_id, request_type, request_value, priority)
          VALUES (v_participant.participant_id, p_event_id, 'equipment', '엑스트라베드', 1)
          ON CONFLICT (participant_id, request_type, request_value) DO NOTHING;
        END IF;

      ELSIF v_child_count >= 2 THEN
        -- 소아 2명 이상 → 스위트 + 엑스트라베드
        SELECT err.id INTO v_target_room_type_id
        FROM public.event_room_refs err
        JOIN public.room_types rt ON err.room_type_id = rt.id
        WHERE err.event_id = p_event_id 
          AND err.is_active = TRUE
          AND (rt.type_name ILIKE '%스위트%' OR rt.type_name ILIKE '%suite%')
        ORDER BY err.credit DESC
        LIMIT 1;
        
        -- 스위트가 없으면 패밀리로 대체
        IF v_target_room_type_id IS NULL THEN
          SELECT err.id INTO v_target_room_type_id
          FROM public.event_room_refs err
          JOIN public.room_types rt ON err.room_type_id = rt.id
          WHERE err.event_id = p_event_id 
            AND err.is_active = TRUE
            AND rt.type_name ILIKE '%패밀리%'
          ORDER BY err.credit DESC
          LIMIT 1;
          v_match_reason := '소아 ' || v_child_count || '명 - 패밀리룸 배정 (스위트 부족)';
          v_match_score := 70;
          v_warnings := v_warnings || jsonb_build_object(
            'participant', v_participant.name,
            'message', '스위트룸이 부족하여 패밀리룸으로 대체 배정'
          );
        ELSE
          v_match_reason := '소아 ' || v_child_count || '명 - 스위트룸 배정';
          v_match_score := 90;
        END IF;
        
        IF NOT p_dry_run THEN
          INSERT INTO public.participant_requests (participant_id, event_id, request_type, request_value, priority)
          VALUES (v_participant.participant_id, p_event_id, 'equipment', '엑스트라베드', 1)
          ON CONFLICT (participant_id, request_type, request_value) DO NOTHING;
        END IF;

      ELSE
        -- 기본 룰: 역할 기반 배정
        IF v_participant.fixed_role = '좌장' THEN
          SELECT err.id INTO v_target_room_type_id
          FROM public.event_room_refs err
          JOIN public.room_types rt ON err.room_type_id = rt.id
          WHERE err.event_id = p_event_id AND err.is_active = TRUE AND rt.type_name ILIKE '%킹%'
          ORDER BY err.credit DESC LIMIT 1;
          v_match_reason := '좌장 역할 기반 배정';
          v_match_score := 80;
        ELSIF v_participant.fixed_role = '연자' THEN
          SELECT err.id INTO v_target_room_type_id
          FROM public.event_room_refs err
          JOIN public.room_types rt ON err.room_type_id = rt.id
          WHERE err.event_id = p_event_id AND err.is_active = TRUE AND rt.type_name ILIKE '%더블%'
          ORDER BY err.credit ASC LIMIT 1;
          v_match_reason := '연자 역할 기반 배정';
          v_match_score := 80;
        ELSE
          -- 일반 참석자: 가장 저렴한 객실
          SELECT err.id INTO v_target_room_type_id
          FROM public.event_room_refs err
          WHERE err.event_id = p_event_id AND err.is_active = TRUE
          ORDER BY err.credit ASC LIMIT 1;
          v_match_reason := '일반 참석자 기본 배정';
          v_match_score := 75;
        END IF;
      END IF;

      -- 3️⃣ 매칭 결과 저장 (Dry Run이 아닐 경우)
      IF v_target_room_type_id IS NOT NULL THEN
        IF NOT p_dry_run THEN
          -- rooming_participants 업데이트 또는 삽입
          INSERT INTO public.rooming_participants (
            event_id, participant_id, room_type_id, room_status, manual_assigned, assigned_at, is_active
          ) VALUES (
            p_event_id, v_participant.participant_id, v_target_room_type_id, '자동배정', FALSE, now(), TRUE
          )
          ON CONFLICT (event_id, participant_id) 
          DO UPDATE SET 
            room_type_id = EXCLUDED.room_type_id,
            room_status = EXCLUDED.room_status,
            manual_assigned = FALSE,
            assigned_at = now(),
            updated_at = now();
          
          -- 매칭 로그 기록
          INSERT INTO public.rooming_match_logs (
            event_id, match_run_id, participant_id, matched_room_type_id, match_reason, match_score
          ) VALUES (
            p_event_id, v_match_run_id, v_participant.participant_id, v_target_room_type_id, v_match_reason, v_match_score
          );
        END IF;
        
        v_assigned_count := v_assigned_count + 1;
      ELSE
        v_errors := v_errors || jsonb_build_object(
          'participant', v_participant.name,
          'message', '적합한 객실 타입을 찾을 수 없습니다'
        );
      END IF;

    END;
  END LOOP;

  -- 4️⃣ 객실 재고 부족 감지
  SELECT jsonb_agg(
    jsonb_build_object(
      'room_type', rt.type_name,
      'needed', needed_count,
      'available', err.stock,
      'shortage', needed_count - err.stock
    )
  ) INTO v_stock_check
  FROM (
    SELECT room_type_id, COUNT(*) AS needed_count
    FROM public.rooming_participants
    WHERE event_id = p_event_id AND room_type_id IS NOT NULL
    GROUP BY room_type_id
  ) AS demand
  JOIN public.event_room_refs err ON err.id = demand.room_type_id
  JOIN public.room_types rt ON rt.id = err.room_type_id
  WHERE demand.needed_count > err.stock;

  IF v_stock_check IS NOT NULL THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'stock_shortage',
      'details', v_stock_check
    );
  END IF;

  -- 5️⃣ 결과 반환
  v_result := jsonb_build_object(
    'success', TRUE,
    'match_run_id', v_match_run_id,
    'assigned', v_assigned_count,
    'warnings', v_warnings,
    'errors', v_errors,
    'dry_run', p_dry_run
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.ai_auto_assign_rooms IS 'Phase 77-A: AI 기반 룸핑 자동 매칭 함수 (인원/연령/역할 기반)';

-- RPC 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.ai_auto_assign_rooms TO authenticated;