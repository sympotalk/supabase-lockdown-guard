-- Remove memo column from agencies (no longer needed)
alter table public.agencies drop column if exists memo;

-- Function: fn_manage_agency (unified create/update for agencies)
create or replace function public.fn_manage_agency(
  p_action text,
  p_agency_id uuid default null,
  p_name text default null,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role text;
  v_result jsonb;
  v_agency_id uuid;
begin
  -- Check if caller is master
  select role::text into v_my_role
  from user_roles
  where user_id = auth.uid()
  limit 1;

  if v_my_role != 'master' then
    raise exception 'Unauthorized: only MASTER can manage agencies';
  end if;

  -- CREATE action
  if p_action = 'create' then
    -- Validate required fields
    if p_name is null or trim(p_name) = '' then
      raise exception 'Agency name is required';
    end if;

    if p_email is null or trim(p_email) = '' then
      raise exception 'Contact email is required';
    end if;

    -- Check for duplicate agency name
    if exists(select 1 from agencies where lower(trim(name)) = lower(trim(p_name))) then
      raise exception 'Agency with this name already exists';
    end if;

    -- Insert new agency
    insert into agencies (name, contact_email, created_by, is_active)
    values (trim(p_name), trim(p_email), auth.uid(), true)
    returning id into v_agency_id;

    -- Log the action
    insert into logs (
      action,
      actor_role,
      target_table,
      payload,
      created_by,
      agency_id
    ) values (
      'AGENCY_CREATED',
      'master',
      'agencies',
      jsonb_build_object(
        'agency_id', v_agency_id,
        'name', p_name,
        'email', p_email
      ),
      auth.uid(),
      v_agency_id
    );

    return jsonb_build_object(
      'success', true,
      'id', v_agency_id,
      'name', p_name,
      'email', p_email
    );
  end if;

  -- UPDATE action
  if p_action = 'update' then
    if p_agency_id is null then
      raise exception 'Agency ID is required for update';
    end if;

    -- Check if agency exists
    if not exists(select 1 from agencies where id = p_agency_id) then
      raise exception 'Agency not found';
    end if;

    -- Check for duplicate name (excluding current agency)
    if p_name is not null and exists(
      select 1 from agencies 
      where lower(trim(name)) = lower(trim(p_name)) 
      and id != p_agency_id
    ) then
      raise exception 'Agency with this name already exists';
    end if;

    -- Update agency
    update agencies
    set 
      name = coalesce(nullif(trim(p_name), ''), name),
      contact_email = coalesce(nullif(trim(p_email), ''), contact_email),
      updated_at = now()
    where id = p_agency_id;

    -- Log the action
    insert into logs (
      action,
      actor_role,
      target_table,
      payload,
      created_by,
      agency_id
    ) values (
      'AGENCY_UPDATED',
      'master',
      'agencies',
      jsonb_build_object(
        'agency_id', p_agency_id,
        'name', p_name,
        'email', p_email
      ),
      auth.uid(),
      p_agency_id
    );

    return jsonb_build_object(
      'success', true,
      'id', p_agency_id,
      'updated_at', now()
    );
  end if;

  raise exception 'Invalid action: must be "create" or "update"';
end $$;