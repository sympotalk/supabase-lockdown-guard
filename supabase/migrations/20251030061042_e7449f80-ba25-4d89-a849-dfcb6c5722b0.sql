-- Phase 73-L.6.G: Remove obsolete room_credit references from participant import RPC

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean);

-- Recreate function without room_credit references
CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_data jsonb,
  p_replace boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  r jsonb;
  v_name text;
  v_phone text;
  v_org text;
  v_memo text;
  v_manager_info jsonb;
BEGIN
  -- Get agency_id from user_roles
  SELECT agency_id INTO v_agency_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Fallback to event's agency_id if user has no agency (MASTER case)
  IF v_agency_id IS NULL THEN
    SELECT agency_id INTO v_agency_id
    FROM public.events
    WHERE id = p_event_id;
  END IF;

  -- Validate agency context exists
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'AGENCY_CONTEXT_NOT_FOUND: User % has no associated agency', auth.uid();
  END IF;

  -- Replace mode: soft delete existing participants
  IF p_replace THEN
    UPDATE public.participants
    SET is_active = false
    WHERE event_id = p_event_id AND agency_id = v_agency_id;
  END IF;

  -- Insert/update participants
  FOR r IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    v_name := trim(coalesce(r->>'고객 성명', ''));
    v_phone := trim(coalesce(r->>'고객 연락처', ''));
    v_org := trim(coalesce(r->>'거래처명', ''));
    v_memo := trim(coalesce(r->>'메모', ''));

    -- Build manager_info JSONB
    v_manager_info := jsonb_build_object(
      '팀명', coalesce(r->>'팀명', ''),
      '담당자 성명', coalesce(r->>'담당자 성명', ''),
      '담당자 연락처', coalesce(r->>'담당자 연락처', ''),
      '담당자 사번', coalesce(r->>'담당자 사번', ''),
      'SFE 거래처코드', coalesce(r->>'SFE 거래처코드', ''),
      'SFE 고객코드', coalesce(r->>'SFE 고객코드', '')
    );

    INSERT INTO public.participants (
      event_id,
      agency_id,
      name,
      phone,
      organization,
      memo,
      manager_info,
      role_badge,
      composition,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      p_event_id,
      v_agency_id,
      v_name,
      v_phone,
      v_org,
      v_memo,
      v_manager_info,
      '참석자',
      jsonb_build_object('adult', 1, 'child', 0, 'infant', 0),
      true,
      now(),
      now()
    )
    ON CONFLICT (event_id, agency_id, name, phone)
    DO UPDATE SET
      organization = excluded.organization,
      memo = excluded.memo,
      manager_info = excluded.manager_info,
      updated_at = now();
  END LOOP;
END;
$$;