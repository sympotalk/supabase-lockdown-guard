-- Local/custom room types (agency-specific)
CREATE TABLE IF NOT EXISTS room_types_local (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 2,
  default_credit INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update event_room_refs to include all necessary fields
ALTER TABLE event_room_refs 
  ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS local_type_id UUID REFERENCES room_types_local(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id),
  ADD COLUMN IF NOT EXISTS credit INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_types_local_agency ON room_types_local(agency_id);
CREATE INDEX IF NOT EXISTS idx_event_room_refs_hotel ON event_room_refs(hotel_id);

-- RLS Policies for room_types_local
ALTER TABLE room_types_local ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency can view their custom room types" ON room_types_local;
CREATE POLICY "Agency can view their custom room types"
  ON room_types_local FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role) OR
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency can create custom room types" ON room_types_local;
CREATE POLICY "Agency can create custom room types"
  ON room_types_local FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'master'::app_role) OR
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency can update custom room types" ON room_types_local;
CREATE POLICY "Agency can update custom room types"
  ON room_types_local FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role) OR
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency can delete custom room types" ON room_types_local;
CREATE POLICY "Agency can delete custom room types"
  ON room_types_local FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role) OR
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );