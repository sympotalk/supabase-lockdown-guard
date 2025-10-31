
-- [Phase 76-G.Test] Single manual room assignment test
-- Test participant: 김경호 → 클래식 킹

UPDATE public.rooming_participants
SET 
  room_type_id = '80d5ac43-6e6a-4d37-b1c9-02988f0201b7',
  room_status = '수동배정',
  manual_assigned = true,
  assigned_at = now()
WHERE participant_id = '34108ff8-1890-4c56-8167-f6d22d8263d0'
  AND event_id = 'da4a5d5e-f469-4f96-a389-36f0a54e29d6';
