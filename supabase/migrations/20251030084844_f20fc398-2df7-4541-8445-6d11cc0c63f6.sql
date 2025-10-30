-- [Phase 73-L.7.11] FK 복원 + View 생성

-- A. FK 복원 (participants_log ↔ participants)
ALTER TABLE public.participants_log
DROP CONSTRAINT IF EXISTS participants_log_participant_id_fkey;

ALTER TABLE public.participants_log
ADD CONSTRAINT participants_log_participant_id_fkey
FOREIGN KEY (participant_id)
REFERENCES public.participants (id)
ON DELETE CASCADE;

-- B. RLS 활성화 (명시적 expose)
ALTER TABLE public.participants_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- C. PostgREST 관계 인식 갱신용 view 생성
CREATE OR REPLACE VIEW public.participants_with_logs AS
SELECT 
  p.*, 
  COALESCE(json_agg(l.*) FILTER (WHERE l.id IS NOT NULL), '[]') AS logs
FROM public.participants p
LEFT JOIN public.participants_log l ON l.participant_id = p.id
GROUP BY p.id;

GRANT SELECT ON public.participants_with_logs TO authenticated;