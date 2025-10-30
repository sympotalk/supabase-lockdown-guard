-- Phase 73-L.7.26: RoleBadge Immediate Default Fix
-- 목적: participants.role_badge를 항상 '참석자' 기본값으로 설정하고 기존 잘못된 데이터 정규화

-- Step 1: 기존 데이터 정규화 (NULL, '', '선택', 'Select' → '참석자')
UPDATE public.participants
SET role_badge = '참석자'
WHERE role_badge IS NULL 
   OR role_badge = '' 
   OR role_badge = '선택' 
   OR role_badge = 'Select'
   OR TRIM(role_badge) = '';

-- Step 2: role_badge 컬럼에 DEFAULT 설정
ALTER TABLE public.participants 
ALTER COLUMN role_badge SET DEFAULT '참석자';

-- Step 3: NOT NULL 제약 추가 (모든 데이터가 정규화되었으므로 안전)
ALTER TABLE public.participants 
ALTER COLUMN role_badge SET NOT NULL;

-- Step 4: CHECK 제약 추가 (빈 문자열 방지)
ALTER TABLE public.participants
ADD CONSTRAINT role_badge_not_empty 
CHECK (TRIM(role_badge) != '');

COMMENT ON COLUMN public.participants.role_badge IS 
'참가자 구분 뱃지. 기본값은 참석자이며 NULL/빈값 불가. 좌장/연자/참석자 또는 사용자 정의 값 허용.';
