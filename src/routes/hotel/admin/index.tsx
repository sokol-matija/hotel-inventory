import { createFileRoute } from '@tanstack/react-router';
import { AdminTestingPage } from '@/components/testing/AdminTestingPage';

export const Route = createFileRoute('/hotel/admin/')({
  component: AdminTestingPage,
});
