-- [71-I.QA3-FIX.R6.RPC.REDEPLOY] Complete RPC redeployment with agency_id support

-- Drop existing function to clear all cached versions
DROP FUNCTION IF EXISTS public.fn_bulk_upload_participants(uuid, jsonb) CASCADE;

-- Create R6 Final version with enhanced null guards and logging
CREATE OR REPLACE FUNCTION public.fn_bulk_upload_participants(
  p_event_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role text;
  v_user_agency uuid;
  v_event_agency uuid;
  v_is_master boolean := false;
  v_row jsonb;
  v_name text;
  v_org text;
  v_phone text;
  v_memo text;
  v_existing_id uuid;
  v_inserted int := 0;
  v_updated int := 0;
  v_new int := 0;
BEGIN
  -- Get current user role and agency from user_roles table
  SELECT ur.role::text, ur.agency_id
  INTO v_current_role, v_user_agency
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  -- Check if user is master
  v_is_master := (v_current_role = 'master');

  -- Get event agency with enhanced null guard
  SELECT agency_id
  INTO v_event_agency
  FROM public.events
  WHERE id = p_event_id;

  IF v_event_agency IS NULL THEN
    RAISE EXCEPTION 'EVENT_AGENCY_ID_MISSING: Event % has no agency_id', p_event_id;
  END IF;

  -- Scope check: master bypasses, others must match agency
  IF NOT v_is_master AND v_user_agency IS DISTINCT FROM v_event_agency THEN
    RAISE EXCEPTION 'AGENCY_SCOPE_MISMATCH';
  END IF;

  -- Process each row with loop-based upsert
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- Extract and normalize fields (AI mapping compatible)
    v_name := COALESCE(v_row->>'name', v_row->>'성명', v_row->>'이름');
    v_org := COALESCE(v_row->>'organization', v_row->>'소속', v_row->>'기관', v_row->>'회사');
    v_phone := COALESCE(v_row->>'phone', v_row->>'연락처', v_row->>'전화');
    v_memo := COALESCE(v_row->>'memo', v_row->>'메모', v_row->>'요청사항');

    -- Skip if no name
    CONTINUE WHEN v_name IS NULL OR TRIM(v_name) = '';

    -- Check if participant exists (by event_id, name, phone)
    SELECT id INTO v_existing_id
    FROM public.participants
    WHERE event_id = p_event_id
      AND name = v_name
      AND (phone = v_phone OR (phone IS NULL AND v_phone IS NULL))
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Update existing participant
      UPDATE public.participants
      SET
        organization = COALESCE(v_org, organization),
        phone = COALESCE(v_phone, phone),
        memo = CASE 
          WHEN v_memo IS NOT NULL AND v_memo != '' 
          THEN COALESCE(memo || E'\n' || v_memo, v_memo)
          ELSE memo
        END,
        updated_at = timezone('utc', now())
      WHERE id = v_existing_id;

      v_updated := v_updated + 1;
    ELSE
      -- Insert new participant with agency_id
      INSERT INTO public.participants (
        event_id,
        agency_id,
        name,
        organization,
        phone,
        memo
      )
      VALUES (
        p_event_id,
        v_event_agency,
        v_name,
        v_org,
        v_phone,
        v_memo
      );

      v_new := v_new + 1;
    END IF;

    v_inserted := v_inserted + 1;
  END LOOP;

  -- Performance logging with R6 tag
  RAISE NOTICE '[R6] event_id=%, agency_id=%, new=%, updated=%, inserted=%', 
    p_event_id, v_event_agency, v_new, v_updated, v_inserted;

  -- Return detailed result
  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'new', v_new,
    'updated', v_updated,
    'event_id', p_event_id,
    'agency_id', v_event_agency,
    'status', 'success'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'event_id', p_event_id
    );
END;
$$;

-- Add version tag comment
COMMENT ON FUNCTION public.fn_bulk_upload_participants(uuid, jsonb) 
IS '[71-I.QA3-FIX.R6] Finalized RPC — agency_id linked, AI Mapping supported, enhanced null guards';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_bulk_upload_participants(uuid, jsonb) TO authenticated;