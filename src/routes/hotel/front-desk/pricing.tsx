import { createFileRoute } from '@tanstack/react-router'
import PricingManagement from '@/components/hotel/pricing/PricingManagement'

export const Route = createFileRoute('/hotel/front-desk/pricing')({
  component: PricingManagement,
})
