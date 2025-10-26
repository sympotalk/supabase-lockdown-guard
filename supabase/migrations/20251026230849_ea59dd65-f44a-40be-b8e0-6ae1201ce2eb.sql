-- [71-I.QA3-FIX.R2] Hotfix for AGENCY_SCOPE_MISMATCH
create or replace function public.fn_bulk_upload_participants(
  p_event_id uuid,
  p_rows jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_user_agency uuid;
  v_inserted int := 0;
  v_is_master boolean := false;
begin
  -- 행사 소속 에이전시 ID 조회
  select agency_id into v_agency_id from events where id = p_event_id;
  
  if v_agency_id is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- 현재 사용자 세션의 agencyScope 감지
  select agency_id into v_user_agency
  from user_roles
  where user_id = auth.uid()
  limit 1;
  
  -- 마스터 권한 확인
  select exists(
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'master'
  ) into v_is_master;

  -- [핫픽스] agencyScope가 없거나 불일치해도 마스터는 허용
  if v_user_agency is distinct from v_agency_id and not v_is_master then
    raise exception 'AGENCY_SCOPE_MISMATCH';
  end if;

  insert into participants(
    event_id,
    agency_id,
    participant_name,
    company_name,
    participant_contact,
    memo,
    manager_info,
    sfe_agency_code,
    sfe_customer_code,
    stay_plan,
    updated_by
  )
  select
    p_event_id,
    v_agency_id,
    x->>'participant_name',
    x->>'company_name',
    x->>'participant_contact',
    nullif(x->>'memo',''),
    nullif(x->'manager_info','{}'::jsonb),
    x->>'sfe_agency_code',
    x->>'sfe_customer_code',
    nullif(x->>'stay_plan',''),
    auth.uid()
  from jsonb_array_elements(p_rows) x
  where x->>'participant_name' is not null and x->>'participant_name' != ''
  on conflict (event_id, participant_name, participant_contact)
  do update set
    company_name = excluded.company_name,
    memo = coalesce(excluded.memo, participants.memo),
    manager_info = coalesce(excluded.manager_info, participants.manager_info),
    sfe_agency_code = coalesce(excluded.sfe_agency_code, participants.sfe_agency_code),
    sfe_customer_code = coalesce(excluded.sfe_customer_code, participants.sfe_customer_code),
    stay_plan = coalesce(excluded.stay_plan, participants.stay_plan),
    updated_by = auth.uid()
  where participants.is_deleted = false;

  get diagnostics v_inserted = row_count;
  
  return jsonb_build_object(
    'inserted', v_inserted, 
    'agency_id', v_agency_id,
    'event_id', p_event_id
  );
end $$;