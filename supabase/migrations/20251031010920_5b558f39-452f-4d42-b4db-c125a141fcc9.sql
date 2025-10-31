-- [74-B.0-FIX.10] Remove conflicting profile trigger that causes user_id NULL errors

-- Drop the broken trigger that doesn't set user_id
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

-- Drop the broken function
DROP FUNCTION IF EXISTS public.handle_new_user_profile() CASCADE;

-- Verify remaining triggers
COMMENT ON FUNCTION public.handle_new_user IS 
'[74-B.0-FIX.10] Primary profile creation trigger - sets both id and user_id correctly';

-- QA: Check remaining triggers on auth.users
-- Expected: on_auth_user_created, on_user_created, trg_sync_profile_on_signup
-- Should NOT have: on_auth_user_created_profile