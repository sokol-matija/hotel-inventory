import { createFileRoute } from '@tanstack/react-router';
import ItemsPage from '@/components/items/ItemsPage';
import { requireRole } from '@/lib/routeUtils';

export const Route = createFileRoute('/_layout/items')({
  beforeLoad: requireRole([2, 5]), // kitchen + admin
  component: ItemsPage,
});
