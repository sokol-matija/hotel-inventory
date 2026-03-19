import { createFileRoute } from '@tanstack/react-router';
import FiscalizationTestPage from '@/components/hotel/finance/EracuniTestPage';

export const Route = createFileRoute('/hotel/finance/fiscalization-test')({
  component: FiscalizationTestPage,
});
