import { createFileRoute } from '@tanstack/react-router';
import LocationManagement from '@/components/admin/LocationManagement';

export const Route = createFileRoute('/_layout/admin/locations')({
  component: LocationManagement,
});
