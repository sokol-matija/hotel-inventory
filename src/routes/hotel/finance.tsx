import { createFileRoute } from '@tanstack/react-router';
import FinanceLayout from '@/components/hotel/finance/FinanceLayout';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';
import { requireRole } from '@/lib/routeUtils';

export const Route = createFileRoute('/hotel/finance')({
  beforeLoad: requireRole([4, 5]), // bookkeeping + admin
  component: FinanceLayout,
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
});
