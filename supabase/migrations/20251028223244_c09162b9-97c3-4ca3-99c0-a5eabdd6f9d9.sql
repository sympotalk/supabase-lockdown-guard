-- [Phase 72-RULE.DB.INIT] rooming_participants 스키마 재구성

-- 1) rooming_status enum 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rooming_status') THEN
    CREATE TYPE rooming_status AS ENUM ('대기', '배정', '확정', '취소');
  END IF;
END$$;

-- 2) 기존 테이블에 필요한 컬럼 추가
ALTER TABLE public.rooming_participants
  ADD COLUMN IF NOT EXISTS adults int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infants int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status rooming_status DEFAULT '대기',
  ADD COLUMN IF NOT EXISTS check_in date,
  ADD COLUMN IF NOT EXISTS check_out date;

-- stay_days는 generated column으로 추가 (기존에 없는 경우만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rooming_participants' 
    AND column_name = 'stay_days'
  ) THEN
    ALTER TABLE public.rooming_participants
      ADD COLUMN stay_days int GENERATED ALWAYS AS (
        CASE WHEN check_in IS NOT NULL AND check_out IS NOT NULL
             THEN GREATEST(0, (check_out - check_in))
             ELSE 0
        END
      ) STORED;
  END IF;
END$$;

-- 3) room_credit을 integer로 변경 (기존은 numeric)
ALTER TABLE public.rooming_participants
  ALTER COLUMN room_credit TYPE integer USING COALESCE(room_credit::integer, 0);

-- 4) agency_id 컬럼 추가 (이미 있을 수 있음)
ALTER TABLE public.rooming_participants
  ADD COLUMN IF NOT EXISTS agency_id uuid;

-- 5) 제약조건 추가 (이미 있을 수 있으므로 에러 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rooming_participants_uq'
  ) THEN
    ALTER TABLE public.rooming_participants
      ADD CONSTRAINT rooming_participants_uq UNIQUE (event_id, participant_id);
  END IF;
END$$;

-- 6) FK 제약조건 확인 및 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rooming_participants_event_fk'
  ) THEN
    ALTER TABLE public.rooming_participants
      ADD CONSTRAINT rooming_participants_event_fk
      FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rooming_participants_participant_fk'
  ) THEN
    ALTER TABLE public.rooming_participants
      ADD CONSTRAINT rooming_participants_participant_fk
      FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 7) updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_rooming_touch ON public.rooming_participants;
CREATE TRIGGER tg_rooming_touch
BEFORE UPDATE ON public.rooming_participants
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 8) 기존 데이터에 composition에서 adults/children/infants 추출하여 업데이트
UPDATE public.rooming_participants rp
SET 
  adults = COALESCE((p.composition->>'adult')::int, 1),
  children = COALESCE((p.composition->>'child')::int, 0),
  infants = COALESCE((p.composition->>'infant')::int, 0),
  agency_id = p.agency_id,
  status = CASE 
    WHEN rp.room_type IS NOT NULL AND rp.room_type != '배정대기' THEN '배정'::rooming_status
    ELSE '대기'::rooming_status
  END
FROM public.participants p
WHERE rp.participant_id = p.id
  AND (rp.adults IS NULL OR rp.children IS NULL OR rp.infants IS NULL);

-- [Phase 72-RULE.DB.RLS] RLS 정책 설정
ALTER TABLE public.rooming_participants ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS rp_select ON public.rooming_participants;
DROP POLICY IF EXISTS rp_write ON public.rooming_participants;
DROP POLICY IF EXISTS rp_update ON public.rooming_participants;
DROP POLICY IF EXISTS rp_delete ON public.rooming_participants;

-- 마스터 역할 확인 함수
CREATE OR REPLACE FUNCTION is_master(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = user_id 
    AND role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT: MASTER 또는 본인 agency 이벤트
CREATE POLICY rp_select ON public.rooming_participants
FOR SELECT USING (
  is_master(auth.uid())
  OR agency_id IN (
    SELECT ur.agency_id FROM user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- INSERT: MASTER 또는 본인 agency 이벤트
CREATE POLICY rp_write ON public.rooming_participants
FOR INSERT WITH CHECK (
  is_master(auth.uid())
  OR agency_id IN (
    SELECT ur.agency_id FROM user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- UPDATE: MASTER 또는 본인 agency 이벤트
CREATE POLICY rp_update ON public.rooming_participants
FOR UPDATE USING (
  is_master(auth.uid())
  OR agency_id IN (
    SELECT ur.agency_id FROM user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- DELETE: MASTER 또는 본인 agency 이벤트
CREATE POLICY rp_delete ON public.rooming_participants
FOR DELETE USING (
  is_master(auth.uid())
  OR agency_id IN (
    SELECT ur.agency_id FROM user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- [Phase 72-RULE.DB.RPC.SEED] 백필 RPC 함수
CREATE OR REPLACE FUNCTION public.seed_rooming_from_participants(p_event uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int := 0;
BEGIN
  INSERT INTO public.rooming_participants (
    event_id, participant_id, agency_id,
    adults, children, infants,
    room_type, room_credit,
    status, assigned_at
  )
  SELECT
    p.event_id, 
    p.id,
    p.agency_id,
    COALESCE((p.composition->>'adult')::int, 1),
    COALESCE((p.composition->>'child')::int, 0),
    COALESCE((p.composition->>'infant')::int, 0),
    COALESCE(NULLIF(p.room_preference, ''), '배정대기'),
    0,
    '대기'::rooming_status,
    now()
  FROM public.participants p
  WHERE p.event_id = p_event
    AND p.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.rooming_participants rp
      WHERE rp.event_id = p.event_id AND rp.participant_id = p.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;