import { createFileRoute } from '@tanstack/react-router';
import FiscalCompliancePage from '@/components/hotel/finance/FiscalCompliancePage';

export const Route = createFileRoute('/hotel/finance/fiscal-compliance')({
  component: FiscalCompliancePage,
});
