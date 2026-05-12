-- Lint 0003 auth_rls_initplan: each call to auth.uid() inside a USING/WITH CHECK
-- predicate is re-evaluated per row.  Wrapping in a scalar subquery
-- `(select auth.uid())` lets Postgres cache the result for the whole query.
-- 9 policies on 3 tables.

-- ===== public.audit_logs =====
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = (select auth.uid())
        AND ur.name::text = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- ===== public.labels =====
DROP POLICY IF EXISTS "Users can view labels for their hotel" ON public.labels;
CREATE POLICY "Users can view labels for their hotel" ON public.labels
  FOR SELECT TO authenticated
  USING (
    hotel_id IN (
      SELECT labels.hotel_id
      FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create labels for their hotel" ON public.labels;
CREATE POLICY "Users can create labels for their hotel" ON public.labels
  FOR INSERT TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT labels.hotel_id
      FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update labels for their hotel" ON public.labels;
CREATE POLICY "Users can update labels for their hotel" ON public.labels
  FOR UPDATE TO authenticated
  USING (
    hotel_id IN (
      SELECT labels.hotel_id
      FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT labels.hotel_id
      FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete labels for their hotel" ON public.labels;
CREATE POLICY "Users can delete labels for their hotel" ON public.labels
  FOR DELETE TO authenticated
  USING (
    hotel_id IN (
      SELECT labels.hotel_id
      FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid())
    )
  );

-- ===== public.user_profiles =====
DROP POLICY IF EXISTS "Enable read for users" ON public.user_profiles;
CREATE POLICY "Enable read for users" ON public.user_profiles
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enable update for users" ON public.user_profiles;
CREATE POLICY "Enable update for users" ON public.user_profiles
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enable insert for non-admin roles" ON public.user_profiles;
CREATE POLICY "Enable insert for non-admin roles" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND role_id <> (
      SELECT user_roles.id FROM user_roles
      WHERE user_roles.name::text = 'admin'
      LIMIT 1
    )
  );
