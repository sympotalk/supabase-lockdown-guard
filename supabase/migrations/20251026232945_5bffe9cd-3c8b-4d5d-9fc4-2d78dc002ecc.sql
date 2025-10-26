-- [LOCKED][71-I.QA3-FIX.R4] Flexible RPC with AI column mapping (no unique index)

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
  v_updated int := 0;
  v_row record;
  v_existing_id uuid;
begin
  -- Get event's agency_id
  select agency_id into v_agency_id from events where id = p_event_id;
  
  if v_agency_id is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- Get user's agency_id
  select agency_id into v_user_agency
  from user_roles
  where user_id = auth.uid()
  limit 1;

  -- [HOTFIX] Allow master users to bypass agency scope check
  if v_user_agency is distinct from v_agency_id then
    if not exists(select 1 from user_roles where user_id = auth.uid() and role='master') then
      raise exception 'AGENCY_SCOPE_MISMATCH';
    end if;
  end if;

  -- Process each row with upsert logic
  for v_row in 
    select
      coalesce(x->>'name', x->>'participant_name', '') as name,
      coalesce(x->>'organization', x->>'company_name', '') as organization,
      coalesce(x->>'phone', x->>'participant_contact', '') as phone,
      x->>'email' as email,
      x->>'memo' as memo,
      x->>'team_name' as team_name,
      x->>'manager_name' as manager_name,
      x->>'manager_phone' as manager_phone
    from jsonb_array_elements(p_rows) x
    where coalesce(x->>'name', x->>'participant_name', '') != ''
  loop
    -- Check if participant exists (by event_id, name, and phone if available)
    if v_row.phone is not null and v_row.phone != '' then
      select id into v_existing_id
      from participants
      where event_id = p_event_id 
        and name = v_row.name 
        and phone = v_row.phone
      limit 1;
    else
      select id into v_existing_id
      from participants
      where event_id = p_event_id 
        and name = v_row.name
      limit 1;
    end if;

    if v_existing_id is not null then
      -- Update existing
      update participants set
        organization = v_row.organization,
        phone = coalesce(v_row.phone, phone),
        email = coalesce(v_row.email, email),
        memo = coalesce(v_row.memo, memo),
        team_name = coalesce(v_row.team_name, team_name),
        manager_name = coalesce(v_row.manager_name, manager_name),
        manager_phone = coalesce(v_row.manager_phone, manager_phone),
        updated_at = now()
      where id = v_existing_id;
      v_updated := v_updated + 1;
    else
      -- Insert new
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
        manager_phone
      ) values (
        p_event_id,
        v_agency_id,
        v_row.name,
        v_row.organization,
        v_row.phone,
        v_row.email,
        v_row.memo,
        v_row.team_name,
        v_row.manager_name,
        v_row.manager_phone
      );
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted + v_updated,
    'new', v_inserted,
    'updated', v_updated,
    'agency_id', v_agency_id,
    'event_id', p_event_id
  );
end $$;