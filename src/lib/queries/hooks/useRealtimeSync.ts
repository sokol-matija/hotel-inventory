import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeService } from '../../hotel/services/RealtimeService';
import { queryKeys } from '../queryKeys';

/**
 * Subscribes to Supabase Realtime events and invalidates the corresponding
 * TanStack Query caches. Mount this once near the app root (e.g. SupabaseHotelProvider).
 *
 * During the incremental migration this runs alongside the Zustand store's
 * own realtime subscriptions — both caches stay in sync automatically.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToHotelTimeline(
      // Reservations changed
      (_payload) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
      },
      // Rooms changed
      (_payload) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all() });
      },
      // Guests changed
      (_payload) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() });
      }
    );

    return () => unsubscribe();
  }, [queryClient]);
}
