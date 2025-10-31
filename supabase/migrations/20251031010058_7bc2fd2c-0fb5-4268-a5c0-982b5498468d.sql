-- [74-B.0-FIX.9] Fix profiles.id to use auth.users.id directly

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,           -- Must match auth.users.id (FK constraint)
    user_id,      -- Also references auth.users.id
    email,
    display_name,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    new.id,       -- Changed from gen_random_uuid() to new.id
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 
'[74-B.0-FIX.9] Creates profile with id=auth.users.id (FK requirement)';