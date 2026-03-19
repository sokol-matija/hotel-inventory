import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/hotel/front-desk/reports')({
  beforeLoad: () => {
    throw redirect({ to: '/hotel/finance/revenue-analytics' });
  },
  component: () => null,
});
