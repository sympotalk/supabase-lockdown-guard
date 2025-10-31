-- [Phase 77-A] AI 룸핑 자동 매칭 시스템 스키마 확장

-- 1. rooming_participants에 동반자 정보 필드 추가
ALTER TABLE public.rooming_participants 
ADD COLUMN IF NOT EXISTS companions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.rooming_participants.companions IS 'Array of participant IDs sharing the same room (동반의료인 등)';

-- 2. 요청사항 우선순위 관리를 위한 participant_requests 테이블 생성
CREATE TABLE IF NOT EXISTS public.participant_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'equipment', 'room_feature', 'view', 'floor' 등
  request_value TEXT NOT NULL, -- '아기침대', '엑스트라베드', '가습기', '리버뷰' 등
  priority INTEGER NOT NULL DEFAULT 3, -- 1=필수, 2=선호, 3=편의, 4=뷰/층
  is_fulfilled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant_id, request_type, request_value)
);

CREATE INDEX IF NOT EXISTS idx_participant_requests_participant ON public.participant_requests(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_requests_event ON public.participant_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_participant_requests_priority ON public.participant_requests(priority);

COMMENT ON TABLE public.participant_requests IS 'Phase 77-A: 참가자별 요청사항 및 우선순위 관리';

-- 3. AI 매칭 로그 테이블
CREATE TABLE IF NOT EXISTS public.rooming_match_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  match_run_id UUID NOT NULL, -- 동일 실행 그룹
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  matched_room_type_id UUID,
  match_reason TEXT, -- '소아 연령 기반', '역할 기반', '수동 배정' 등
  match_score NUMERIC(5,2), -- 매칭 신뢰도 점수 (0-100)
  warnings JSONB DEFAULT '[]'::jsonb, -- 경고사항 배열
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooming_match_logs_event ON public.rooming_match_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_rooming_match_logs_run ON public.rooming_match_logs(match_run_id);

COMMENT ON TABLE public.rooming_match_logs IS 'Phase 77-A: AI 룸핑 매칭 실행 기록';

-- 4. RLS 정책 설정
ALTER TABLE public.participant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooming_match_logs ENABLE ROW LEVEL SECURITY;

-- participant_requests 정책
CREATE POLICY "participant_requests_select_policy" ON public.participant_requests
  FOR SELECT USING (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY "participant_requests_modify_policy" ON public.participant_requests
  FOR ALL USING (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  ) WITH CHECK (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );

-- rooming_match_logs 정책
CREATE POLICY "rooming_match_logs_select_policy" ON public.rooming_match_logs
  FOR SELECT USING (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );

CREATE POLICY "rooming_match_logs_insert_policy" ON public.rooming_match_logs
  FOR INSERT WITH CHECK (
    has_event_access(auth.uid(), event_id) OR has_role(auth.uid(), 'master'::app_role)
  );