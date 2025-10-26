-- [LOCKED][71-I.QA2] Dynamic SmartBadges & agency customization
create table if not exists public.agency_badge_items (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  category text not null check (category in ('room','bedding','infant','appliance','location','special','custom')),
  label text not null,
  icon text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_agency_badge_items_agency_id on public.agency_badge_items(agency_id) where is_active = true;

-- RLS policies for agency_badge_items
alter table public.agency_badge_items enable row level security;

create policy p_agency_badges_sel on public.agency_badge_items
  for select using (
    agency_id in (select agency_id from user_roles where user_id = auth.uid())
  );

create policy p_agency_badges_ins on public.agency_badge_items
  for insert with check (
    agency_id in (select agency_id from user_roles where user_id = auth.uid())
  );

create policy p_agency_badges_upd on public.agency_badge_items
  for update using (
    agency_id in (select agency_id from user_roles where user_id = auth.uid())
  );

create policy p_agency_badges_del on public.agency_badge_items
  for delete using (
    agency_id in (select agency_id from user_roles where user_id = auth.uid())
  );