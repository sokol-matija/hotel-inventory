import { createFileRoute } from '@tanstack/react-router';
import AdminLayout from '@/components/hotel/admin/AdminLayout';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';
import { requireRole } from '@/lib/routeUtils';

export const Route = createFileRoute('/hotel/admin')({
  beforeLoad: requireRole([5]), // admin only
  component: AdminLayout,
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
});
