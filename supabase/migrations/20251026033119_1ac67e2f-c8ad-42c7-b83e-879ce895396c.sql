-- Phase 3.14-CLEAN: Safe Database Recovery (Final)

-- Drop existing views/tables if they conflict
drop view if exists agency_summary cascade;
drop table if exists master_users cascade;

-- 1. Ensure core tables exist
create table if not exists agencies(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  contact_name text,
  contact_email text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid
);

-- 2. Safe aggregated view for master dashboard
create or replace view agency_summary as
select
  a.id,
  a.name,
  a.code,
  a.is_active,
  a.created_at,
  coalesce((select count(*) from events e where e.agency_id = a.id and e.is_active = true), 0)::bigint as event_count,
  coalesce((select count(*) from participants p where p.agency_id = a.id), 0)::bigint as participant_count,
  (select max(created_at) from events e where e.agency_id = a.id) as last_activity
from agencies a;

-- 3. Master users view (recreated as view)
create or replace view master_users as
select 
  u.id,
  u.email,
  'master'::text as role,
  null::uuid as agency_id,
  u.created_at,
  u.last_sign_in_at
from auth.users u
where exists (
  select 1 from user_roles ur 
  where ur.user_id = u.id and ur.role = 'master'
);

-- 4. QA reports safe table
create table if not exists qa_reports(
  id uuid primary key default gen_random_uuid(),
  title text not null default 'QA Report',
  status text default 'PASS',
  category text,
  summary text,
  details jsonb default '{}'::jsonb,
  generated_at timestamptz default now(),
  is_active boolean default true
);

-- 5. System logs safe table
create table if not exists system_logs(
  id bigserial primary key,
  category text default 'system',
  title text not null,
  description text,
  level text default 'INFO',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 6. Grant permissions
grant select on agency_summary to authenticated, anon;
grant select on master_users to authenticated;
grant all on qa_reports to authenticated;
grant all on system_logs to authenticated;