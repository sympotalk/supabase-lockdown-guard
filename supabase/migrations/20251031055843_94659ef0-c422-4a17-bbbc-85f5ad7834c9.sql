-- Phase 76-F.Data-Migrate: Data backfill and cleanup for rooming participants

-- 1. Set room_type_id to NULL for waiting/unassigned status
UPDATE public.rooming_participants
SET room_type_id = NULL
WHERE room_status IS NULL
   OR room_status IN ('배정대기','미지정','대기');

-- 2. Map manually assigned data by matching room_status text to room type names
-- This attempts to link existing text-based room types to the new UUID structure
UPDATE public.rooming_participants rp
SET room_type_id = err.id
FROM public.event_room_refs err
JOIN public.room_types rt ON err.room_type_id = rt.id
WHERE rp.event_id = err.event_id
  AND rt.type_name = rp.room_status
  AND rp.room_status NOT IN ('배정대기','미지정','대기')
  AND rp.room_status IS NOT NULL;