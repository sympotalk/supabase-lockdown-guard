-- [Phase 72–RM.TM.STATUS.UNIFY] TM Status Management
-- Add TM status tracking columns to participants table

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS call_status text DEFAULT '대기중',
  ADD COLUMN IF NOT EXISTS call_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS call_actor uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS call_memo text;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_participants_call_status ON public.participants(call_status);
CREATE INDEX IF NOT EXISTS idx_participants_call_updated_at ON public.participants(call_updated_at);

-- Function to sync call_status to rooming (불참 처리)
CREATE OR REPLACE FUNCTION public.fn_sync_call_status_to_rooming()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If status changed to not-attending, deactivate rooming
  IF NEW.call_status IN ('불참', 'TM완료(불참)') AND 
     OLD.call_status IS DISTINCT FROM NEW.call_status THEN
    UPDATE rooming_participants
    SET is_active = false
    WHERE participant_id = NEW.id;
  END IF;

  -- If status changed to attending, reactivate rooming
  IF NEW.call_status IN ('응답(참석)', 'TM완료(참석)') AND 
     OLD.call_status IS DISTINCT FROM NEW.call_status THEN
    UPDATE rooming_participants
    SET is_active = true
    WHERE participant_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for call_status to rooming sync
DROP TRIGGER IF EXISTS trg_sync_call_status_to_rooming ON participants;

CREATE TRIGGER trg_sync_call_status_to_rooming
AFTER UPDATE OF call_status ON public.participants
FOR EACH ROW
WHEN (OLD.call_status IS DISTINCT FROM NEW.call_status)
EXECUTE FUNCTION public.fn_sync_call_status_to_rooming();

COMMENT ON COLUMN public.participants.call_status IS 'TM/모객 상태: 대기중, 응답(참석), 응답(미정), 불참, TM예정, TM완료(참석), TM완료(불참)';
COMMENT ON COLUMN public.participants.call_updated_at IS 'TM 상태 최근 변경 시각';
COMMENT ON COLUMN public.participants.call_actor IS 'TM 상태를 변경한 사용자 ID';
COMMENT ON COLUMN public.participants.call_memo IS 'TM 콜 내용 메모';