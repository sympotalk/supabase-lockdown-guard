-- [Phase 77-STATS-CARD] Create v_rooming_visual_map view for real-time rooming statistics (Fixed)

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.v_rooming_visual_map CASCADE;

-- Create rooming visual map view
CREATE OR REPLACE VIEW public.v_rooming_visual_map AS
SELECT
  rp.event_id,
  COALESCE(rt.type_name, '미지정') AS room_type,
  rp.room_type_id,
  COUNT(*) AS total_rooms,
  COUNT(*) FILTER (WHERE rp.status = '배정완료') AS assigned_rooms,
  COUNT(*) FILTER (WHERE rp.status = '대기') AS pending_rooms,
  COUNT(*) FILTER (WHERE rp.status = '취소') AS canceled_rooms,
  COUNT(*) FILTER (WHERE rp.status = '확정') AS confirmed_rooms,
  COUNT(*) FILTER (WHERE rp.manual_assigned = true) AS manual_assigned_rooms,
  COUNT(*) FILTER (WHERE rp.room_status = 'AI가중배정') AS ai_weighted_rooms
FROM public.rooming_participants rp
LEFT JOIN public.room_types rt ON rt.id = rp.room_type_id
WHERE rp.is_active = true
GROUP BY rp.event_id, rt.type_name, rp.room_type_id
ORDER BY rp.event_id, room_type;

-- Grant access
GRANT SELECT ON public.v_rooming_visual_map TO authenticated;
GRANT SELECT ON public.v_rooming_visual_map TO service_role;

COMMENT ON VIEW public.v_rooming_visual_map IS '[Phase 77-STATS-CARD] Real-time rooming statistics by event and room type';