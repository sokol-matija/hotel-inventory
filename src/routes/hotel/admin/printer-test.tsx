import { createFileRoute } from '@tanstack/react-router';
import PrinterTestPage from '@/components/hotel/frontdesk/PrinterTest/PrinterTestPage';

export const Route = createFileRoute('/hotel/admin/printer-test')({
  component: PrinterTestPage,
});
