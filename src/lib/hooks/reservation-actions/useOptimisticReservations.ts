import { useState, useMemo, useCallback } from 'react';
import type { Reservation, ReservationUpdateInput } from '@/lib/queries/hooks/useReservations';

export interface UseOptimisticReservationsReturn {
  localReservations: Reservation[];
  updateReservationInState: (id: number, updates: ReservationUpdateInput) => void;
}

/**
 * Manages a layer of optimistic overrides on top of TanStack Query
 * server-state reservations. Returns `localReservations` (the merged
 * view) and an `updateReservationInState` setter for optimistic writes.
 */
export function useOptimisticReservations(
  reservations: Reservation[]
): UseOptimisticReservationsReturn {
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Map<number, ReservationUpdateInput>
  >(new Map());

  const localReservations = useMemo(
    () =>
      reservations.map((r) => {
        const overrides = optimisticOverrides.get(r.id);
        return overrides ? { ...r, ...overrides } : r;
      }),
    [reservations, optimisticOverrides]
  );

  const updateReservationInState = useCallback((id: number, updates: ReservationUpdateInput) => {
    setOptimisticOverrides((prev) => new Map(prev).set(id, { ...prev.get(id), ...updates }));
  }, []);

  return { localReservations, updateReservationInState };
}
