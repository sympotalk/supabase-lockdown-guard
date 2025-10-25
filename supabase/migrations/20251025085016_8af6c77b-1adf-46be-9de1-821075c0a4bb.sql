-- 1️⃣ Master 사용자가 없으면 생성하고 role 자동 할당
DO $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- auth.users에 master 계정이 있는지 확인
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'master@sympohub.com';
  
  -- 없으면 생성 (Supabase Auth를 통해 생성된 것으로 가정)
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Master user not found. Please create user via Supabase Dashboard first.';
    RAISE EXCEPTION 'User must be created via Supabase Dashboard with email: master@sympohub.com';
  END IF;
  
  -- Master role 할당
  SELECT public.assign_master_role('master@sympohub.com') INTO v_result;
  
  RAISE NOTICE 'Result: %', v_result;
END $$;