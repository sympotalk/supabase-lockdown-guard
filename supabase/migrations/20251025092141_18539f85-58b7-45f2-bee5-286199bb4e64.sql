-- Phase 3.3.7-Pro: Multi-Agency Management for Master

-- Create agency_managers table for master users to manage multiple agencies
CREATE TABLE IF NOT EXISTS public.agency_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(master_id, agency_id)
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_agency_managers_master ON public.agency_managers(master_id);
CREATE INDEX IF NOT EXISTS idx_agency_managers_agency ON public.agency_managers(agency_id);

-- Enable RLS
ALTER TABLE public.agency_managers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only masters can view and manage their agencies
CREATE POLICY "Masters can view their managed agencies"
ON public.agency_managers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'master'::app_role)
  AND master_id = auth.uid()
);

CREATE POLICY "Masters can add agencies to manage"
ON public.agency_managers
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'master'::app_role)
  AND master_id = auth.uid()
);

CREATE POLICY "Masters can remove agencies they manage"
ON public.agency_managers
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'master'::app_role)
  AND master_id = auth.uid()
);

-- Function to automatically add master to agency_managers when they get master role
CREATE OR REPLACE FUNCTION public.sync_master_agencies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user becomes master, ensure they have access to all agencies
  IF NEW.role = 'master' THEN
    INSERT INTO public.agency_managers (master_id, agency_id)
    SELECT NEW.user_id, a.id
    FROM public.agencies a
    WHERE a.is_active = true
    ON CONFLICT (master_id, agency_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to sync master agencies when role changes
DROP TRIGGER IF EXISTS trg_sync_master_agencies ON public.user_roles;
CREATE TRIGGER trg_sync_master_agencies
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW
WHEN (NEW.role = 'master')
EXECUTE FUNCTION public.sync_master_agencies();

COMMENT ON TABLE public.agency_managers IS 'Tracks which agencies a master user can manage and switch between';
COMMENT ON FUNCTION public.sync_master_agencies IS 'Automatically grants master users access to all active agencies';