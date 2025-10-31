-- Phase 77-RPC-UPLOAD-DECOUPLE.v1
-- 목적: Excel 업로드 시 동반의료인 필드를 무시하고, 업로드 완료 후 별도 매핑 처리

CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(p_event_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record jsonb;
  v_name TEXT;
  v_phone TEXT;
  v_company TEXT;
  v_request_note TEXT;
  v_memo TEXT;
  v_position TEXT;
  v_manager_info JSONB;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  FOR v_record IN
    SELECT * FROM jsonb_array_elements(p_payload)
  LOOP
    v_name := COALESCE(TRIM(v_record->>'성명'), TRIM(v_record->>'이름'), '');
    v_phone := COALESCE(TRIM(v_record->>'연락처'), TRIM(v_record->>'전화번호'), '');
    v_company := COALESCE(TRIM(v_record->>'소속'), '');
    v_request_note := COALESCE(TRIM(v_record->>'요청사항'), '');
    v_memo := COALESCE(TRIM(v_record->>'메모'), '');
    v_position := COALESCE(TRIM(v_record->>'구분'), '');
    v_manager_info := jsonb_build_object(
      'team', NULLIF(TRIM(v_record->>'팀명'), ''),
      'manager', NULLIF(TRIM(v_record->>'담당자'), ''),
      'manager_phone', NULLIF(TRIM(v_record->>'담당자연락처'), ''),
      'manager_id', NULLIF(TRIM(v_record->>'사번'), '')
    );

    -- 이름이나 연락처가 비어있으면 스킵
    IF v_name = '' OR v_phone = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- ✅ 동반의료인 관련 컬럼은 업로드 단계에서 제외 (companion / companion_info 무시)
    INSERT INTO public.participants (
      event_id, name, phone, organization,
      request_note, memo, position, manager_info,
      updated_at
    )
    VALUES (
      p_event_id,
      v_name,
      v_phone,
      v_company,
      v_request_note,
      v_memo,
      v_position,
      v_manager_info,
      NOW()
    )
    ON CONFLICT (event_id, phone)
    DO UPDATE SET
      name = EXCLUDED.name,
      organization = EXCLUDED.organization,
      request_note = EXCLUDED.request_note,
      memo = EXCLUDED.memo,
      position = EXCLUDED.position,
      manager_info = EXCLUDED.manager_info,
      updated_at = NOW();

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb)
  TO authenticated, service_role;