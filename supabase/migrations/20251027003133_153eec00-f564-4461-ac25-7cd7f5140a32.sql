-- [71-I.QA3-FIX.R6] Schema alignment & performance optimization

-- 1) Create composite index for upload/duplicate detection acceleration
CREATE INDEX IF NOT EXISTS idx_participants_event_name_phone 
ON participants(event_id, name, phone);

-- 2) Update RPC with enhanced null guard and logging
CREATE OR REPLACE FUNCTION public.fn_bulk_upload_participants(
  p_event_id uuid,
  p_rows jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role text;
  v_user_agency uuid;
  v_event_agency uuid;
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
  -- Get current user role and agency
  SELECT ur.role::text, ur.agency_id
  INTO v_current_role, v_user_agency
  FROM user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  -- Get event agency with enhanced null guard
  SELECT agency_id
  INTO v_event_agency
  FROM events
  WHERE id = p_event_id;

  IF v_event_agency IS NULL THEN
    RAISE EXCEPTION 'EVENT_AGENCY_ID_MISSING: Event % has no agency_id', p_event_id;
  END IF;

  -- Scope check: master bypasses, others must match agency
  IF v_current_role <> 'master' AND v_user_agency IS DISTINCT FROM v_event_agency THEN
    RAISE EXCEPTION 'AGENCY_SCOPE_MISMATCH';
  END IF;

  -- Process each row with loop-based upsert
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- Extract and normalize fields (AI mapping compatible)
    v_name := coalesce(v_row->>'name', v_row->>'성명', v_row->>'이름');
    v_org := coalesce(v_row->>'organization', v_row->>'소속', v_row->>'기관', v_row->>'회사');
    v_phone := coalesce(v_row->>'phone', v_row->>'연락처', v_row->>'전화');
    v_memo := coalesce(v_row->>'memo', v_row->>'메모', v_row->>'요청사항');

    -- Skip if no name
    CONTINUE WHEN v_name IS NULL OR v_name = '';

    -- Check if participant exists
    SELECT id INTO v_existing_id
    FROM participants
    WHERE event_id = p_event_id
      AND name = v_name
      AND (
        (phone IS NOT NULL AND phone != '' AND phone = v_phone)
        OR (phone IS NULL OR phone = '')
      )
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Update existing participant
      UPDATE participants
      SET
        organization = coalesce(v_org, organization),
        phone = coalesce(v_phone, phone),
        memo = CASE
          WHEN v_memo IS NULL OR v_memo = '' THEN memo
          WHEN memo IS NULL OR memo = '' THEN v_memo
          ELSE memo || E'\n' || v_memo
        END,
        updated_at = timezone('utc', now()),
        updated_by = auth.uid()
      WHERE id = v_existing_id;
      
      v_updated := v_updated + 1;
    ELSE
      -- Insert new participant
      INSERT INTO participants (
        event_id,
        agency_id,
        name,
        organization,
        phone,
        memo,
        created_by
      ) VALUES (
        p_event_id,
        v_event_agency,
        v_name,
        v_org,
        v_phone,
        v_memo,
        auth.uid()
      );
      
      v_new := v_new + 1;
    END IF;

    v_inserted := v_inserted + 1;
  END LOOP;

  -- [R6] Performance log for QA validation
  RAISE NOTICE '[R6] event_id=%, agency_id=%, new=%, updated=%, inserted=%', 
    p_event_id, v_event_agency, v_new, v_updated, v_inserted;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'new', v_new,
    'updated', v_updated,
    'event_id', p_event_id,
    'agency_id', v_event_agency
  );
END $$;