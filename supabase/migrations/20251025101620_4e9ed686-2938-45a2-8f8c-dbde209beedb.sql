-- Create view for event room summary (simplified version)
create or replace view v_event_room_summary as
select
  e.id as event_id,
  h.id as hotel_id,
  h.name as hotel_name,
  rt.id as type_id,
  rt.type_name as room_type,
  err.credit,
  err.stock,
  err.room_type_id,
  err.local_type_id
from events e
join event_room_refs err on err.event_id = e.id
left join hotels h on h.id = err.hotel_id
left join room_types rt on rt.id = err.room_type_id
where err.is_active = true;

-- Create index for faster queries
create index if not exists idx_event_room_refs_event on event_room_refs(event_id);
create index if not exists idx_event_room_refs_hotel on event_room_refs(hotel_id);