-- Phase 78-D: participants_log 컬럼 정합성 복원
-- 목적: RPC 함수 및 트리거에서 참조하는 컬럼 구조 복원

-- 1. 필수 컬럼 추가
ALTER TABLE public.participants_log
  ADD COLUMN IF NOT EXISTS agency_id uuid NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid NULL;

COMMENT ON COLUMN public.participants_log.agency_id IS '로그 발생 주체 에이전시 ID';
COMMENT ON COLUMN public.participants_log.created_by IS '행위자(auth.uid)';

-- 2. 인덱스 추가 (조회 최적화)
CREATE INDEX IF NOT EXISTS idx_participants_log_agency_id ON public.participants_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_participants_log_created_by ON public.participants_log(created_by);

-- 3. 기존 로그 백필 (agency_id 복원)
UPDATE public.participants_log l
SET agency_id = e.agency_id
FROM public.events e
WHERE l.event_id = e.id
  AND l.agency_id IS NULL;

-- 4. 트리거 함수 정합성 확인 및 재정의
CREATE OR REPLACE FUNCTION public.set_participants_log_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- created_by 자동 설정
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  -- agency_id 자동 설정 (events 테이블에서 조회)
  IF NEW.agency_id IS NULL THEN
    SELECT agency_id INTO NEW.agency_id
    FROM public.events
    WHERE id = NEW.event_id;
  END IF;
  
  RETURN NEW;
END;
$$;