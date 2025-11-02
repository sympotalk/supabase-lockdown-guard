-- Phase 88-CLEANUP-REFINE-FINAL: Upload system cleanup and optimization

-- 1️⃣ Drop unnecessary RPC functions
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean, text);
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, text);
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean);
DROP FUNCTION IF EXISTS public.commit_staged_participants(uuid, text, uuid[]);
DROP FUNCTION IF EXISTS public.upload_participants_excel(uuid, jsonb, text);
DROP FUNCTION IF EXISTS public.validate_participants_staging(uuid, text);
DROP FUNCTION IF EXISTS public.reset_participants_staging(uuid);

-- 2️⃣ Clean up participants_log metadata (simplify verbose entries)
-- Keep only essential fields: action, mode, total, processed, skipped, restored, backup_id
UPDATE public.participants_log
SET metadata = CASE 
  WHEN metadata ? 'mode' THEN 
    jsonb_build_object(
      'mode', metadata->>'mode',
      'total', COALESCE((metadata->>'total')::int, 0),
      'processed', COALESCE((metadata->>'processed')::int, 0),
      'skipped', COALESCE((metadata->>'skipped')::int, 0)
    )
  WHEN metadata ? 'restored' THEN
    jsonb_build_object(
      'backup_id', metadata->>'backup_id',
      'restored', COALESCE((metadata->>'restored')::int, 0)
    )
  ELSE metadata
END
WHERE jsonb_typeof(metadata) = 'object'
  AND action IN ('excel_process', 'rollback');

-- 3️⃣ Drop staging-related RLS policies
DO $$
BEGIN
  -- Drop any staging-related policies
  DROP POLICY IF EXISTS "Allow staging operations" ON public.participants;
  DROP POLICY IF EXISTS "Allow staging read" ON public.participants;
  DROP POLICY IF EXISTS "staging_policy" ON public.participants;
EXCEPTION 
  WHEN undefined_object THEN
    RAISE NOTICE 'Staging policies already removed';
END $$;

-- 4️⃣ Ensure metadata default value
ALTER TABLE IF EXISTS public.participants_log
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- 5️⃣ Create index for faster backup lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_participants_backup_event_type_created 
  ON public.participants_backup(event_id, backup_type, created_at DESC);

-- 6️⃣ Add comment to document the RPC functions we're keeping
COMMENT ON FUNCTION public.process_excel_upload(uuid, jsonb, text) IS 
  'Phase 82-88: Single RPC for Excel upload with append/replace modes. Validates, normalizes, and processes participant data in one call.';

COMMENT ON FUNCTION public.backup_participants(uuid, text) IS 
  'Phase 86-88: Creates a backup snapshot of all participants for an event. Used automatically before replace operations.';

COMMENT ON FUNCTION public.rollback_participants(uuid, uuid) IS 
  'Phase 86-88: Restores participants from a backup snapshot. Creates a backup of current state before rollback.';

-- 7️⃣ Clean up any orphaned staging tables (if they exist)
DROP TABLE IF EXISTS public.participants_staging CASCADE;
DROP TABLE IF EXISTS public.upload_logs CASCADE;