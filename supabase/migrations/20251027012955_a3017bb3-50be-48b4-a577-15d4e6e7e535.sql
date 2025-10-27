-- [71-I.QA3-FIX.R9] Participants table complete rebuild with agency_id

-- 1️⃣ Drop existing table completely
DROP TABLE IF EXISTS participants CASCADE;

-- 2️⃣ Create new table structure
CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  organization text,
  phone text,
  email text,
  memo text,
  stay_plan text,
  call_checked boolean DEFAULT false,
  form_response jsonb,
  status text DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_by uuid,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  is_active boolean DEFAULT true,
  last_modified_by uuid,
  last_modified_at timestamptz
);

-- 3️⃣ Create indexes and constraints
CREATE INDEX idx_participants_event ON participants(event_id);
CREATE INDEX idx_participants_agency ON participants(agency_id);
CREATE INDEX idx_participants_name ON participants(name);
CREATE INDEX idx_participants_phone ON participants(phone);
CREATE INDEX idx_participants_event_name_phone ON participants(event_id, name, phone);

-- 4️⃣ Enable RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- 5️⃣ Create RLS policies
CREATE POLICY "MASTER full access to participants"
  ON participants FOR ALL
  USING (has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Agency users can access their participants"
  ON participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.agency_id = participants.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.agency_id = participants.agency_id
    )
  );

-- 6️⃣ Grant permissions
GRANT ALL ON participants TO authenticated;
GRANT ALL ON participants TO service_role;

-- 7️⃣ Add table comment
COMMENT ON TABLE participants IS '[71-I.QA3-FIX.R9] Participants table rebuilt — includes agency_id and full sync with upload RPC.';