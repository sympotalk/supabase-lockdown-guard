-- Add role_badge column to participants table
alter table public.participants
add column if not exists role_badge text default '참석자';

-- Add composition column for future QA analysis
alter table public.participants
add column if not exists composition jsonb default '{"adult":1,"child":0,"infant":0}';

-- Add comments for documentation
comment on column public.participants.role_badge is 'Participant role badge (default: 참석자)';
comment on column public.participants.composition is 'Participant composition breakdown for QA analysis';