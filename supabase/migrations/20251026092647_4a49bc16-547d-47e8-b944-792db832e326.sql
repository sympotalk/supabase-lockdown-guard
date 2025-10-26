-- [LOCKED][71-D.FIXFLOW.STABLE] RLS policies for agency-scoped resources (corrected)

-- Enable RLS on core tables
alter table public.participants enable row level security;
alter table public.rooming_participants enable row level security;
alter table public.messages enable row level security;

-- Drop existing policies if any (to avoid conflicts)
drop policy if exists p_participants_master_all on public.participants;
drop policy if exists p_rooming_participants_master_all on public.rooming_participants;
drop policy if exists p_messages_master_all on public.messages;
drop policy if exists p_participants_agency_scope on public.participants;
drop policy if exists p_rooming_participants_agency_scope on public.rooming_participants;
drop policy if exists p_messages_agency_scope on public.messages;

-- MASTER unrestricted access
create policy p_participants_master_all on public.participants
  for all to authenticated
  using (has_role(auth.uid(), 'master'))
  with check (has_role(auth.uid(), 'master'));

create policy p_rooming_participants_master_all on public.rooming_participants
  for all to authenticated
  using (has_role(auth.uid(), 'master'))
  with check (has_role(auth.uid(), 'master'));

create policy p_messages_master_all on public.messages
  for all to authenticated
  using (has_role(auth.uid(), 'master'))
  with check (has_role(auth.uid(), 'master'));

-- AGENCY scoped access (owner/staff)
create policy p_participants_agency_scope on public.participants
  for all to authenticated
  using (agency_id in (select agency_id from public.user_roles where user_id = auth.uid()))
  with check (agency_id in (select agency_id from public.user_roles where user_id = auth.uid()));

create policy p_rooming_participants_agency_scope on public.rooming_participants
  for all to authenticated
  using (agency_id in (select agency_id from public.user_roles where user_id = auth.uid()))
  with check (agency_id in (select agency_id from public.user_roles where user_id = auth.uid()));

create policy p_messages_agency_scope on public.messages
  for all to authenticated
  using (agency_id in (select agency_id from public.user_roles where user_id = auth.uid()))
  with check (agency_id in (select agency_id from public.user_roles where user_id = auth.uid()));

-- Update fn_bulk_upload_participants with agency scope validation
create or replace function public.fn_bulk_upload_participants(
  p_event_id uuid,
  p_rows jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_count int := 0;
  v_event_agency_id uuid;
  v_user_agency_id uuid;
begin
  -- Get event's agency_id
  select agency_id into v_event_agency_id
  from events
  where id = p_event_id;

  if v_event_agency_id is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- Get user's agency_id
  select agency_id into v_user_agency_id
  from user_roles
  where user_id = auth.uid()
  limit 1;

  -- Verify scope match
  if v_user_agency_id is null or v_user_agency_id != v_event_agency_id then
    raise exception 'AGENCY_SCOPE_MISMATCH';
  end if;

  -- Insert participants
  insert into participants (event_id, agency_id, name, phone, email)
  select 
    p_event_id, 
    v_event_agency_id, 
    x->>'name', 
    x->>'phone', 
    x->>'email'
  from jsonb_array_elements(p_rows) x;
  
  get diagnostics v_count = row_count;
  
  return jsonb_build_object(
    'inserted', v_count,
    'agency_id', v_event_agency_id,
    'event_id', p_event_id
  );
end $$;