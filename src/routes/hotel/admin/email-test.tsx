import { createFileRoute } from '@tanstack/react-router';
import EmailTestPage from '@/components/hotel/frontdesk/EmailTestPage';

export const Route = createFileRoute('/hotel/admin/email-test')({
  component: EmailTestPage,
});
