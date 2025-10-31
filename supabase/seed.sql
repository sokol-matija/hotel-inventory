-- Seed file for local development
-- This file is run after migrations when you do 'supabase db reset'

-- Create test admin user
-- Email: admin@test.local
-- Password: admin123

DO $$
DECLARE
  new_user_id uuid;
  user_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.local') INTO user_exists;

  IF NOT user_exists THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@test.local',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    -- Insert into user_profiles
    INSERT INTO user_profiles (user_id, role_id, is_active, push_notifications_enabled)
    VALUES (new_user_id, 5, true, false);  -- role_id 5 = admin

    RAISE NOTICE 'Test admin user created: admin@test.local / admin123';
  ELSE
    RAISE NOTICE 'Test admin user already exists: admin@test.local';
  END IF;
END $$;
