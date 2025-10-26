-- Create master_users table with correct schema
CREATE TABLE IF NOT EXISTS master_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  role text,
  agency text,
  last_login timestamptz,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE master_users ENABLE ROW LEVEL SECURITY;

-- Policy for master role
CREATE POLICY "Masters can view all users"
  ON master_users FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_master_users_email ON master_users(email);
CREATE INDEX IF NOT EXISTS idx_master_users_role ON master_users(role);

-- Create view to populate master_users from user_roles + agencies
CREATE OR REPLACE VIEW v_master_users AS
SELECT 
  ur.user_id as id,
  ur.role,
  a.name as agency,
  a.is_active as active
FROM user_roles ur
LEFT JOIN agencies a ON ur.agency_id = a.id;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';