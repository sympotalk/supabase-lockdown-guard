-- [71-I.QA3-FIX.R8] Complete RPC reinitialization - remove NEW.agency_id references

-- 1️⃣ Drop existing function completely
DROP FUNCTION IF EXISTS fn_bulk_upload_participants CASCADE;

-- 2️⃣ Recreate function (R8 Final)
CREATE OR REPLACE FUNCTION fn_bulk_upload_participants(p_event_id uuid, p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_agency uuid;
  v_user_agency uuid;
  v_name text;
  v_org text;
  v_phone text;
  v_memo text;
  v_existing_id uuid;
  v_new int := 0;
  v_updated int := 0;
  v_inserted int := 0;
  v_row jsonb;
BEGIN
  SELECT agency_id INTO v_event_agency FROM events WHERE id = p_event_id LIMIT 1;
  SELECT agency_id INTO v_user_agency FROM profiles WHERE id = auth.uid() LIMIT 1;

  IF v_event_agency IS NULL THEN
    RAISE EXCEPTION 'Event agency not found';
  END IF;

  IF v_user_agency IS NULL THEN
    v_user_agency := v_event_agency;
  END IF;

  IF auth.role() != 'master' AND v_user_agency != v_event_agency THEN
    RAISE EXCEPTION 'AGENCY_SCOPE_MISMATCH';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_name := coalesce(v_row->>'name', v_row->>'성명', v_row->>'이름');
    v_org := coalesce(v_row->>'organization', v_row->>'소속', v_row->>'기관', v_row->>'회사');
    v_phone := coalesce(v_row->>'phone', v_row->>'연락처', v_row->>'전화');
    v_memo := coalesce(v_row->>'memo', v_row->>'메모', v_row->>'요청사항');

    CONTINUE WHEN v_name IS NULL OR v_name = '';

    SELECT id INTO v_existing_id
    FROM participants
    WHERE event_id = p_event_id
      AND name = v_name
      AND (phone = v_phone OR phone IS NULL)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE participants
      SET organization = coalesce(v_org, organization),
          phone = coalesce(v_phone, phone),
          memo = coalesce(v_memo, memo),
          updated_at = timezone('utc', now()),
          updated_by = auth.uid()
      WHERE id = v_existing_id;
      v_updated := v_updated + 1;
    ELSE
      INSERT INTO participants (
        event_id, agency_id, name, organization, phone, memo, created_by
      ) VALUES (
        p_event_id, v_event_agency, v_name, v_org, v_phone, v_memo, auth.uid()
      );
      v_new := v_new + 1;
    END IF;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'new', v_new,
    'updated', v_updated,
    'event_id', p_event_id,
    'agency_id', v_event_agency
  );
END;
$$;

-- 3️⃣ Add version comment
COMMENT ON FUNCTION fn_bulk_upload_participants IS '[71-I.QA3-FIX.R8] Finalized RPC — full rebuild, AI mapping stable.';

-- 4️⃣ Grant execute permission
GRANT EXECUTE ON FUNCTION fn_bulk_upload_participants TO authenticated;