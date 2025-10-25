-- Phase 3.3.4-Init: profiles 테이블에 user_id 추가 및 함수 수정

-- 1. profiles 테이블에 user_id 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. 기존 데이터의 user_id 업데이트 (id가 auth.users의 id와 같다고 가정)
UPDATE public.profiles 
SET user_id = id 
WHERE user_id IS NULL;

-- 3. user_id를 NOT NULL로 설정
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- 4. user_id에 unique 제약 추가
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

-- 5. profiles RLS 정책 생성 (이미 있으면 무시)
DO $$ BEGIN
    CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 6. user_roles RLS 정책 생성 (이미 있으면 무시)
DO $$ BEGIN
    CREATE POLICY "Users can view their own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 7. has_role 함수 생성 (이미 있으면 재생성)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 8. assign_master_role 함수 수정
CREATE OR REPLACE FUNCTION public.assign_master_role(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found with email: ' || user_email
    );
  END IF;

  -- Insert or update role in user_roles
  INSERT INTO public.user_roles (user_id, role, agency_id)
  VALUES (target_user_id, 'master'::app_role, NULL)
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'master'::app_role,
      agency_id = NULL,
      updated_at = now();

  -- Insert or update profile (profiles.id = user_id)
  INSERT INTO public.profiles (id, user_id, email)
  VALUES (target_user_id, target_user_id, user_email)
  ON CONFLICT (id) DO UPDATE
  SET user_id = target_user_id,
      email = user_email,
      updated_at = now();

  RETURN jsonb_build_object(
    'status', 'success',
    'user_id', target_user_id,
    'email', user_email,
    'role', 'master',
    'message', 'Master role assigned successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- 9. auth.users에서 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 트리거 생성 (이미 있으면 삭제 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.has_role IS 'Check if a user has a specific role';
COMMENT ON FUNCTION public.assign_master_role IS 'Assigns master role to a user by email. Use: SELECT * FROM public.assign_master_role(''master@sympohub.com'')';