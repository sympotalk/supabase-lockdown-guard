-- Phase 73-L.7.9: Schema-Aligned RPC Complete Rewrite
-- Removes tm_status, position, department, address references
-- Fixes manager_info JSONB construction with COALESCE

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
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  -- Replace mode: complete deletion
  IF p_replace THEN
    DELETE FROM public.rooming_participants WHERE event_id = p_event_id;
    DELETE FROM public.participants_log WHERE participant_id IN (
      SELECT id FROM public.participants WHERE event_id = p_event_id
    );
    DELETE FROM public.participants WHERE event_id = p_event_id;
  END IF;

  -- Process each row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
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
        
        -- name (NOT NULL, COALESCE fallback)
        COALESCE(
          NULLIF(TRIM((v_row->>'name')::text), ''),
          NULLIF(TRIM((v_row->>'고객 성명')::text), ''),
          NULLIF(TRIM((v_row->>'성명')::text), ''),
          NULLIF(TRIM((v_row->>'이름')::text), '')
        ),
        
        -- phone (NULLABLE, COALESCE fallback)
        COALESCE(
          NULLIF(TRIM((v_row->>'phone')::text), ''),
          NULLIF(TRIM((v_row->>'고객 연락처')::text), ''),
          NULLIF(TRIM((v_row->>'연락처')::text), ''),
          NULLIF(TRIM((v_row->>'전화번호')::text), '')
        ),
        
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
        
        -- manager_info (JSONB, fixed COALESCE version)
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
        
        -- SFE codes (optional)
        COALESCE(
          NULLIF(TRIM((v_row->>'sfe_agency_code')::text), ''),
          NULLIF(TRIM((v_row->>'SFE 거래처코드')::text), '')
        ),
        COALESCE(
          NULLIF(TRIM((v_row->>'sfe_customer_code')::text), ''),
          NULLIF(TRIM((v_row->>'SFE 고객코드')::text), '')
        ),
        
        -- composition (maintain default)
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

      -- Count successful insert
      v_inserted := v_inserted + 1;

      -- Log entry
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
        AND name = COALESCE(
          NULLIF(TRIM((v_row->>'name')::text), ''),
          NULLIF(TRIM((v_row->>'고객 성명')::text), '')
        )
        AND phone = COALESCE(
          NULLIF(TRIM((v_row->>'phone')::text), ''),
          NULLIF(TRIM((v_row->>'고객 연락처')::text), '')
        )
      LIMIT 1;

    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      
      -- Error logging (safe nested block)
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
      EXCEPTION WHEN OTHERS THEN 
        NULL;  -- Continue even if logging fails
      END;
      
      CONTINUE;
    END;
  END LOOP;

  -- Real-time notification
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

  -- Return result
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