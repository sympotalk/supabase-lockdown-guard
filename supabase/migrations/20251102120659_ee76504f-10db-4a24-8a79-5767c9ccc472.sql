-- Phase 89-PERMISSION-HARDENING: Restrict Replace and Rollback to MASTER only

-- ✅ 1. Drop existing participants RLS policies
DROP POLICY IF EXISTS "Agency users can access only their events" ON public.participants;
DROP POLICY IF EXISTS "Allow MASTER full access to events" ON public.participants;
DROP POLICY IF EXISTS "participants_select_policy" ON public.participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON public.participants;
DROP POLICY IF EXISTS "participants_update_policy" ON public.participants;
DROP POLICY IF EXISTS "participants_delete_policy" ON public.participants;

-- ✅ 2. Create refined RLS policies for participants
-- SELECT: User can view participants from their agency OR is master
CREATE POLICY "participants_select_policy"
ON public.participants
FOR SELECT
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = participants.agency_id
  )
);

-- INSERT: User can add participants to their agency events OR is master
CREATE POLICY "participants_insert_policy"
ON public.participants
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'master'::app_role)
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = participants.agency_id
  )
);

-- UPDATE: User can update their agency participants OR is master
CREATE POLICY "participants_update_policy"
ON public.participants
FOR UPDATE
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = participants.agency_id
  )
);

-- DELETE: MASTER ONLY (for replace mode)
CREATE POLICY "participants_delete_policy"
ON public.participants
FOR DELETE
USING (has_role(auth.uid(), 'master'::app_role));

-- ✅ 3. Add permission check to rollback_participants RPC
CREATE OR REPLACE FUNCTION public.rollback_participants(p_event_id uuid, p_backup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_count int := 0;
BEGIN
  -- 🔒 MASTER-only permission check
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: only MASTER can rollback participants';
  END IF;

  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;

  -- Backup current state before rollback
  PERFORM backup_participants(p_event_id, 'pre_rollback');

  -- Delete current participants
  DELETE FROM public.participants WHERE event_id = p_event_id;

  -- Restore from backup
  INSERT INTO public.participants (event_id, agency_id, name, organization, phone, request_note, is_active, created_at, updated_at)
  SELECT 
    p_event_id,
    v_agency_id,
    (elem->>'name')::text,
    (elem->>'organization')::text,
    (elem->>'phone')::text,
    (elem->>'request_note')::text,
    COALESCE((elem->>'is_active')::boolean, true),
    COALESCE((elem->>'created_at')::timestamptz, now()),
    now()
  FROM jsonb_array_elements(
    (SELECT backup_data FROM public.participants_backup WHERE id = p_backup_id)
  ) AS elem;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log rollback action
  INSERT INTO public.participants_log (event_id, agency_id, action, metadata, created_by, created_at)
  VALUES (
    p_event_id, 
    v_agency_id, 
    'rollback', 
    jsonb_build_object('backup_id', p_backup_id, 'restored', v_count),
    auth.uid(), 
    now()
  );

  RETURN jsonb_build_object('status', 'ok', 'restored', v_count, 'backup_id', p_backup_id);
END;
$$;

COMMENT ON FUNCTION public.rollback_participants IS 'Phase 89: MASTER-only participant rollback with permission check';