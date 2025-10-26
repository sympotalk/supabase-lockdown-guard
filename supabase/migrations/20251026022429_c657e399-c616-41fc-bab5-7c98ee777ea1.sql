-- Create invite_agency_user RPC function
CREATE OR REPLACE FUNCTION invite_agency_user(
  p_email text,
  p_agency_id uuid,
  p_role text DEFAULT 'staff'
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  new_user_id uuid;
BEGIN
  -- Generate a new user ID for the invite
  new_user_id := gen_random_uuid();
  
  -- Insert into master_users
  INSERT INTO master_users(id, email, agency, role, active)
  VALUES(
    new_user_id,
    p_email,
    (SELECT name FROM agencies WHERE id = p_agency_id),
    p_role,
    true
  )
  RETURNING to_jsonb(master_users.*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION invite_agency_user(text, uuid, text) TO authenticated;

-- Create agency management functions for master
CREATE OR REPLACE FUNCTION create_agency(
  p_name text,
  p_manager_name text,
  p_contact_email text
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow masters to create agencies
  IF NOT has_role(auth.uid(), 'master'::app_role) THEN
    RAISE EXCEPTION 'Only masters can create agencies';
  END IF;
  
  INSERT INTO agencies(name, contact_name, contact_email, created_by, is_active)
  VALUES(p_name, p_manager_name, p_contact_email, auth.uid(), true)
  RETURNING to_jsonb(agencies.*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_agency(text, text, text) TO authenticated;