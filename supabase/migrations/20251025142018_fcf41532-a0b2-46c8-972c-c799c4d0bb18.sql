-- Phase 3.8-MASTER.RLS: Enforce Master/Agency Separation with Unified RLS Policies

-- ============================================
-- EVENTS TABLE
-- ============================================
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "modify_own_or_master" ON events;
DROP POLICY IF EXISTS "read_own_or_master" ON events;

-- Keep existing policies (already correct):
-- - "Allow MASTER full access to events"
-- - "Agency users can access only their events"

-- ============================================
-- FORMS TABLE
-- ============================================
-- Drop old policies
DROP POLICY IF EXISTS "modify_own_or_master" ON forms;
DROP POLICY IF EXISTS "read_own_or_master" ON forms;

-- MASTER: Full access to all forms
CREATE POLICY "MASTER full access to forms"
ON forms
FOR ALL
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- AGENCY: Access only to forms in their events
CREATE POLICY "Agency scoped access to forms"
ON forms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = forms.event_id 
    AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = forms.event_id 
    AND ur.user_id = auth.uid()
  )
);

-- PUBLIC: Can view published, share-enabled forms
CREATE POLICY "Public can view published forms"
ON forms
FOR SELECT
USING (share_enabled = true AND status = 'published');

-- ============================================
-- FORM_RESPONSES TABLE
-- ============================================
-- Drop duplicates and old policies
DROP POLICY IF EXISTS "agency_form_responses_select" ON form_responses;
DROP POLICY IF EXISTS "agency_form_responses_update" ON form_responses;
DROP POLICY IF EXISTS "agency_form_responses_insert" ON form_responses;
DROP POLICY IF EXISTS "form_responses_select_policy" ON form_responses;
DROP POLICY IF EXISTS "form_responses_update_policy" ON form_responses;
DROP POLICY IF EXISTS "form_responses_insert_policy" ON form_responses;

-- Keep: "Public can submit responses to published forms"

-- MASTER: Full access
CREATE POLICY "MASTER full access to form_responses"
ON form_responses
FOR ALL
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- AGENCY: Access to responses from their events
CREATE POLICY "Agency scoped access to form_responses"
ON form_responses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = form_responses.event_id 
    AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = form_responses.event_id 
    AND ur.user_id = auth.uid()
  )
);

-- ============================================
-- FORM_LOGS TABLE
-- ============================================
DROP POLICY IF EXISTS "form_logs_select_policy" ON form_logs;
DROP POLICY IF EXISTS "form_logs_insert_policy" ON form_logs;

-- MASTER: Full access
CREATE POLICY "MASTER full access to form_logs"
ON form_logs
FOR ALL
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- AGENCY: View logs from their events
CREATE POLICY "Agency scoped access to form_logs"
ON form_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = form_logs.event_id 
    AND ur.user_id = auth.uid()
  )
);

-- Anyone authenticated can insert logs
CREATE POLICY "Authenticated users can insert form_logs"
ON form_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- FORM_STATISTICS TABLE
-- ============================================
DROP POLICY IF EXISTS "form_statistics_select_policy" ON form_statistics;
DROP POLICY IF EXISTS "form_statistics_update_policy" ON form_statistics;
DROP POLICY IF EXISTS "form_statistics_insert_policy" ON form_statistics;

-- MASTER: Full access
CREATE POLICY "MASTER full access to form_statistics"
ON form_statistics
FOR ALL
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- AGENCY: Scoped access
CREATE POLICY "Agency scoped access to form_statistics"
ON form_statistics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = form_statistics.event_id 
    AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = form_statistics.event_id 
    AND ur.user_id = auth.uid()
  )
);

-- ============================================
-- FORM_SUMMARIES TABLE
-- ============================================
DROP POLICY IF EXISTS "form_summaries_select_policy" ON form_summaries;
DROP POLICY IF EXISTS "form_summaries_update_policy" ON form_summaries;
DROP POLICY IF EXISTS "form_summaries_insert_policy" ON form_summaries;

-- MASTER: Full access
CREATE POLICY "MASTER full access to form_summaries"
ON form_summaries
FOR ALL
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- AGENCY: Scoped access
CREATE POLICY "Agency scoped access to form_summaries"
ON form_summaries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = form_summaries.event_id 
    AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = form_summaries.event_id 
    AND ur.user_id = auth.uid()
  )
);

-- ============================================
-- FORMS_COMPARISON TABLE
-- ============================================
DROP POLICY IF EXISTS "forms_comparison_select_policy" ON forms_comparison;
DROP POLICY IF EXISTS "forms_comparison_update_policy" ON forms_comparison;
DROP POLICY IF EXISTS "forms_comparison_insert_policy" ON forms_comparison;

-- MASTER: Full access
CREATE POLICY "MASTER full access to forms_comparison"
ON forms_comparison
FOR ALL
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- AGENCY: Scoped access
CREATE POLICY "Agency scoped access to forms_comparison"
ON forms_comparison
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = forms_comparison.event_id 
    AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    INNER JOIN user_roles ur ON ur.agency_id = e.agency_id
    WHERE e.id = forms_comparison.event_id 
    AND ur.user_id = auth.uid()
  )
);