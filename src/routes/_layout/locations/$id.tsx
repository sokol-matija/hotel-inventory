import { createFileRoute } from '@tanstack/react-router';
import LocationDetail from '@/components/locations/LocationDetail';

export const Route = createFileRoute('/_layout/locations/$id')({
  component: LocationDetail,
});
