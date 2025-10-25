-- Phase 3.8-A: RLS Policies for Participants Table
-- Enable RLS on participants table
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "MASTER full read-only access" ON public.participants;
DROP POLICY IF EXISTS "AGENCY full CRUD access" ON public.participants;

-- MASTER: Read-only access to all participants
CREATE POLICY "MASTER full read-only access"
ON public.participants
FOR SELECT
USING (
  has_role(auth.uid(), 'master'::app_role)
);

-- AGENCY: Full CRUD access to own agency participants
CREATE POLICY "AGENCY full CRUD access"
ON public.participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = participants.agency_id
    AND ur.role IN ('agency_owner', 'admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = participants.agency_id
    AND ur.role IN ('agency_owner', 'admin', 'staff')
  )
);