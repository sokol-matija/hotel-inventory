import { createFileRoute } from '@tanstack/react-router';
import InvoicePaymentPage from '@/components/hotel/finance/InvoicePaymentPage';

export const Route = createFileRoute('/hotel/finance/')({
  component: InvoicePaymentPage,
});
