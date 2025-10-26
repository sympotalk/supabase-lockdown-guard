-- Function: fn_register_agency (Master-only agency registration)
create or replace function public.fn_register_agency(
  p_name text,
  p_email text,
  p_memo text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role text;
  v_agency_id uuid;
begin
  -- Check if caller is master
  select role::text into v_my_role
  from user_roles
  where user_id = auth.uid()
  limit 1;

  if v_my_role != 'master' then
    raise exception 'Unauthorized: only MASTER can register agencies';
  end if;

  -- Validate required fields
  if p_name is null or trim(p_name) = '' then
    raise exception 'Agency name is required';
  end if;

  if p_email is null or trim(p_email) = '' then
    raise exception 'Contact email is required';
  end if;

  -- Insert new agency
  insert into agencies (name, contact_email, memo, created_by, is_active)
  values (p_name, p_email, p_memo, auth.uid(), true)
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
    'AGENCY_REGISTERED',
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
    'agency_id', v_agency_id,
    'name', p_name
  );
end $$;

-- Add memo column to agencies if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'agencies'
    and column_name = 'memo'
  ) then
    alter table public.agencies add column memo text;
  end if;
end $$;