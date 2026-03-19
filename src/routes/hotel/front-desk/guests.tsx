import { createFileRoute } from '@tanstack/react-router';
import GuestsPage from '@/components/hotel/frontdesk/GuestsPage';

export const Route = createFileRoute('/hotel/front-desk/guests')({
  component: GuestsPage,
});
