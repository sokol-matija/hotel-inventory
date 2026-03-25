import { createFileRoute } from '@tanstack/react-router';
import FrontDeskLayout from '@/components/hotel/frontdesk/FrontDeskLayout';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';
import { requireRole } from '@/lib/routeUtils';

export const Route = createFileRoute('/hotel/front-desk')({
  beforeLoad: requireRole([1, 5]), // reception + admin
  component: FrontDeskLayout,
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
});
