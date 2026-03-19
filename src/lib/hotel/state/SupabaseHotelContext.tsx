import { useEffect } from 'react';
import { useHotelStore } from '@/stores/hotelStore';
import { useRealtimeSync } from '@/lib/queries/hooks/useRealtimeSync';
export { useHotel } from '@/stores/hotelStore';

export function SupabaseHotelProvider({ children }: { children: React.ReactNode }) {
  const initialize = useHotelStore((state) => state.initialize);

  // Zustand store — existing realtime + initial data load
  useEffect(() => {
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  // TanStack Query cache — keep in sync with Supabase Realtime
  useRealtimeSync();

  return <>{children}</>;
}
