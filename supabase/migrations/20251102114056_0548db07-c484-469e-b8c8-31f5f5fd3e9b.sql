-- Phase 86-ROLLBACK-HISTORY: Participant backup and rollback system

-- 1) Create participants_backup table
CREATE TABLE IF NOT EXISTS public.participants_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  backup_data jsonb NOT NULL,
  backup_type text DEFAULT 'manual',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.participants_backup ENABLE ROW LEVEL SECURITY;

-- RLS policies for participants_backup
CREATE POLICY "Users can view backups for their events"
  ON public.participants_backup FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.user_roles ur ON ur.agency_id = e.agency_id
      WHERE e.id = participants_backup.event_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create backups for their events"
  ON public.participants_backup FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.user_roles ur ON ur.agency_id = e.agency_id
      WHERE e.id = participants_backup.event_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Masters can manage all backups"
  ON public.participants_backup FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master'));

-- 2) Backup function
CREATE OR REPLACE FUNCTION public.backup_participants(
  p_event_id uuid,
  p_backup_type text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_backup_id uuid := gen_random_uuid();
  v_count int := 0;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event_id';
  END IF;

  -- Count participants
  SELECT COUNT(*) INTO v_count FROM public.participants WHERE event_id = p_event_id;

  -- Create backup only if there are participants
  IF v_count > 0 THEN
    INSERT INTO public.participants_backup (id, event_id, agency_id, backup_data, backup_type, created_by, created_at)
    SELECT 
      v_backup_id, 
      p_event_id, 
      v_agency_id, 
      jsonb_agg(to_jsonb(p.*)), 
      p_backup_type,
      auth.uid(),
      now()
    FROM public.participants p
    WHERE p.event_id = p_event_id;

    RAISE NOTICE '[BACKUP] Snapshot saved: % (% participants)', v_backup_id, v_count;
  ELSE
    RAISE NOTICE '[BACKUP] No participants to backup for event: %', p_event_id;
  END IF;

  RETURN v_backup_id;
END;
$$;

-- 3) Rollback function
CREATE OR REPLACE FUNCTION public.rollback_participants(
  p_event_id uuid,
  p_backup_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_count int := 0;
  v_backup_exists boolean;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id FROM public.events WHERE id = p_event_id;
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event_id';
  END IF;

  -- Check if backup exists
  SELECT EXISTS(SELECT 1 FROM public.participants_backup WHERE id = p_backup_id) INTO v_backup_exists;
  IF NOT v_backup_exists THEN
    RAISE EXCEPTION 'Backup not found';
  END IF;

  -- Backup current state before rollback
  PERFORM backup_participants(p_event_id, 'pre_rollback');

  -- Delete current participants
  DELETE FROM public.participants WHERE event_id = p_event_id;

  -- Restore from backup
  INSERT INTO public.participants (
    event_id, agency_id, name, organization, phone, request_note, 
    fixed_role, custom_role, participant_no, stay_status, lodging_status,
    companion, companion_memo, adult_count, child_ages,
    is_active, created_at, updated_at
  )
  SELECT 
    p_event_id,
    v_agency_id,
    elem->>'name',
    elem->>'organization',
    elem->>'phone',
    elem->>'request_note',
    elem->>'fixed_role',
    elem->>'custom_role',
    (elem->>'participant_no')::integer,
    elem->>'stay_status',
    elem->>'lodging_status',
    elem->>'companion',
    elem->>'companion_memo',
    (elem->>'adult_count')::integer,
    CASE 
      WHEN elem->'child_ages' IS NOT NULL 
      THEN ARRAY(SELECT jsonb_array_elements_text(elem->'child_ages'))
      ELSE NULL 
    END,
    COALESCE((elem->>'is_active')::boolean, true),
    now(),
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
    jsonb_build_object(
      'backup_id', p_backup_id, 
      'restored_count', v_count
    ), 
    auth.uid(), 
    now()
  );

  RETURN jsonb_build_object(
    'status', 'ok', 
    'restored', v_count,
    'backup_id', p_backup_id
  );
END;
$$;

-- 4) Grant permissions
GRANT EXECUTE ON FUNCTION public.backup_participants(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rollback_participants(uuid, uuid) TO authenticated, service_role;

-- 5) Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_backup_event_created 
  ON public.participants_backup(event_id, created_at DESC);