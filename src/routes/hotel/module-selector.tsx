import { createFileRoute, redirect } from '@tanstack/react-router';
import ModuleSelector from '@/components/hotel/ModuleSelector';

export const Route = createFileRoute('/hotel/module-selector')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user) throw redirect({ to: '/login' });
    if (!context.auth.hasProfile) throw redirect({ to: '/onboarding' });
  },
  component: ModuleSelector,
});
