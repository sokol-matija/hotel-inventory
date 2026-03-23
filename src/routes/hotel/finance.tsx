import { createFileRoute, redirect } from '@tanstack/react-router';
import FinanceLayout from '@/components/hotel/finance/FinanceLayout';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';

export const Route = createFileRoute('/hotel/finance')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user) throw redirect({ to: '/login' });
    if (!context.auth.hasProfile) throw redirect({ to: '/onboarding' });
  },
  component: FinanceLayout,
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
});
