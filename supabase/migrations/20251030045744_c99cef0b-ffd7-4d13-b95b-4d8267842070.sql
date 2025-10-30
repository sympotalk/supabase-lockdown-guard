-- Phase 73-L.REBUILD: RPC & Reference Tree Restoration
-- Step 1: Clear function cache
drop function if exists public.ai_participant_import_from_excel(uuid, jsonb, boolean) cascade;
drop function if exists public.upsert_participants_from_excel(uuid, jsonb, text) cascade;
drop function if exists public.fn_rooming_sync cascade;
drop function if exists public.fn_event_room_upsert cascade;

-- Step 2: Recreate event_rooms table structure (reference table)
create table if not exists public.event_rooms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  room_type text,
  room_name text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Add index for performance
create index if not exists idx_event_rooms_event_id on public.event_rooms(event_id);

-- Step 3: Recreate ai_participant_import_from_excel with fixed references
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
  v_name text;
  v_phone text;
  v_org text;
  v_memo text;
  v_manager_info jsonb;
  v_agency_id uuid;
  v_skipped jsonb := '[]'::jsonb;
begin
  -- Get agency_id from event
  select agency_id into v_agency_id
  from public.events where id = p_event_id;

  -- Check event_rooms existence (optional dependency)
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'event_rooms') then
    raise notice 'event_rooms not found, skipping dependency';
  end if;

  -- Replace mode: soft delete existing participants
  if p_replace then
    update public.participants
      set is_active = false, updated_at = now()
      where event_id = p_event_id and is_active = true;
    get diagnostics v_deleted = row_count;
  end if;

  -- Process each row with key alias mapping
  for v_row in select * from jsonb_array_elements(p_data)
  loop
    -- Name mapping with fallbacks
    v_name := coalesce(
      nullif(trim(v_row.value->>'고객 성명'), ''),
      nullif(trim(v_row.value->>'고객성명'), ''),
      nullif(trim(v_row.value->>'성명'), ''),
      nullif(trim(v_row.value->>'customer_name'), ''),
      nullif(trim(v_row.value->>'client_name'), '')
    );

    -- Phone mapping with fallbacks
    v_phone := coalesce(
      nullif(trim(v_row.value->>'고객 연락처'), ''),
      nullif(trim(v_row.value->>'고객연락처'), ''),
      nullif(trim(v_row.value->>'연락처'), ''),
      nullif(trim(v_row.value->>'customer_phone'), ''),
      nullif(trim(v_row.value->>'client_phone'), '')
    );

    -- Skip if required fields missing
    if v_name is null or v_phone is null then
      v_skip := v_skip + 1;
      v_skipped := v_skipped || jsonb_build_object('row', v_row.value, 'reason', 'name/phone required');
      continue;
    end if;

    -- Organization mapping
    v_org := coalesce(
      nullif(trim(v_row.value->>'거래처명'), ''),
      nullif(trim(v_row.value->>'소속'), ''),
      nullif(trim(v_row.value->>'organization'), '')
    );

    v_memo := nullif(trim(v_row.value->>'메모'), '');

    -- Build manager_info JSON
    v_manager_info := jsonb_strip_nulls(jsonb_build_object(
      'team', nullif(trim(v_row.value->>'팀명'), ''),
      'name', nullif(trim(v_row.value->>'담당자 성명'), ''),
      'phone', nullif(trim(v_row.value->>'담당자 연락처'), ''),
      'emp_id', nullif(trim(v_row.value->>'담당자 사번'), ''),
      'sfe_hospital_code', nullif(trim(v_row.value->>'SFE 거래처코드'), ''),
      'sfe_customer_code', nullif(trim(v_row.value->>'SFE 고객코드'), '')
    ));

    -- Upsert participant
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
      manager_info = coalesce(participants.manager_info, '{}'::jsonb) || excluded.manager_info,
      is_active = true,
      updated_at = now();

    if found then
      v_upd := v_upd + 1;
    else
      v_ins := v_ins + 1;
    end if;
  end loop;

  -- Log to participants_log if table exists
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'participants_log') then
    insert into public.participants_log (event_id, agency_id, action, metadata)
    values (
      p_event_id, v_agency_id, 'bulk_upload',
      jsonb_build_object(
        'mode', case when p_replace then 'replace' else 'update' end,
        'inserted', v_ins,
        'updated', v_upd,
        'skipped', v_skip,
        'deleted', v_deleted
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'total', v_ins + v_upd,
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
grant execute on function public.ai_participant_import_from_excel(uuid, jsonb, boolean) to authenticated;
grant execute on function public.ai_participant_import_from_excel(uuid, jsonb, boolean) to service_role;