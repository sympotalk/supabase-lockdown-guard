-- [DB/Phase 75-D.1] participants 변경이력 트리거 스키마 불일치 수정
-- 목적: metadata JSONB 내부에 event_id, agency_id를 기록하도록 수정

CREATE OR REPLACE FUNCTION public.trg_log_participant_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- JWT에서 사용자 ID 안전하게 추출
  BEGIN
    v_user_id := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.participants_log (
      participant_id,
      action,
      metadata,
      changed_fields,
      edited_by,
      created_at,
      edited_at
    )
    VALUES (
      NEW.id,
      'update',
      jsonb_build_object(
        'trigger', 'auto',
        'event_id', NEW.event_id::text,
        'agency_id', NEW.agency_id::text,
        'updated_at', now()
      ),
      (
        SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
        FROM (
          SELECT key,
                 to_jsonb(OLD)->key AS old_val,
                 to_jsonb(NEW)->key AS new_val
          FROM jsonb_object_keys(to_jsonb(OLD)) AS key
          WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key
        ) diff
      ),
      CASE WHEN v_user_id IS NOT NULL THEN v_user_id::uuid ELSE NULL END,
      now(),
      now()
    );

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.participants_log (
      participant_id,
      action,
      metadata,
      edited_by,
      created_at,
      edited_at
    )
    VALUES (
      OLD.id,
      'delete',
      jsonb_build_object(
        'trigger', 'auto',
        'event_id', OLD.event_id::text,
        'agency_id', OLD.agency_id::text,
        'deleted_record', to_jsonb(OLD),
        'deleted_at', now()
      ),
      CASE WHEN v_user_id IS NOT NULL THEN v_user_id::uuid ELSE NULL END,
      now(),
      now()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_log_participant_change ON public.participants;
CREATE TRIGGER trg_log_participant_change
AFTER UPDATE OR DELETE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.trg_log_participant_change();

COMMENT ON FUNCTION public.trg_log_participant_change() IS 
'[Phase 75-D.1] Auto-logs UPDATE/DELETE on participants to participants_log with event_id/agency_id in metadata JSONB';