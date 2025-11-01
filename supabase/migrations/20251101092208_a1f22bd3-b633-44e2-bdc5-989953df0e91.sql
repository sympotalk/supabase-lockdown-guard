-- Phase 78-G : Legacy RPC Cleanup & 단일화 완성
-- 목적: match_hash 참조 함수 및 AI 매칭 관련 레거시 코드 완전 제거

-- Step 1: 레거시 함수 일괄 삭제
DROP FUNCTION IF EXISTS public.apply_staged_participants(uuid, text);
DROP FUNCTION IF EXISTS public.apply_staged_participants(uuid);
DROP FUNCTION IF EXISTS public.import_participants_from_excel(uuid, jsonb, boolean, text);
DROP FUNCTION IF EXISTS public.import_participants_from_excel(uuid, jsonb, boolean);
DROP FUNCTION IF EXISTS public.fn_bulk_upload_participants(uuid, jsonb, boolean);
DROP FUNCTION IF EXISTS public.fn_bulk_upload_participants(uuid, jsonb);

-- Step 2: match_hash 참조 뷰 제거
DROP VIEW IF EXISTS public.v_participant_staging CASCADE;
DROP VIEW IF EXISTS public.v_ai_matching_map CASCADE;

-- Step 3: 오래된 트리거 제거
DROP TRIGGER IF EXISTS trigger_apply_staged_participants ON public.participants_staging;
DROP TRIGGER IF EXISTS trigger_ai_match_commit ON public.participants_staging;

-- Step 4: 검증 - 남아있는 참조 확인 (주석 참고용)
-- SELECT proname, prosrc FROM pg_proc WHERE prosrc ILIKE '%match_hash%';
-- 결과: 0건이어야 함

-- Step 5: 최종 유지 함수 목록 (주석 참고용)
-- ✅ ai_participant_import_from_excel(uuid, jsonb, boolean) - Phase 77 최신 버전
-- ✅ commit_staged_participants(uuid, text) - Phase 78-F 최신 버전