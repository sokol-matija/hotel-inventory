import { createFileRoute, redirect } from '@tanstack/react-router';
import Layout from '@/components/layout/Layout';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';

export const Route = createFileRoute('/_layout')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user) throw redirect({ to: '/login' });
    if (!context.auth.hasProfile) throw redirect({ to: '/onboarding' });
  },
  component: Layout,
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
});
