-- Phase 76-F.API-View: Create unified rooming view with room type names

CREATE OR REPLACE VIEW public.v_rooming_with_names AS
SELECT
  rp.id                 AS rooming_id,
  rp.event_id,
  rp.participant_id,
  rp.room_type_id,
  rp.room_status,
  rp.room_credit,
  rp.check_in,
  rp.check_out,
  rp.stay_days,
  rp.status,
  rp.manual_assigned,
  rp.assigned_at,
  p.participant_no,
  p.name                AS participant_name,
  p.organization,
  p.phone,
  p.fixed_role,
  p.custom_role,
  rt.type_name          AS room_type_name,
  err.credit            AS event_room_credit
FROM public.rooming_participants rp
LEFT JOIN public.participants p  ON p.id = rp.participant_id
LEFT JOIN public.event_room_refs err ON err.id = rp.room_type_id
LEFT JOIN public.room_types rt ON rt.id = err.room_type_id;