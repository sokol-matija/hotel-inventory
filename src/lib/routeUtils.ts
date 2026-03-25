import { redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/router';

export function requireAuth({ context }: { context: RouterContext }) {
  if (!context.auth.user) throw redirect({ to: '/login' });
  if (!context.auth.hasProfile) throw redirect({ to: '/onboarding' });
}

/**
 * Returns a beforeLoad guard that first checks auth, then verifies the user's
 * role_id is in the allowed list. Unauthorized users are redirected to /unauthorized.
 *
 * Role IDs: 1=reception, 2=kitchen, 3=housekeeping, 4=bookkeeping, 5=admin
 */
export function requireRole(allowedRoleIds: number[]) {
  return ({ context }: { context: RouterContext }) => {
    requireAuth({ context });
    const roleId = context.auth.userProfile?.role_id;
    if (!roleId || !allowedRoleIds.includes(roleId)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw redirect({ to: '/unauthorized' as any });
    }
  };
}
