-- Phase 79-R.FINAL-FK-PURGE: Complete participants_log rebuild
-- Removes all FK constraints, legacy columns, and dependencies

BEGIN;

-- ============================================================
-- STEP 1: Rename existing table to backup
-- ============================================================
ALTER TABLE IF EXISTS public.participants_log 
  RENAME TO participants_log_legacy_backup;

-- ============================================================
-- STEP 2: Create clean new table (7 columns, no FKs)
-- ============================================================
CREATE TABLE public.participants_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  agency_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.participants_log IS 
'[Phase 79-R.FINAL] Event-level activity log for participant operations.
Columns: id, event_id, agency_id, action, metadata (jsonb), created_by, created_at.
No FK constraints - this is an audit log independent of other tables.
Common actions: excel_upload_to_staging, bulk_upload, validation_complete, participant_delete.';

-- ============================================================
-- STEP 3: Migrate existing log data
-- ============================================================
INSERT INTO public.participants_log (
  event_id, 
  agency_id, 
  action, 
  metadata, 
  created_by, 
  created_at
)
SELECT 
  event_id,
  agency_id,
  action,
  -- Merge metadata and context_json (both contain log data)
  COALESCE(
    CASE 
      WHEN metadata IS NOT NULL AND metadata != '{}'::jsonb THEN metadata
      WHEN context_json IS NOT NULL AND context_json != '{}'::jsonb THEN context_json
      ELSE '{}'::jsonb
    END
  ) as metadata,
  created_by,
  created_at
FROM public.participants_log_legacy_backup
WHERE event_id IS NOT NULL -- Only migrate valid event-level logs
ORDER BY created_at;

-- ============================================================
-- STEP 4: Create RLS policies
-- ============================================================
ALTER TABLE public.participants_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: Masters have full access
CREATE POLICY participants_log_master_all 
  ON public.participants_log 
  FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Policy 2: Agency users can view their event logs
CREATE POLICY participants_log_agency_select
  ON public.participants_log 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM user_roles ur
      JOIN events e ON e.agency_id = ur.agency_id
      WHERE ur.user_id = auth.uid()
        AND e.id = participants_log.event_id
    )
  );

-- Policy 3: Authenticated users can insert logs
CREATE POLICY participants_log_insert
  ON public.participants_log 
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 5: Drop legacy backup table
-- ============================================================
DROP TABLE IF EXISTS public.participants_log_legacy_backup CASCADE;

COMMIT;