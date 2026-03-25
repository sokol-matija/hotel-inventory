import { createFileRoute } from '@tanstack/react-router';
import LocationsPage from '@/components/locations/LocationsPage';
import { requireRole } from '@/lib/routeUtils';

export const Route = createFileRoute('/_layout/locations/')({
  beforeLoad: requireRole([2, 5]), // kitchen + admin
  component: LocationsPage,
});
