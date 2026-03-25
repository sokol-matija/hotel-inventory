import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  useEffect(() => {
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);
  return <>{children}</>;
}
