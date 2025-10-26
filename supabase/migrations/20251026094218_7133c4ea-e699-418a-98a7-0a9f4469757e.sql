-- [LOCKED][71-D.FIXFLOW.R2] Remove dummy/mock data (UUID-safe version)

-- Remove events with null IDs or is_mock flag
delete from events 
where id is null;

-- Remove events with is_mock flag if column exists
do $$ 
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'events' 
      and column_name = 'is_mock'
  ) then
    execute 'delete from events where is_mock = true';
  end if;
end $$;

-- Remove QA reports with is_mock flag (if column exists)
do $$ 
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'qa_reports' 
      and column_name = 'is_mock'
  ) then
    execute 'delete from qa_reports where is_mock = true';
  end if;
end $$;

-- Remove participants with null event_id
delete from participants 
where event_id is null;

-- Log cleanup
do $$
begin
  raise notice '[71-D.FIXFLOW.R2] Dummy data cleanup completed';
end $$;