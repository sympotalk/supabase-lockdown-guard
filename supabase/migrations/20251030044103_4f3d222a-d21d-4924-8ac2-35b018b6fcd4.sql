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
  v_exists boolean;
  v_agency_id uuid;
  v_created_at timestamptz;
  v_name text; v_phone text; v_org text; v_memo text;
  v_manager_info jsonb;
  v_skipped jsonb := '[]'::jsonb;
begin
  select agency_id into v_agency_id
  from public.events where id = p_event_id;

  if p_replace then
    update public.participants
      set is_active = false, updated_at = now()
      where event_id = p_event_id and is_active is true;
    get diagnostics v_deleted = row_count;
  end if;

  for v_row in select * from jsonb_array_elements(p_data)
  loop
    -- Key alias mapping (다국어/표현 차이 보정)
    v_name := coalesce(
      nullif(trim(v_row.value->>'고객 성명'), ''),
      nullif(trim(v_row.value->>'고객성명'), ''),
      nullif(trim(v_row.value->>'성명'), ''),
      nullif(trim(v_row.value->>'이름'), ''),
      nullif(trim(v_row.value->>'customer_name'), ''),
      nullif(trim(v_row.value->>'client_name'), '')
    );

    v_phone := coalesce(
      nullif(trim(v_row.value->>'고객 연락처'), ''),
      nullif(trim(v_row.value->>'고객연락처'), ''),
      nullif(trim(v_row.value->>'연락처'), ''),
      nullif(trim(v_row.value->>'전화번호'), ''),
      nullif(trim(v_row.value->>'customer_phone'), ''),
      nullif(trim(v_row.value->>'client_phone'), '')
    );

    if v_name is null or v_phone is null then
      v_skip := v_skip + 1;
      v_skipped := v_skipped || jsonb_build_object('row', v_row.value, 'reason', 'name/phone required');
      continue;
    end if;

    v_org  := coalesce(
      nullif(trim(v_row.value->>'거래처명'), ''),
      nullif(trim(v_row.value->>'소속'), ''),
      nullif(trim(v_row.value->>'organization'), '')
    );

    v_memo := nullif(trim(v_row.value->>'메모'), '');

    v_manager_info := jsonb_strip_nulls(jsonb_build_object(
      'team',              nullif(trim(v_row.value->>'팀명'), ''),
      'name',              nullif(trim(v_row.value->>'담당자 성명'), ''),
      'phone',             nullif(trim(v_row.value->>'담당자 연락처'), ''),
      'emp_id',            nullif(trim(v_row.value->>'담당자 사번'), ''),
      'sfe_hospital_code', nullif(trim(v_row.value->>'SFE 거래처코드'), ''),
      'sfe_customer_code', nullif(trim(v_row.value->>'SFE 고객코드'), '')
    ));

    insert into public.participants (
      event_id, agency_id, name, phone,
      organization, memo, manager_info,
      role_badge, composition, is_active, created_at, updated_at
    )
    values (
      p_event_id, v_agency_id, v_name, v_phone,
      v_org, v_memo, v_manager_info,
      '참석자', '{"adult":1,"child":0,"infant":0}'::jsonb,
      true, now(), now()
    )
    on conflict (event_id, name, phone)
    do update set
      organization = excluded.organization,
      memo = excluded.memo,
      manager_info = coalesce(public.participants.manager_info, '{}')::jsonb || excluded.manager_info,
      updated_at = now();

    v_ins := v_ins + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'inserted', v_ins,
    'skipped', v_skip,
    'deleted', v_deleted,
    'skipped_rows', v_skipped
  );
end;
$$;