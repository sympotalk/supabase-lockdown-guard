-- Phase 73-L.6.F: Unique Constraint Alignment Fix
-- Purpose: Align participants unique constraint with RPC ON CONFLICT clause

-- Remove old constraint (event_id, name, phone)
ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS uq_participants_event_name_phone;

-- Add new constraint (event_id, agency_id, name, phone)
ALTER TABLE public.participants
  ADD CONSTRAINT uq_participants_event_agency_name_phone
  UNIQUE (event_id, agency_id, name, phone);

-- Verification comment
COMMENT ON CONSTRAINT uq_participants_event_agency_name_phone 
  ON public.participants 
  IS 'Unique constraint aligned with ai_participant_import_from_excel RPC ON CONFLICT clause';
