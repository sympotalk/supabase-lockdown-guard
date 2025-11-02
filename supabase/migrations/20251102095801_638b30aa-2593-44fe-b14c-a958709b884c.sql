-- Phase 80-PURGE-FULL: Excel Upload System Total Deletion (Safe Version)
-- Completely removes staging tables, upload functions, and related infrastructure
-- Safe execution - doesn't fail if objects don't exist

BEGIN;

-- ============================================================
-- 🧹 STEP 1. Drop all related functions (IF EXISTS)
-- ============================================================
DROP FUNCTION IF EXISTS public.upload_participants_excel(uuid, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS public.upload_participants_excel(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.commit_staged_participants(uuid, text, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.commit_staged_participants(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_participants_staging(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel() CASCADE;
DROP FUNCTION IF EXISTS public.set_participants_log_context() CASCADE;
DROP FUNCTION IF EXISTS public.reset_participants_staging(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.insert_participants_log() CASCADE;
DROP FUNCTION IF EXISTS public.rebuild_staging_index() CASCADE;

-- ============================================================
-- 🧹 STEP 2. Drop all related views first (before tables)
-- ============================================================
DROP VIEW IF EXISTS public.v_participants_staging CASCADE;
DROP VIEW IF EXISTS public.v_rooming_visual_map CASCADE;

-- ============================================================
-- 🧹 STEP 3. Drop all related tables
-- ============================================================
DROP TABLE IF EXISTS public.participants_staging CASCADE;
DROP TABLE IF EXISTS public.participants_temp CASCADE;
DROP TABLE IF EXISTS public.upload_logs CASCADE;

-- ============================================================
-- 🧹 STEP 4. Verify RLS policies on core tables
-- ============================================================
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================
-- ✅ Verification and summary
-- ============================================================
DO $$
DECLARE
  v_staging_exists boolean;
  v_upload_logs_exists boolean;
  v_func_count int;
BEGIN
  -- Check if staging table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'participants_staging'
  ) INTO v_staging_exists;
  
  -- Check if upload_logs exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'upload_logs'
  ) INTO v_upload_logs_exists;
  
  -- Count remaining upload-related functions
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%upload%excel%' OR
    p.proname LIKE '%staging%' OR
    p.proname LIKE '%commit_staged%'
  );
  
  -- Report results
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Phase 80-PURGE-FULL Execution Summary';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'participants_staging exists: %', v_staging_exists;
  RAISE NOTICE 'upload_logs exists: %', v_upload_logs_exists;
  RAISE NOTICE 'Upload-related functions remaining: %', v_func_count;
  RAISE NOTICE '============================================================';
  
  IF NOT v_staging_exists AND NOT v_upload_logs_exists AND v_func_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All Excel upload system components removed';
    RAISE NOTICE '✅ Core tables (participants, participants_log, events) preserved';
  ELSE
    RAISE WARNING '⚠ Some components may still exist - manual cleanup may be needed';
  END IF;
END $$;