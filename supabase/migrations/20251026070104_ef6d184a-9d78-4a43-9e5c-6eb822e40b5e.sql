-- Phase 3.14-MA.REFRESH: Role Sync & Policy Reload (Revised)
-- Update app_role enum to 3-tier: master, agency_owner, staff

-- Step 1: Convert existing 'admin' roles to 'staff' in user_roles table
update user_roles
set role = 'staff'
where role = 'admin';

-- Step 2: Alter the app_role enum type
-- First, add new values if they don't exist (safe operation)
do $$
begin
  -- Check if 'staff' exists in app_role enum
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'staff' 
    and enumtypid = (select oid from pg_type where typname = 'app_role')
  ) then
    alter type app_role add value 'staff';
  end if;
exception
  when others then
    raise notice 'app_role enum modification skipped or completed';
end $$;

-- Step 3: Remove 'admin' value from enum (if no rows use it)
-- Note: PostgreSQL doesn't support removing enum values directly in older versions
-- This is handled by updating all admin -> staff first

-- Step 4: Update fn_manage_user_account to validate 3-tier roles
create or replace function public.fn_manage_user_account(
  p_user_id uuid default null,
  p_email text default null,
  p_role text default null,
  p_agency_id uuid default null,
  p_action text default 'invite'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_role text;
  v_result jsonb;
begin
  -- Get current user's role
  select role::text into v_current_role
  from user_roles
  where user_id = auth.uid()
  limit 1;

  -- Validate role value (3-tier only)
  if p_role is not null and p_role not in ('master', 'agency_owner', 'staff') then
    -- Auto-convert admin to staff
    if p_role = 'admin' then
      p_role := 'staff';
    else
      raise exception 'Invalid role: must be master, agency_owner, or staff';
    end if;
  end if;

  -- Action: invite
  if p_action = 'invite' then
    if v_current_role not in ('master', 'agency_owner') then
      raise exception 'Unauthorized: only MASTER or AGENCY_OWNER can invite users';
    end if;

    insert into account_provisioning (email, role, agency_id, created_by)
    values (p_email, p_role, p_agency_id, auth.uid())
    returning jsonb_build_object('id', id, 'email', email, 'role', role) into v_result;

    return v_result;
  end if;

  -- Action: update_role
  if p_action = 'update_role' then
    if v_current_role != 'master' then
      raise exception 'Unauthorized: only MASTER can update roles';
    end if;

    update user_roles
    set role = p_role::app_role
    where user_id = p_user_id;

    return jsonb_build_object('success', true, 'user_id', p_user_id, 'new_role', p_role);
  end if;

  -- Action: delete
  if p_action = 'delete' then
    if v_current_role != 'master' then
      raise exception 'Unauthorized: only MASTER can delete users';
    end if;

    delete from user_roles where user_id = p_user_id;
    return jsonb_build_object('success', true, 'deleted_user_id', p_user_id);
  end if;

  raise exception 'Invalid action: %', p_action;
end;
$$;

-- Log completion
do $$
begin
  raise notice '[3.14-MA.REFRESH] Role model synchronized — MASTER / AGENCY_OWNER / STAFF active.';
end $$;