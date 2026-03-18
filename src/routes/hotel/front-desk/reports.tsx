import { createFileRoute } from '@tanstack/react-router'
import ReportsPage from '@/components/hotel/frontdesk/ReportsPage'

export const Route = createFileRoute('/hotel/front-desk/reports')({
  component: ReportsPage,
})
