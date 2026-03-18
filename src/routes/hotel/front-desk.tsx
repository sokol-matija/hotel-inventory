import { createFileRoute, redirect } from '@tanstack/react-router'
import FrontDeskLayout from '@/components/hotel/frontdesk/FrontDeskLayout'

export const Route = createFileRoute('/hotel/front-desk')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user) throw redirect({ to: '/login' })
    if (!context.auth.hasProfile) throw redirect({ to: '/onboarding' })
  },
  component: FrontDeskLayout,
})
