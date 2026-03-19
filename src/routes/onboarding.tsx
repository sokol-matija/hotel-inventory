import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import RoleSelection from '@/components/auth/RoleSelection';

function OnboardingPage() {
  const { user, hasProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasProfile) {
      navigate({ to: '/hotel/module-selector', replace: true });
    }
  }, [hasProfile, navigate]);

  if (hasProfile) return null;

  return <RoleSelection user={user!} onRoleSelected={refreshProfile} />;
}

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/login' });
    }
    if (context.auth.hasProfile) {
      throw redirect({ to: '/hotel/module-selector' });
    }
  },
  component: OnboardingPage,
});
