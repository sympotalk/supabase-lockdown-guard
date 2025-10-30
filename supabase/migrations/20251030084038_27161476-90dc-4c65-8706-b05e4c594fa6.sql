-- [Phase 73-L.7.10] Hotfix: UNIQUE 제약 + 필수값 Guard 추가

-- A-1. phone이 비어있거나 공백인 레코드 제거
DELETE FROM public.participants
WHERE phone IS NULL OR TRIM(phone) = '';

-- A-2. (event_id, name, phone) 중복 정리 (최신 것만 유지)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY event_id, name, phone 
           ORDER BY created_at DESC
         ) as rn
  FROM public.participants
  WHERE phone IS NOT NULL AND TRIM(phone) != ''
)
DELETE FROM public.participants
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- A-3. UNIQUE 제약 추가
ALTER TABLE public.participants
ADD CONSTRAINT uq_participants_event_name_phone 
UNIQUE (event_id, name, phone);

-- B-1. RPC 함수 재작성 (필수값 Guard 추가)
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean) CASCADE;

CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_data jsonb,
  p_replace boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted int := 0;
  v_updated  int := 0;
  v_skipped  int := 0;
  v_agency_id uuid;
  v_session_id text := gen_random_uuid()::text;
  v_row jsonb;
  v_name text;
  v_phone text;
