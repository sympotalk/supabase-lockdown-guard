-- [Phase 77-D] 룸핑 시각화 뷰 생성

CREATE OR REPLACE VIEW public.v_rooming_visual_map AS
SELECT
  rp.event_id,
  err.id AS event_room_ref_id,
  rt.type_name AS room_type_name,
  rt.id AS room_type_id,
  err.stock,
  err.credit AS room_credit,
  COUNT(rp.id) FILTER (WHERE rp.room_type_id = err.id AND rp.is_active = true) AS assigned_count,
  err.stock - COUNT(rp.id) FILTER (WHERE rp.room_type_id = err.id AND rp.is_active = true) AS remaining_count,
  jsonb_agg(
    jsonb_build_object(
      'participant_id', p.id,
      'participant_name', p.name,
      'participant_no', p.participant_no,
      'role', p.fixed_role,
      'room_status', rp.status,
      'manual_assigned', rp.manual_assigned,
      'companions', rp.companions,
      'assigned_at', rp.assigned_at,
      'requests', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'request_type', pr.request_type,
            'priority', pr.priority,
            'is_fulfilled', pr.is_fulfilled
          )
          ORDER BY pr.priority ASC
        )
        FROM public.participant_requests pr
        WHERE pr.participant_id = p.id AND pr.event_id = rp.event_id
      )
    ) ORDER BY p.participant_no ASC
  ) FILTER (WHERE rp.is_active = true) AS participants
FROM public.event_room_refs err
JOIN public.room_types rt ON rt.id = err.room_type_id
LEFT JOIN public.rooming_participants rp ON rp.room_type_id = err.id AND rp.event_id = err.event_id
LEFT JOIN public.participants p ON p.id = rp.participant_id AND p.is_active = true
WHERE err.is_active = true
GROUP BY rp.event_id, err.id, rt.type_name, rt.id, err.stock, err.credit
ORDER BY err.credit ASC;

COMMENT ON VIEW public.v_rooming_visual_map IS 'Visual room mapping view for rooming assignments grouped by room type';

-- Grant access to authenticated users
GRANT SELECT ON public.v_rooming_visual_map TO authenticated;