import { createFileRoute } from '@tanstack/react-router';
import LocationDetail from '@/components/locations/LocationDetail';
import { requireRole } from '@/lib/routeUtils';

export const Route = createFileRoute('/_layout/locations/$id')({
  beforeLoad: requireRole([2, 5]), // kitchen + admin
  component: LocationDetail,
});
