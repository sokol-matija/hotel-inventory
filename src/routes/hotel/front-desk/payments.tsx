import { createFileRoute } from '@tanstack/react-router';
import PaymentsPage from '@/components/hotel/frontdesk/PaymentsPage';

export const Route = createFileRoute('/hotel/front-desk/payments')({
  component: PaymentsPage,
});