BEGIN
  -- 행사 → agency_id 획득
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- Replace 모드: 완전 삭제
  IF p_replace THEN
    DELETE FROM public.rooming_participants WHERE event_id = p_event_id;
    DELETE FROM public.participants_log WHERE participant_id IN (
      SELECT id FROM public.participants WHERE event_id = p_event_id
    );
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- 각 행 처리
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    -- ✅ 필수값 Guard: name/phone 공백이면 즉시 skip
    v_name := COALESCE(
      NULLIF(TRIM((v_row->>'name')::text), ''),
      NULLIF(TRIM((v_row->>'고객 성명')::text), ''),
      NULLIF(TRIM((v_row->>'성명')::text), ''),
      NULLIF(TRIM((v_row->>'이름')::text), '')
    );
    
    v_phone := COALESCE(
      NULLIF(TRIM((v_row->>'phone')::text), ''),
      NULLIF(TRIM((v_row->>'고객 연락처')::text), ''),
      NULLIF(TRIM((v_row->>'연락처')::text), ''),
      NULLIF(TRIM((v_row->>'전화번호')::text), '')
    );

    IF v_name IS NULL OR v_phone IS NULL THEN
      v_skipped := v_skipped + 1;
      
      -- 누락 필드 로깅
      BEGIN
        INSERT INTO public.logs(
          event_id, actor_role, action, target_table, payload, created_by, created_at, agency_id
        ) VALUES (
          p_event_id, 'system', 'participant_import_skip_missing_required', 'participants',
          jsonb_build_object(
            'session_id', v_session_id,
            'reason', CASE 
              WHEN v_name IS NULL AND v_phone IS NULL THEN 'name_and_phone_missing'
              WHEN v_name IS NULL THEN 'name_missing'
              ELSE 'phone_missing'
            END,
            'record_sample', v_row
          ),
          auth.uid(), NOW(), v_agency_id
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
      
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO public.participants (
        event_id, agency_id,
        name, phone, email, organization,
        memo, manager_info,
        role_badge, call_status, is_active,
        sfe_agency_code, sfe_customer_code, composition
      )
      VALUES (
        p_event_id, v_agency_id,
        v_name,
        v_phone,
        
        -- email
        COALESCE(
          NULLIF(TRIM((v_row->>'email')::text), ''),
          NULLIF(TRIM((v_row->>'이메일')::text), '')
        ),
        
        -- organization
        COALESCE(
          NULLIF(TRIM((v_row->>'organization')::text), ''),
          NULLIF(TRIM((v_row->>'거래처명')::text), ''),
          NULLIF(TRIM((v_row->>'소속')::text), ''),
          NULLIF(TRIM((v_row->>'회사')::text), '')
        ),
        
        -- memo
        NULLIF(TRIM((v_row->>'memo')::text), ''),
        
        -- manager_info (JSONB)
        CASE
          WHEN (v_row ? 'manager_name') OR (v_row ? 'manager_phone') OR (v_row ? 'manager_email')
               OR (v_row ? '담당자 성명') OR (v_row ? '담당자 연락처') OR (v_row ? '담당자 이메일')
               OR (v_row ? '팀명') OR (v_row ? '담당자 사번')
          THEN jsonb_strip_nulls(jsonb_build_object(
                 'name', COALESCE(
                   NULLIF(TRIM((v_row->>'manager_name')::text), ''),
                   NULLIF(TRIM((v_row->>'담당자 성명')::text), '')
                 ),
                 'phone', COALESCE(
                   NULLIF(TRIM((v_row->>'manager_phone')::text), ''),
                   NULLIF(TRIM((v_row->>'담당자 연락처')::text), '')
                 ),
                 'email', COALESCE(
                   NULLIF(TRIM((v_row->>'manager_email')::text), ''),
                   NULLIF(TRIM((v_row->>'담당자 이메일')::text), '')
                 ),
                 'department', COALESCE(
                   NULLIF(TRIM((v_row->>'department')::text), ''),
                   NULLIF(TRIM((v_row->>'팀명')::text), '')
                 ),
                 'emp_id', COALESCE(
                   NULLIF(TRIM((v_row->>'emp_id')::text), ''),
                   NULLIF(TRIM((v_row->>'담당자 사번')::text), '')
                 )
               ))
          ELSE NULL
        END,
        
        '참석자',  -- role_badge
        '대기중',  -- call_status
        TRUE,      -- is_active
        
        -- SFE codes
        COALESCE(
          NULLIF(TRIM((v_row->>'sfe_agency_code')::text), ''),
          NULLIF(TRIM((v_row->>'SFE 거래처코드')::text), '')
        ),
        COALESCE(
          NULLIF(TRIM((v_row->>'sfe_customer_code')::text), ''),
          NULLIF(TRIM((v_row->>'SFE 고객코드')::text), '')
        ),
        
        -- composition
        COALESCE((v_row->'composition')::jsonb, '{"adult": 1, "child": 0, "infant": 0}'::jsonb)
      )
      ON CONFLICT (event_id, name, phone) DO UPDATE
      SET organization = EXCLUDED.organization,
          email        = EXCLUDED.email,
          memo         = EXCLUDED.memo,
          manager_info = EXCLUDED.manager_info,
          sfe_agency_code   = COALESCE(EXCLUDED.sfe_agency_code, participants.sfe_agency_code),
          sfe_customer_code = COALESCE(EXCLUDED.sfe_customer_code, participants.sfe_customer_code),
          composition  = COALESCE(EXCLUDED.composition, participants.composition),
          updated_at   = NOW();

      v_inserted := v_inserted + 1;

      -- 로그 적재
      INSERT INTO public.participants_log(
        participant_id, action, metadata, upload_session_id, edited_by, edited_at
      )
      SELECT id,
             'insert',
             jsonb_build_object(
               'session_id', v_session_id, 
               'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
             ),
             v_session_id,
             auth.uid(),
             NOW()
      FROM public.participants
      WHERE event_id = p_event_id
        AND name = v_name
        AND phone = v_phone
      LIMIT 1;

    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      
      -- 에러 로깅
      BEGIN
        INSERT INTO public.logs(
          event_id, actor_role, action, target_table, payload, created_by, created_at, agency_id
        ) VALUES (
          p_event_id, 'system', 'participant_import_error', 'participants',
          jsonb_build_object(
            'session_id', v_session_id, 
            'error', SQLERRM, 
            'sqlstate', SQLSTATE, 
            'record_sample', v_row
          ),
          auth.uid(), NOW(), v_agency_id
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
      
      CONTINUE;
    END;
  END LOOP;

  -- 실시간 알림
  PERFORM pg_notify('participant_upload',
    jsonb_build_object(
      'event_id', p_event_id,
      'session_id', v_session_id,
      'inserted', v_inserted,
      'updated', v_updated,
      'skipped', v_skipped,
      'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
    )::text
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'session_id', v_session_id,
    'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean)
TO authenticated, service_role;