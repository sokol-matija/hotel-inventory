import { createFileRoute } from '@tanstack/react-router'
import LocationsPage from '@/components/locations/LocationsPage'

export const Route = createFileRoute('/_layout/locations/')({
  component: LocationsPage,
})
