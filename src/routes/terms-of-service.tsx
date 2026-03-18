import { createFileRoute } from '@tanstack/react-router'
import TermsOfService from '@/components/legal/TermsOfService'

export const Route = createFileRoute('/terms-of-service')({
  component: TermsOfService,
})
