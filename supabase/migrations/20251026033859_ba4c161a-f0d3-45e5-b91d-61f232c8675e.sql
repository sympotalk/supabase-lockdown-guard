-- Phase 3.14-FINAL-HOTFIX: Master Dashboard & QAReports Recovery

-- 1. Recreate master_users view with correct structure
drop view if exists master_users cascade;
create or replace view master_users as
select 
  u.id,
  u.email,
  'master'::text as role,
  null::uuid as agency_id,
  null::text as agency_name,
  u.created_at
from auth.users u
where exists (
  select 1 from user_roles ur 
  where ur.user_id = u.id and ur.role = 'master'
);

-- 2. Extend qa_reports table structure to match interface
alter table if exists qa_reports
add column if not exists title text default 'QA Report',
add column if not exists status text default 'PASS',
add column if not exists category text default 'System';

-- Update existing records to have proper values
update qa_reports 
set 
  title = COALESCE(title, 'QA Report'),
  status = COALESCE(status, 'PASS'),
  category = COALESCE(category, 'System')
where title is null or status is null or category is null;

-- Grant permissions
grant select on master_users to authenticated;
grant all on qa_reports to authenticated;