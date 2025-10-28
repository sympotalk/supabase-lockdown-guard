-- [Phase 72-RULE.MASTER.RLS-FIX.V3] Master 권한 RLS 정책 복구 (CASCADE)

-- 1️⃣ is_master() 함수 재생성 (CASCADE로 기존 정책 의존성 제거)
DROP FUNCTION IF EXISTS public.is_master(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_master(uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN public.has_role(uid, 'master'::app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2️⃣ rooming_participants RLS 정책 재구성
ALTER TABLE public.rooming_participants FORCE ROW LEVEL SECURITY;

-- 3️⃣ MASTER 우선 접근 정책
-- SELECT: master는 모든 데이터 접근, 일반 사용자는 본인 agency만
CREATE POLICY rp_select ON public.rooming_participants
FOR SELECT USING (
  public.has_role(auth.uid(), 'master'::app_role)
  OR (
    agency_id IS NOT NULL 
    AND agency_id IN (
      SELECT ur.agency_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  )
);

-- INSERT: master는 모든 이벤트에 삽입 가능, 일반 사용자는 본인 agency만
CREATE POLICY rp_write ON public.rooming_participants
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'master'::app_role)
  OR (
    agency_id IS NOT NULL 
    AND agency_id IN (
      SELECT ur.agency_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  )
);

-- UPDATE: master는 모든 레코드 수정 가능, 일반 사용자는 본인 agency만
CREATE POLICY rp_update ON public.rooming_participants
FOR UPDATE USING (
  public.has_role(auth.uid(), 'master'::app_role)
  OR (
    agency_id IS NOT NULL 
    AND agency_id IN (
      SELECT ur.agency_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  )
);

-- DELETE: master는 모든 레코드 삭제 가능, 일반 사용자는 본인 agency만
CREATE POLICY rp_delete ON public.rooming_participants
FOR DELETE USING (
  public.has_role(auth.uid(), 'master'::app_role)
  OR (
    agency_id IS NOT NULL 
    AND agency_id IN (
      SELECT ur.agency_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  )
);