-- [Phase 72–RM.TM.HISTORY.TRACE] TM 상태/메모 이력 추적 및 복원

-- 1️⃣ TM 이력 로그 테이블 생성
CREATE TABLE IF NOT EXISTS public.tm_history_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL CHECK (action_type IN ('상태변경', '메모수정')),
  before_value text,
  after_value text,
  created_at timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tm_history_participant ON public.tm_history_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_tm_history_event ON public.tm_history_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_tm_history_created ON public.tm_history_logs(created_at DESC);

-- RLS 활성화 (마스터 및 QA 전용)
ALTER TABLE public.tm_history_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tm_history_master_qa_only"
ON public.tm_history_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('master', 'admin')
  )
);

-- 2️⃣ TM 상태/메모 변경 자동 로깅 함수
CREATE OR REPLACE FUNCTION public.log_tm_status_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 상태 변경 로그
  IF NEW.call_status IS DISTINCT FROM OLD.call_status THEN
    INSERT INTO public.tm_history_logs (
      event_id, 
      participant_id, 
      actor_id, 
      action_type, 
      before_value, 
      after_value
    )
    VALUES (
      NEW.event_id, 
      NEW.id, 
      auth.uid(), 
      '상태변경', 
      OLD.call_status, 
      NEW.call_status
    );
  END IF;

  -- 메모 변경 로그
  IF NEW.call_memo IS DISTINCT FROM OLD.call_memo THEN
    INSERT INTO public.tm_history_logs (
      event_id, 
      participant_id, 
      actor_id, 
      action_type, 
      before_value, 
      after_value
    )
    VALUES (
      NEW.event_id, 
      NEW.id, 
      auth.uid(), 
      '메모수정', 
      OLD.call_memo, 
      NEW.call_memo
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3️⃣ 트리거 연결
DROP TRIGGER IF EXISTS trg_tm_status_logger ON public.participants;

CREATE TRIGGER trg_tm_status_logger
AFTER UPDATE OF call_status, call_memo ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.log_tm_status_changes();

-- 4️⃣ 복원 RPC 함수
CREATE OR REPLACE FUNCTION public.restore_tm_status(p_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log public.tm_history_logs;
  v_result jsonb;
BEGIN
  -- 권한 확인 (마스터 또는 관리자만)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('master', 'admin')
  ) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;

  -- 로그 데이터 조회
  SELECT * INTO v_log 
  FROM public.tm_history_logs 
  WHERE id = p_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'log_not_found';
  END IF;

  -- 상태 복원
  IF v_log.action_type = '상태변경' THEN
    UPDATE public.participants
    SET call_status = v_log.before_value,
        call_updated_at = now(),
        call_actor = auth.uid()
    WHERE id = v_log.participant_id;

    v_result := jsonb_build_object(
      'type', 'status',
      'restored_value', v_log.before_value
    );
  
  -- 메모 복원
  ELSIF v_log.action_type = '메모수정' THEN
    UPDATE public.participants
    SET call_memo = v_log.before_value,
        call_updated_at = now(),
        call_actor = auth.uid()
    WHERE id = v_log.participant_id;

    v_result := jsonb_build_object(
      'type', 'memo',
      'restored_value', v_log.before_value
    );
  END IF;

  -- 복원 이력 기록
  INSERT INTO public.activity_logs (
    event_id,
    actor_role,
    action,
    target_table,
    payload,
    created_by
  )
  SELECT
    v_log.event_id,
    ur.role::text,
    'TM_RESTORE',
    'participants',
    jsonb_build_object(
      'participant_id', v_log.participant_id,
      'action_type', v_log.action_type,
      'restored_to', v_log.before_value
    ),
    auth.uid()
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  RETURN jsonb_build_object(
    'status', 'success',
    'result', v_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- 5️⃣ 코멘트 추가
COMMENT ON TABLE public.tm_history_logs IS '[Phase 72] TM 상태 및 메모 변경 이력 (마스터/QA 전용)';
COMMENT ON FUNCTION public.log_tm_status_changes() IS '[Phase 72] TM 상태/메모 변경 시 자동 로깅';
COMMENT ON FUNCTION public.restore_tm_status(uuid) IS '[Phase 72] TM 상태/메모 이전 값으로 복원';