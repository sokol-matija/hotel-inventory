import { createFileRoute } from '@tanstack/react-router';
import Layout from '@/components/layout/Layout';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';
import { requireAuth } from '@/lib/routeUtils';

export const Route = createFileRoute('/_layout')({
  beforeLoad: requireAuth,
  component: Layout,
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
});
