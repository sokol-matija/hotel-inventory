import { useRealtimeSync } from '@/lib/queries/hooks/useRealtimeSync';

export function SupabaseHotelProvider({ children }: { children: React.ReactNode }) {
  // TanStack Query cache — keep in sync with Supabase Realtime
  useRealtimeSync();

  return <>{children}</>;
}
