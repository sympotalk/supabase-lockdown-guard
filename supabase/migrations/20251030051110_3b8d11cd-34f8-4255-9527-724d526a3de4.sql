-- Drop existing function
drop function if exists public.ai_participant_import_from_excel(uuid, jsonb, boolean);

-- Recreate with agency_id auto-injection
create or replace function public.ai_participant_import_from_excel(
  p_event_id uuid,
  p_data jsonb,
  p_replace boolean default false
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ins int := 0;
  v_upd int := 0;
  v_skip int := 0;
  v_deleted int := 0;
  v_row record;
  v_agency_id uuid;
  v_name text; 
  v_phone text; 
  v_org text; 
  v_memo text;
  v_manager_info jsonb;
  v_skipped jsonb := '[]'::jsonb;
  v_session_id uuid := gen_random_uuid();
begin
  -- ✅ Get agency_id from current user's agency
  select id into v_agency_id 
  from public.agencies 
  where user_id = auth.uid();

  if v_agency_id is null then
    raise exception 'AGENCY_CONTEXT_NOT_FOUND: User % has no associated agency', auth.uid();
  end if;

  -- Soft delete if replace mode
  if p_replace then
    update public.participants
      set is_active = false, updated_at = now()
      where event_id = p_event_id 
        and agency_id = v_agency_id 
        and is_active is true;
    get diagnostics v_deleted = row_count;
  end if;

  -- Process each row
  for v_row in select * from jsonb_array_elements(p_data)
  loop
    -- Key alias mapping for name
    v_name := coalesce(
      nullif(trim(v_row.value->>'고객 성명'), ''),
      nullif(trim(v_row.value->>'고객성명'), ''),
      nullif(trim(v_row.value->>'성명'), ''),
      nullif(trim(v_row.value->>'이름'), ''),
      nullif(trim(v_row.value->>'customer_name'), ''),
      nullif(trim(v_row.value->>'client_name'), '')
    );

    -- Key alias mapping for phone
    v_phone := coalesce(
      nullif(trim(v_row.value->>'고객 연락처'), ''),
      nullif(trim(v_row.value->>'고객연락처'), ''),
      nullif(trim(v_row.value->>'연락처'), ''),
      nullif(trim(v_row.value->>'전화번호'), ''),
      nullif(trim(v_row.value->>'customer_phone'), ''),
      nullif(trim(v_row.value->>'client_phone'), '')
    );

    -- Skip if required fields missing
    if v_name is null or v_phone is null then
      v_skip := v_skip + 1;
      v_skipped := v_skipped || jsonb_build_object('row', v_row.value, 'reason', 'name/phone required');
      continue;
    end if;

    -- Key alias mapping for organization
    v_org := coalesce(
      nullif(trim(v_row.value->>'거래처명'), ''),
      nullif(trim(v_row.value->>'소속'), ''),
      nullif(trim(v_row.value->>'organization'), '')
    );

    -- Key alias mapping for memo
    v_memo := nullif(trim(v_row.value->>'메모'), '');

    -- Build manager info JSONB
    v_manager_info := jsonb_strip_nulls(jsonb_build_object(
      'team',              nullif(trim(v_row.value->>'팀명'), ''),
      'name',              nullif(trim(v_row.value->>'담당자 성명'), ''),
      'phone',             nullif(trim(v_row.value->>'담당자 연락처'), ''),
      'emp_id',            nullif(trim(v_row.value->>'담당자 사번'), ''),
      'sfe_hospital_code', nullif(trim(v_row.value->>'SFE 거래처코드'), ''),
      'sfe_customer_code', nullif(trim(v_row.value->>'SFE 고객코드'), '')
    ));

    -- Upsert participant with agency_id
    insert into public.participants (
      event_id, 
      agency_id,  -- ✅ Always included
      name, 
      phone,
      organization, 
      memo, 
      manager_info,
      role_badge, 
      composition, 
      is_active, 
      created_at, 
      updated_at
    )
    values (
      p_event_id, 
      v_agency_id,  -- ✅ Auto-injected from current user
      v_name, 
      v_phone,
      v_org, 
      v_memo, 
      v_manager_info,
      '참석자', 
      '{"adult":1,"child":0,"infant":0}'::jsonb,
      true, 
      now(), 
      now()
    )
    on conflict (event_id, name, phone)
    do update set
      organization = excluded.organization,
      memo = excluded.memo,
      manager_info = coalesce(public.participants.manager_info, '{}')::jsonb || excluded.manager_info,
      is_active = true,
      updated_at = now();

    if found then
      v_upd := v_upd + 1;
    else
      v_ins := v_ins + 1;
    end if;
  end loop;

  -- Log to participants_log if table exists
  if exists (select 1 from information_schema.tables where table_name = 'participants_log') then
    insert into public.participants_log (
      event_id, 
      agency_id, 
      action, 
      details, 
      upload_session_id
    )
    values (
      p_event_id,
      v_agency_id,
      'bulk_upload',
      jsonb_build_object(
        'total', jsonb_array_length(p_data),
        'inserted', v_ins,
        'updated', v_upd,
        'skipped', v_skip,
        'deleted', v_deleted,
        'replace_mode', p_replace
      ),
      v_session_id
    );
  end if;

  -- Notify realtime listeners
  perform pg_notify(
    'participant_changes',
    jsonb_build_object(
      'event_id', p_event_id,
      'agency_id', v_agency_id,
      'action', 'bulk_upload',
      'count', v_ins + v_upd
    )::text
  );

  return jsonb_build_object(
    'success', true,
    'total', jsonb_array_length(p_data),
    'inserted', v_ins,
    'updated', v_upd,
    'skipped', v_skip,
    'deleted', v_deleted,
    'mode', case when p_replace then 'replace' else 'update' end,
    'skipped_rows', v_skipped
  );
end;
$$;

-- Grant permissions
grant execute on function public.ai_participant_import_from_excel(uuid, jsonb, boolean) 
  to authenticated, service_role;