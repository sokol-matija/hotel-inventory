import { createFileRoute } from '@tanstack/react-router';
import OrdersPage from '@/components/orders/OrdersPage';
import { requireRole } from '@/lib/routeUtils';

export const Route = createFileRoute('/_layout/orders')({
  beforeLoad: requireRole([2, 5]), // kitchen + admin
  component: OrdersPage,
});
