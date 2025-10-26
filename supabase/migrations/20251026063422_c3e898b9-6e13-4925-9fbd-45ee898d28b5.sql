-- Phase 3.14-MA.EXT.R2: Remove STAFF invite permission
-- Only MASTER and AGENCY_OWNER can invite users

-- Drop existing function (all overloads)
drop function if exists public.fn_manage_user_account cascade;

-- Recreate function with STAFF restriction
create function public.fn_manage_user_account(
  p_action text,
  p_user_id uuid default null,
  p_email text default null,
  p_role text default null,
  p_agency_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_current_role text;
begin
  -- Get current user's role
  select role into v_current_role
  from user_roles
  where user_id = auth.uid()
  limit 1;

  -- INVITE: Only MASTER or AGENCY_OWNER can invite
  if p_action = 'invite' then
    if v_current_role not in ('master', 'agency_owner') then
      raise exception 'Unauthorized: only MASTER or AGENCY_OWNER can invite users';
    end if;

    -- Validate required parameters
    if p_email is null or p_role is null then
      raise exception 'Email and role are required for invite action';
    end if;

    -- For AGENCY_OWNER, agency_id is required and must match their agency
    if v_current_role = 'agency_owner' then
      if p_agency_id is null then
        raise exception 'Agency ID is required for agency owner invites';
      end if;
      
      -- Verify the agency_owner belongs to this agency
      if not exists (
        select 1 from user_roles 
        where user_id = auth.uid() 
        and agency_id = p_agency_id
        and role = 'agency_owner'
      ) then
        raise exception 'Unauthorized: can only invite to your own agency';
      end if;
    end if;

    -- Create account provisioning record
    insert into account_provisioning (
      email,
      role,
      agency_id,
      created_by,
      is_active
    ) values (
      p_email,
      p_role,
      p_agency_id,
      auth.uid(),
      true
    );

    return jsonb_build_object(
      'success', true,
      'message', 'Invite created successfully'
    );

  -- UPDATE ROLE: Only MASTER or AGENCY_OWNER
  elsif p_action = 'update_role' then
    if v_current_role not in ('master', 'agency_owner') then
      raise exception 'Unauthorized: only MASTER or AGENCY_OWNER can update roles';
    end if;

    if p_user_id is null or p_role is null then
      raise exception 'User ID and role are required for update_role action';
    end if;

    -- Update the role
    update user_roles
    set role = p_role::app_role,
        updated_at = now()
    where user_id = p_user_id
    and (
      v_current_role = 'master'
      or (v_current_role = 'agency_owner' and agency_id = p_agency_id)
    );

    return jsonb_build_object(
      'success', true,
      'message', 'Role updated successfully'
    );

  -- DELETE: Only MASTER or AGENCY_OWNER (soft delete)
  elsif p_action = 'delete' then
    if v_current_role not in ('master', 'agency_owner') then
      raise exception 'Unauthorized: only MASTER or AGENCY_OWNER can delete users';
    end if;

    if p_user_id is null then
      raise exception 'User ID is required for delete action';
    end if;

    -- Soft delete by deactivating
    update user_roles
    set is_active = false,
        updated_at = now()
    where user_id = p_user_id
    and (
      v_current_role = 'master'
      or (v_current_role = 'agency_owner' and agency_id = p_agency_id)
    );

    return jsonb_build_object(
      'success', true,
      'message', 'User deactivated successfully'
    );

  else
    raise exception 'Invalid action: %', p_action;
  end if;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.fn_manage_user_account to authenticated;

-- Add comment
comment on function public.fn_manage_user_account is 
'Manages user accounts with role-based permissions. Only MASTER and AGENCY_OWNER can invite/update/delete users. STAFF has read-only access to account management.';