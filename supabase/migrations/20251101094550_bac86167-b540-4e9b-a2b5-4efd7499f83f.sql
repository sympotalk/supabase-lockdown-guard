-- Phase 78-G Final: Rebuild commit_staged_participants with p_skip_ids (NO match_hash)
-- 목적: p_skip_ids 기능 유지하면서 match_hash 완전 제거

-- Step 1: Drop old version with match_hash
DROP FUNCTION IF EXISTS public.commit_staged_participants(uuid, text, uuid[]);

-- Step 2: Create new version with p_skip_ids but NO match_hash
CREATE OR REPLACE FUNCTION public.commit_staged_participants(
  p_event_id uuid,
  p_session_id text DEFAULT NULL,
  p_skip_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_agency_id uuid;
BEGIN
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event_id or agency_id not found';
  END IF;

  -- Insert new participants from staging (excluding skip_ids)
  INSERT INTO public.participants (
    event_id,
    agency_id,
    name,
    organization,
    phone,
    request_note,
    created_at,
    updated_at
  )
  SELECT
    s.event_id,
    v_agency_id,
    TRIM(s.name),
    TRIM(s.organization),
    TRIM(s.phone),
    TRIM(s.request_note),
    NOW(),
    NOW()
  FROM public.participants_staging s
  WHERE s.event_id = p_event_id
    AND (p_session_id IS NULL OR s.upload_session_id = p_session_id)
    AND s.validation_status IN ('valid', 'warning')
    AND s.id != ALL(p_skip_ids);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Count skipped rows
  SELECT COUNT(*) INTO v_skipped
  FROM participants_staging
  WHERE event_id = p_event_id
    AND (p_session_id IS NULL OR upload_session_id = p_session_id)
    AND validation_status IN ('valid', 'warning')
    AND id = ANY(p_skip_ids);

  -- Delete processed staging data
  DELETE FROM participants_staging
  WHERE event_id = p_event_id
    AND (p_session_id IS NULL OR upload_session_id = p_session_id);

  -- Log the commit
  INSERT INTO public.participants_log (
    event_id,
    agency_id,
    action,
    metadata,
    created_by,
    created_at
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'bulk_upload',
    jsonb_build_object(
      'session_id', COALESCE(p_session_id, 'commit_' || extract(epoch from now())::bigint::text),
      'inserted', v_inserted,
      'updated', v_updated,
      'skipped', v_skipped,
      'skip_ids_count', array_length(p_skip_ids, 1)
    ),
    auth.uid(),
    NOW()
  );

  RETURN jsonb_build_object(
    'status', 'ok',
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped
  );
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.commit_staged_participants(uuid, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_staged_participants(uuid, text, uuid[]) TO service_role;