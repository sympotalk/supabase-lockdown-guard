-- [Phase 72-RULE.DB.FK.REBUILD] Rooming FK 관계 중복 제거 및 재등록

-- 1️⃣ 중복 FK 관계 제거
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'rooming_participants'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name ILIKE '%participant%'
  LOOP
    EXECUTE format('ALTER TABLE public.rooming_participants DROP CONSTRAINT IF EXISTS %I;', fk.constraint_name);
    RAISE NOTICE 'Dropped FK constraint: %', fk.constraint_name;
  END LOOP;
END$$;

-- 2️⃣ FK 관계 재등록 (단일 관계만 유지)
ALTER TABLE public.rooming_participants
  ADD CONSTRAINT rooming_participants_participant_fk
  FOREIGN KEY (participant_id)
  REFERENCES public.participants(id)
  ON DELETE CASCADE;

-- 3️⃣ event_id FK도 확인하고 재등록
DO $$
DECLARE
  fk_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'rooming_participants'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'rooming_participants_event_fk'
  ) INTO fk_exists;
  
  IF NOT fk_exists THEN
    ALTER TABLE public.rooming_participants
      ADD CONSTRAINT rooming_participants_event_fk
      FOREIGN KEY (event_id)
      REFERENCES public.events(id)
      ON DELETE CASCADE;
    RAISE NOTICE 'Added event_id FK constraint';
  END IF;
END$$;

-- 4️⃣ 관계 캐시 재빌드
NOTIFY pgrst, 'reload schema';

-- 5️⃣ 검증: rooming_participants의 모든 FK 제약 조건 확인
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name = 'rooming_participants'
ORDER BY tc.constraint_name;