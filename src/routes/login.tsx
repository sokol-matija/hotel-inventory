import { createFileRoute, redirect } from '@tanstack/react-router'
import LoginPage from '@/components/auth/LoginPage'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.auth.user) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: LoginPage,
})
