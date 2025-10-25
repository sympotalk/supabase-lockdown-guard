-- Phase 3.0: Account Policy & Role Flow Hardening
-- Drop existing policies and create unified access control

-- ============================================
-- 1. EVENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "read_own_or_master" ON public.events;
DROP POLICY IF EXISTS "modify_own_or_master" ON public.events;
DROP POLICY IF EXISTS "Allow event creation by authenticated users" ON public.events;
DROP POLICY IF EXISTS "creator_can_edit_event" ON public.events;
DROP POLICY IF EXISTS "events_admin_write" ON public.events;
DROP POLICY IF EXISTS "events_multi_agency_read" ON public.events;

CREATE POLICY "read_own_or_master"
ON public.events
FOR SELECT 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "modify_own_or_master"
ON public.events
FOR ALL 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'master'::app_role)
  OR agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 2. PARTICIPANTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "read_own_or_master" ON public.participants;
DROP POLICY IF EXISTS "modify_own_or_master" ON public.participants;
DROP POLICY IF EXISTS "participants_select_policy" ON public.participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON public.participants;
DROP POLICY IF EXISTS "participants_update_policy" ON public.participants;
DROP POLICY IF EXISTS "participants_delete_policy" ON public.participants;

CREATE POLICY "read_own_or_master"
ON public.participants
FOR SELECT 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "modify_own_or_master"
ON public.participants
FOR ALL 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'master'::app_role)
  OR agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 3. FORMS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "read_own_or_master" ON public.forms;
DROP POLICY IF EXISTS "modify_own_or_master" ON public.forms;
DROP POLICY IF EXISTS "Public can view published forms" ON public.forms;
DROP POLICY IF EXISTS "forms_insert_policy" ON public.forms;
DROP POLICY IF EXISTS "forms_select_policy" ON public.forms;
DROP POLICY IF EXISTS "forms_update_policy" ON public.forms;

CREATE POLICY "read_own_or_master"
ON public.forms
FOR SELECT 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
  OR (share_enabled = true AND status = 'published')
);

CREATE POLICY "modify_own_or_master"
ON public.forms
FOR ALL 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
);

-- ============================================
-- 4. ROOMING_PARTICIPANTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "read_own_or_master" ON public.rooming_participants;
DROP POLICY IF EXISTS "modify_own_or_master" ON public.rooming_participants;
DROP POLICY IF EXISTS "rooming_participants_select_policy" ON public.rooming_participants;
DROP POLICY IF EXISTS "rooming_participants_insert_policy" ON public.rooming_participants;
DROP POLICY IF EXISTS "rooming_participants_update_policy" ON public.rooming_participants;
DROP POLICY IF EXISTS "rooming_participants_delete_policy" ON public.rooming_participants;

CREATE POLICY "read_own_or_master"
ON public.rooming_participants
FOR SELECT 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
);

CREATE POLICY "modify_own_or_master"
ON public.rooming_participants
FOR ALL 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
);

-- ============================================
-- 5. MESSAGES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "read_own_or_master" ON public.messages;
DROP POLICY IF EXISTS "modify_own_or_master" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;

CREATE POLICY "read_own_or_master"
ON public.messages
FOR SELECT 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
);

CREATE POLICY "modify_own_or_master"
ON public.messages
FOR ALL 
USING (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'master'::app_role)
  OR event_id IN (
    SELECT e.id FROM events e
    INNER JOIN agency_members am ON am.agency_id = e.agency_id
    WHERE am.user_id = auth.uid()
  )
);

-- ============================================
-- 6. CREATE AGENCY_SUMMARY VIEW
-- ============================================
CREATE OR REPLACE VIEW agency_summary AS
SELECT
  a.id AS agency_id,
  a.name AS agency_name,
  a.code AS agency_code,
  COUNT(DISTINCT e.id) AS event_count,
  COUNT(DISTINCT p.id) AS participant_count,
  COUNT(DISTINCT f.id) AS form_count,
  MAX(e.updated_at) AS last_activity,
  a.is_active
FROM agencies a
LEFT JOIN events e ON e.agency_id = a.id AND e.is_active = true
LEFT JOIN participants p ON p.agency_id = a.id AND p.is_active = true
LEFT JOIN forms f ON f.agency_id = a.id AND f.is_active = true
GROUP BY a.id, a.name, a.code, a.is_active;