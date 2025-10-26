-- Create invite_master_user RPC function
CREATE OR REPLACE FUNCTION invite_master_user(
  p_email text,
  p_agency_id uuid
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Insert into master_users
  INSERT INTO master_users(email, agency, active)
  VALUES(
    p_email,
    (SELECT name FROM agencies WHERE id = p_agency_id),
    true
  )
  RETURNING to_jsonb(master_users.*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION invite_master_user(text, uuid) TO authenticated;