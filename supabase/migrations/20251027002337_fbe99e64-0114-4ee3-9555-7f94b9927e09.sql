-- [71-I.QA3-FIX.R5] Fix RPC function to avoid NEW record reference issues
-- This replaces the ON CONFLICT approach with a loop-based upsert

create or replace function public.fn_bulk_upload_participants(
  p_event_id uuid,
  p_rows jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_role text;
  v_user_agency uuid;
  v_event_agency uuid;
  v_row jsonb;
  v_name text;
  v_org text;
  v_phone text;
  v_memo text;
  v_existing_id uuid;
  v_inserted int := 0;
  v_updated int := 0;
  v_new int := 0;
begin
  -- Get current user role and agency
  select ur.role::text, ur.agency_id
  into v_current_role, v_user_agency
  from user_roles ur
  where ur.user_id = auth.uid()
  limit 1;

  -- Get event agency
  select agency_id
  into v_event_agency
  from events
  where id = p_event_id;

  if v_event_agency is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- Scope check: master bypasses, others must match agency
  if v_current_role <> 'master' and v_user_agency is distinct from v_event_agency then
    raise exception 'AGENCY_SCOPE_MISMATCH';
  end if;

  -- Process each row with loop-based upsert
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    -- Extract and normalize fields
    v_name := coalesce(v_row->>'name', v_row->>'성명', v_row->>'이름');
    v_org := coalesce(v_row->>'organization', v_row->>'소속', v_row->>'기관', v_row->>'회사');
    v_phone := coalesce(v_row->>'phone', v_row->>'연락처', v_row->>'전화');
    v_memo := coalesce(v_row->>'memo', v_row->>'메모', v_row->>'요청사항');

    -- Skip if no name
    continue when v_name is null or v_name = '';

    -- Check if participant exists
    select id into v_existing_id
    from participants
    where event_id = p_event_id
      and name = v_name
      and (
        (phone is not null and phone != '' and phone = v_phone)
        or (phone is null or phone = '')
      )
    limit 1;

    if v_existing_id is not null then
      -- Update existing participant
      update participants
      set
        organization = coalesce(v_org, organization),
        phone = coalesce(v_phone, phone),
        memo = case
          when v_memo is null or v_memo = '' then memo
          when memo is null or memo = '' then v_memo
          else memo || E'\n' || v_memo
        end,
        updated_at = timezone('utc', now()),
        updated_by = auth.uid()
      where id = v_existing_id;
      
      v_updated := v_updated + 1;
    else
      -- Insert new participant
      insert into participants (
        event_id,
        agency_id,
        name,
        organization,
        phone,
        memo,
        created_by
      ) values (
        p_event_id,
        v_event_agency,
        v_name,
        v_org,
        v_phone,
        v_memo,
        auth.uid()
      );
      
      v_new := v_new + 1;
    end if;

    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'new', v_new,
    'updated', v_updated,
    'event_id', p_event_id,
    'agency_id', v_event_agency
  );
end $$;