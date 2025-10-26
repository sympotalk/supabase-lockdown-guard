-- [LOCKED][71-H3.STATS.SYNC] Create fn_event_statistics RPC function
create or replace function fn_event_statistics(p_agency_id uuid)
returns table (
  event_id uuid,
  participant_count bigint,
  rooming_rate numeric,
  form_rate numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select
    e.id as event_id,
    count(distinct p.id) as participant_count,
    case 
      when count(distinct p.id) > 0 then
        round((count(distinct case when p.room_number is not null then p.id end)::numeric / count(distinct p.id)::numeric * 100), 2)
      else 0
    end as rooming_rate,
    case 
      when count(distinct p.id) > 0 then
        round((count(distinct fr.id)::numeric / count(distinct p.id)::numeric * 100), 2)
      else 0
    end as form_rate
  from events e
    left join participants p on p.event_id = e.id
    left join form_responses fr on fr.event_id = e.id
  where e.agency_id = p_agency_id and e.is_active = true
  group by e.id;
end $$;