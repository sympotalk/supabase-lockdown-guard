-- ============================================================
-- Phase 80-PURGE-FULL-WIPE: Complete Participant Data & Upload System Reset
-- ============================================================

-- 1️⃣ 참가자 데이터 완전 삭제 (ID 초기화 포함)
TRUNCATE TABLE public.participants RESTART IDENTITY CASCADE;

-- 2️⃣ 로그 테이블 클린업 (participants_log 유지 구조만)
TRUNCATE TABLE public.participants_log RESTART IDENTITY CASCADE;

-- 3️⃣ 업로드/스테이징 관련 객체 재확인 및 삭제 (누락 방지)
DROP TABLE IF EXISTS public.participants_staging CASCADE;
DROP TABLE IF EXISTS public.upload_logs CASCADE;
DROP VIEW IF EXISTS public.v_rooming_visual_map CASCADE;
DROP FUNCTION IF EXISTS public.upload_participants_excel(uuid, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_participants_staging(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.commit_staged_participants(uuid, text, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.reset_participants_staging(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.insert_participants_log() CASCADE;
DROP TRIGGER IF EXISTS trg_set_participants_log_context ON public.participants_log;

-- 4️⃣ 로그 테이블 구조 보존 및 재설정
ALTER TABLE public.participants_log
  DROP COLUMN IF EXISTS participant_id CASCADE,
  DROP CONSTRAINT IF EXISTS participants_log_participant_id_fkey,
  DROP CONSTRAINT IF EXISTS participants_log_pkey;

ALTER TABLE public.participants_log
  ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;

-- 5️⃣ RLS 정책 재활성화 (핵심 테이블만)
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;