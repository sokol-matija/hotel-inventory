import { createFileRoute } from '@tanstack/react-router';
import ReservationsListPage from '@/components/hotel/frontdesk/ReservationsListPage';

export const Route = createFileRoute('/hotel/front-desk/reservations-list')({
  component: ReservationsListPage,
});
