import { createFileRoute } from '@tanstack/react-router'
import CalendarView from '@/components/hotel/frontdesk/CalendarView'

export const Route = createFileRoute('/hotel/front-desk/')({
  component: CalendarView,
})
