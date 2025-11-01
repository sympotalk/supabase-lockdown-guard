-- Phase 77-UF-FIX.9: Participants Column Name Correction
-- Purpose: Update ai_participant_import_from_excel RPC to use correct column names
-- Changes: participant_name → name, company_name → organization
-- Note: Dropping function first due to return type change (void → jsonb)

-- Step 1: Drop existing function
DROP FUNCTION IF EXISTS public.ai_participant_import_from_excel(uuid, jsonb, boolean, text);

-- Step 2: Recreate with corrected column names and jsonb return type
CREATE OR REPLACE FUNCTION public.ai_participant_import_from_excel(
    p_event_id uuid,
    p_data jsonb,
    p_replace boolean DEFAULT false,
    p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_count INT := 0;
    v_agency_id UUID;
BEGIN
    RAISE NOTICE '[77-UF-FIX.9] Replace mode started for event_id=%', p_event_id;

    -- Get agency_id from event
    SELECT agency_id INTO v_agency_id
    FROM public.events
    WHERE id = p_event_id;

    -- Defer FK constraint validation until transaction commit
    SET CONSTRAINTS ALL DEFERRED;

    -- Replace mode: delete existing participants
    IF p_replace THEN
        DELETE FROM public.participants WHERE event_id = p_event_id;
        RAISE NOTICE '[77-UF-FIX.9] Existing participants deleted for replace mode';
    END IF;

    -- Insert new participants with corrected column names
    INSERT INTO public.participants (
        event_id,
        agency_id,
        name,              -- ✅ Corrected from participant_name
        phone,
        organization,      -- ✅ Corrected from company_name
        position,
        memo,
        companion_info,
        manager_info,
        role_badge,
        composition,
        is_active,
        created_at,
        updated_at
    )
    SELECT
        p_event_id,
        v_agency_id,
        NULLIF(TRIM(elem->>'고객 성명'), ''),
        NULLIF(TRIM(elem->>'고객 연락처'), ''),
        NULLIF(TRIM(elem->>'거래처명'), ''),
        NULLIF(TRIM(elem->>'직급'), ''),
        NULLIF(TRIM(elem->>'메모'), ''),
        COALESCE((elem->>'companion_info')::jsonb, '{}'::jsonb),
        jsonb_strip_nulls(jsonb_build_object(
            'team', NULLIF(TRIM(elem->>'팀명'), ''),
            'name', NULLIF(TRIM(elem->>'담당자 성명'), ''),
            'phone', NULLIF(TRIM(elem->>'담당자 연락처'), ''),
            'emp_id', NULLIF(TRIM(elem->>'담당자 사번'), ''),
            'sfe_hospital_code', NULLIF(NULLIF(TRIM(elem->>'SFE 거래처코드'), ''), '-'),
            'sfe_customer_code', NULLIF(NULLIF(TRIM(elem->>'SFE 고객코드'), ''), '-')
        )),
        COALESCE(NULLIF(TRIM(elem->>'역할'), ''), '참석자'),
        COALESCE((elem->>'composition')::jsonb, '{"adult": 1, "child": 0, "infant": 0}'::jsonb),
        true,
        NOW(),
        NOW()
    FROM jsonb_array_elements(p_data) AS elem;

    GET DIAGNOSTICS v_total_count = ROW_COUNT;
    RAISE NOTICE '[77-UF-FIX.9] % participants inserted.', v_total_count;

    -- Log the upload action
    INSERT INTO public.participants_log (
        event_id,
        agency_id,
        action,
        metadata,
        created_by,
        created_at
    )
    VALUES (
        p_event_id,
        v_agency_id,
        'bulk_upload',
        jsonb_build_object(
            'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
            'total', v_total_count,
            'session_id', COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text)
        ),
        auth.uid(),
        NOW()
    );

    RAISE NOTICE '[77-UF-FIX.9] Transaction complete. FK deferred verification will occur on COMMIT.';

    RETURN jsonb_build_object(
        'status', 'success',
        'total', v_total_count,
        'mode', CASE WHEN p_replace THEN 'replace' ELSE 'append' END,
        'event_id', p_event_id,
        'session_id', COALESCE(p_session_id, 'excel_' || extract(epoch from now())::bigint::text)
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_participant_import_from_excel(uuid, jsonb, boolean, text) TO service_role;