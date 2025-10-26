-- ============================================
-- Phase 3.14-MA: Master Account Management
-- ============================================

-- 1. Create user_profiles view for unified account management
create or replace view user_profiles as
select 
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  ur.role,
  ur.agency_id,
  a.name as agency_name,
  true as is_active
from auth.users u
left join user_roles ur on ur.user_id = u.id
left join agencies a on a.id = ur.agency_id
order by u.created_at desc;

-- 2. Create RPC function for user account management
create or replace function fn_manage_user_account(
  p_user_id uuid,
  p_email text default null,
  p_role app_role default null,
  p_agency_id uuid default null,
  p_action text default 'update'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- Only master can execute
  if not has_role(auth.uid(), 'master'::app_role) then
    raise exception 'Unauthorized: Master access required';
  end if;

  case p_action
    when 'update_role' then
      -- Update user role
      update user_roles
      set role = p_role,
          agency_id = coalesce(p_agency_id, agency_id)
      where user_id = p_user_id;
      
      v_result = jsonb_build_object(
        'success', true,
        'action', 'update_role',
        'user_id', p_user_id
      );

    when 'delete' then
      -- Soft delete: remove from user_roles
      delete from user_roles where user_id = p_user_id;
      
      v_result = jsonb_build_object(
        'success', true,
        'action', 'delete',
        'user_id', p_user_id
      );

    else
      raise exception 'Invalid action: %', p_action;
  end case;

  return v_result;
end;
$$;

-- 3. Grant permissions on view
grant select on user_profiles to authenticated;

-- 4. Comment on objects
comment on view user_profiles is 'Unified view of all user accounts with role and agency information';
comment on function fn_manage_user_account is 'Master-only function to manage user accounts (update role, delete)';