-- Lint 0006: audit_logs has two permissive SELECT policies that overlap (admin can see
-- all, user can see own).  Merge into a single OR predicate to halve the per-row cost.

DROP POLICY IF EXISTS "Admins can view all audit logs"   ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;

CREATE POLICY "Read audit logs (admin or owner)" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.user_id = (select auth.uid())
        AND ur.name::text = 'admin'
    )
  );
