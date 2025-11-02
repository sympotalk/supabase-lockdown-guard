-- Phase 79-SAFE-DELETE.CONNECT: Rebuild participant delete system
-- Standardize RPC name to clear_participants_by_event and action to 'delete_all'

-- Drop old function
DROP FUNCTION IF EXISTS public.clear_event_participants(uuid);

-- Create new Phase 79-R standard function
CREATE OR REPLACE FUNCTION public.clear_participants_by_event(
  p_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted_count int := 0;
  v_agency_id uuid;
BEGIN
  -- Check MASTER permission
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'insufficient_permissions';
  END IF;
  
  -- Get agency_id from event
  SELECT agency_id INTO v_agency_id 
  FROM public.events 
  WHERE id = p_event_id;
  
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event_id';
  END IF;
  
  -- Delete all participants for this event
  DELETE FROM public.participants 
  WHERE event_id = p_event_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Log to participants_log (Phase 79-R format)
  INSERT INTO public.participants_log (
    event_id,
    agency_id,
    action,
    metadata,
    created_by,
    created_at
  )
  VALUES (
    p_event_id,
    v_agency_id,
    'delete_all',
    jsonb_build_object(
      'deleted_count', v_deleted_count,
      'timestamp', now()
    ),
    auth.uid(),
    NOW()
  );
  
  RETURN jsonb_build_object(
    'status', 'ok',
    'deleted', v_deleted_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'reason', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.clear_participants_by_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_participants_by_event(uuid) TO service_role;

COMMENT ON FUNCTION public.clear_participants_by_event IS 
'[Phase 79-R] MASTER-only function to delete all participants for an event. Logs action as delete_all.';