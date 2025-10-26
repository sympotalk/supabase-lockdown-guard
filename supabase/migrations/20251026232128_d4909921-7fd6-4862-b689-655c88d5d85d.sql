-- [71-I.QA3-FIX.R3] Fix bulk upload to use existing schema (name, organization, phone)
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
  -- Get event's agency_id
  select agency_id into v_agency_id from events where id = p_event_id;
  
  if v_agency_id is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- Get user's agency from user_roles
  select agency_id into v_user_agency
  from user_roles
  where user_id = auth.uid()
  limit 1;
  
  -- Check if user is master
  select exists(
    select 1 from user_roles 
    where user_id = auth.uid() and role = 'master'
  ) into v_is_master;

  -- Allow master to bypass agency scope check
  if v_user_agency is distinct from v_agency_id and not v_is_master then
    raise exception 'AGENCY_SCOPE_MISMATCH';
  end if;

  -- Insert using existing schema columns
  insert into participants(
    event_id,
    agency_id,
    name,
    organization,
    phone,
    email,
    memo,
    team_name,
    manager_name,
    manager_phone,
    created_by
  )
  select
    p_event_id,
    v_agency_id,
    x->>'name',
    x->>'organization',
    x->>'phone',
    x->>'email',
    nullif(x->>'memo', ''),
    x->>'team_name',
    x->>'manager_name',
    x->>'manager_phone',
    auth.uid()
  from jsonb_array_elements(p_rows) x
  where x->>'name' is not null and x->>'name' != ''
  on conflict (event_id, name, phone)
  do update set
    organization = excluded.organization,
    email = coalesce(excluded.email, participants.email),
    memo = coalesce(excluded.memo, participants.memo),
    team_name = coalesce(excluded.team_name, participants.team_name),
    manager_name = coalesce(excluded.manager_name, participants.manager_name),
    manager_phone = coalesce(excluded.manager_phone, participants.manager_phone),
    updated_at = now();

  get diagnostics v_inserted = row_count;
  
  return jsonb_build_object(
    'inserted', v_inserted, 
    'agency_id', v_agency_id,
    'event_id', p_event_id
  );
end $$;