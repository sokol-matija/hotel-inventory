import { createFileRoute } from '@tanstack/react-router';
import ReservationsListV2Page from '@/components/hotel/frontdesk/ReservationsListV2/ReservationsListV2Page';

export const Route = createFileRoute('/hotel/front-desk/reservations-list')({
  component: ReservationsListV2Page,
});
