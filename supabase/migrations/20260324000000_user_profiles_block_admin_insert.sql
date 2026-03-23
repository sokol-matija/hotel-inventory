-- Migration: block direct client inserts of admin role into user_profiles
--
-- Previously, any authenticated user could insert a row with role_id = admin
-- because the policy only checked auth.uid() = user_id.
-- Now we also block admin role_id (looked up dynamically) from direct inserts.
-- Admin role assignment must go through the assign-role Edge Function,
-- which verifies the server-side ADMIN_PASSWORD secret.

-- Drop the unrestricted insert policy
DROP POLICY IF EXISTS "Enable insert for users" ON "public"."user_profiles";

-- New policy: authenticated users can insert their own profile,
-- but only with non-admin role_id.
CREATE POLICY "Enable insert for non-admin roles" ON "public"."user_profiles"
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role_id != (
      SELECT id FROM public.user_roles WHERE name = 'admin' LIMIT 1
    )
  );
