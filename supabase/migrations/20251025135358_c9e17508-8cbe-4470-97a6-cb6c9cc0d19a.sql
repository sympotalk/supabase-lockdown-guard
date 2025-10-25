-- Phase 3.7.X-FULL.POLICY-FIX: Agency Data Scope Enforcement
-- Enable RLS on events table if not already enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent migration)
DROP POLICY IF EXISTS "Allow MASTER full access to events" ON events;
DROP POLICY IF EXISTS "Agency users can access only their events" ON events;

-- MASTER full access: can see all events
CREATE POLICY "Allow MASTER full access to events"
ON events
FOR ALL
USING (
  has_role(auth.uid(), 'master'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'master'::app_role)
);

-- AGENCY scoped access: can only see events from their agency
CREATE POLICY "Agency users can access only their events"
ON events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.agency_id = events.agency_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.agency_id = events.agency_id
  )
);