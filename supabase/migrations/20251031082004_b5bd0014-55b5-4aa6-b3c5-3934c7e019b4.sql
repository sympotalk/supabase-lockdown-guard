-- [Phase 77-FIX-ROOMTYPE] Fix v_rooming_visual_map view to handle NULL room_type_id

DROP VIEW IF EXISTS v_rooming_visual_map;

CREATE VIEW v_rooming_visual_map AS
SELECT
  rp.event_id,
  COALESCE(rt.type_name, '미지정') as room_type,
  rp.room_type_id,
  COUNT(*) as total_rooms,
  COUNT(*) FILTER (WHERE rp.status = '배정완료') as assigned_rooms,
  COUNT(*) FILTER (WHERE rp.status = '대기') as pending_rooms,
  COUNT(*) FILTER (WHERE rp.status = '취소') as canceled_rooms,
  COUNT(*) FILTER (WHERE rp.status = '확정') as confirmed_rooms,
  COUNT(*) FILTER (WHERE rp.manual_assigned = true) as manual_assigned_rooms
FROM rooming_participants rp
LEFT JOIN room_types rt ON rp.room_type_id = rt.id
WHERE rp.is_active = true
GROUP BY rp.event_id, rt.type_name, rp.room_type_id
ORDER BY rt.type_name NULLS LAST;