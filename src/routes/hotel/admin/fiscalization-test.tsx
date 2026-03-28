import { createFileRoute } from '@tanstack/react-router';
import FiscalizationTestPage from '@/components/hotel/finance/EracuniTestPage';

export const Route = createFileRoute('/hotel/admin/fiscalization-test')({
  component: FiscalizationTestPage,
});
