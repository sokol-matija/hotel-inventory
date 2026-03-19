import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/hotel/front-desk/payments')({
  beforeLoad: () => {
    throw redirect({ to: '/hotel/finance/invoices' });
  },
  component: () => null,
});
