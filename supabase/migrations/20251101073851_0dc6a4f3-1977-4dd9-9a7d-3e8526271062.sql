-- ============================================================
-- Phase 78-B: 안정형 엑셀 업로드 구축 (Staging Table)
-- ============================================================

-- 1️⃣ Create participants_staging table
CREATE TABLE IF NOT EXISTS public.participants_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  upload_session_id TEXT NOT NULL,
  
  -- Required fields
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  
  -- Optional fields
  phone TEXT,
  request_memo TEXT,
  
  -- JSON fields
  manager_info JSONB DEFAULT '{}'::jsonb,
  sfe_info JSONB DEFAULT '{}'::jsonb,
  
  -- Validation tracking
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'error')),
  validation_message TEXT,
  
  -- Audit fields
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2️⃣ Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_staging_event_id 
  ON public.participants_staging(event_id);

CREATE INDEX IF NOT EXISTS idx_participants_staging_session_id 
  ON public.participants_staging(upload_session_id);

CREATE INDEX IF NOT EXISTS idx_participants_staging_event_validation 
  ON public.participants_staging(event_id, validation_status);

-- 3️⃣ Enable RLS
ALTER TABLE public.participants_staging ENABLE ROW LEVEL SECURITY;

-- 4️⃣ RLS Policies

-- MASTER: Full access
CREATE POLICY participants_staging_master_all
  ON public.participants_staging
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Agency users: Can only access staging data for their agency's events
CREATE POLICY participants_staging_agency_select
  ON public.participants_staging
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.events e
      JOIN public.user_roles ur ON ur.agency_id = e.agency_id
      WHERE e.id = participants_staging.event_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY participants_staging_agency_insert
  ON public.participants_staging
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.events e
      JOIN public.user_roles ur ON ur.agency_id = e.agency_id
      WHERE e.id = participants_staging.event_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY participants_staging_agency_update
  ON public.participants_staging
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.events e
      JOIN public.user_roles ur ON ur.agency_id = e.agency_id
      WHERE e.id = participants_staging.event_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY participants_staging_agency_delete
  ON public.participants_staging
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.events e
      JOIN public.user_roles ur ON ur.agency_id = e.agency_id
      WHERE e.id = participants_staging.event_id
        AND ur.user_id = auth.uid()
    )
  );

-- 5️⃣ Add comment for documentation
COMMENT ON TABLE public.participants_staging IS 
  'Phase 78-B: Staging table for Excel upload validation. Data flows: staging → validate → commit to participants table.';

-- 6️⃣ Verification query
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'participants_staging'
  ) THEN
    RAISE NOTICE '[78-B] participants_staging table created successfully';
  ELSE
    RAISE EXCEPTION '[78-B] Failed to create participants_staging table';
  END IF;
END $$;