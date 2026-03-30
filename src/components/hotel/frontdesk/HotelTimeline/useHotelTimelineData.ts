import { useState, useEffect, useCallback } from 'react';
import {
  useReservations,
  useUpdateReservation,
  useUpdateReservationStatus,
  useDeleteReservation,
} from '../../../../lib/queries/hooks/useReservations';
import type { ReservationUpdateInput } from '../../../../lib/queries/hooks/useReservations';
import { useRooms } from '../../../../lib/queries/hooks/useRooms';
import { useGuests } from '../../../../lib/queries/hooks/useGuests';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../lib/queries/queryKeys';
import type { ReservationStatus } from '../../../../lib/hotel/types';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { virtualRoomService } from '../../../../lib/hotel/services/VirtualRoomService';

export function useHotelTimelineData(currentDate: Date) {
  const { data: reservations = [] } = useReservations();
  const { data: rooms = [] } = useRooms();
  const { data: guests = [] } = useGuests();
  const updateReservationMutation = useUpdateReservation();
  const updateReservationStatusMutation = useUpdateReservationStatus();
  const deleteReservationMutation = useDeleteReservation();
  const isUpdating =
    updateReservationMutation.isPending ||
    updateReservationStatusMutation.isPending ||
    deleteReservationMutation.isPending;
  const queryClient = useQueryClient();

  const refreshData = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() }),
    [queryClient]
  );

  const updateReservation = useCallback(
    async (id: number, updates: ReservationUpdateInput) => {
      await updateReservationMutation.mutateAsync({ id, updates });
    },
    [updateReservationMutation]
  );

  const updateReservationStatus = useCallback(
    async (id: number, status: string) => {
      await updateReservationStatusMutation.mutateAsync({
        id,
        status: status as ReservationStatus,
      });
    },
    [updateReservationStatusMutation]
  );

  const deleteReservation = useCallback(
    async (id: number) => {
      await deleteReservationMutation.mutateAsync(id);
    },
    [deleteReservationMutation]
  );

  // Virtual rooms -- fetch on date change and after server-confirmed reservation changes
  const [virtualRoomsWithReservations, setVirtualRoomsWithReservations] = useState<Room[]>([]);
  const [virtualRoomsFetchKey, setVirtualRoomsFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      virtualRoomService.getVirtualRoomsWithReservations(currentDate),
      virtualRoomService.getOrCreateEmptyVirtualRoom(currentDate),
    ])
      .then(([rooms, emptyRoom]) => {
        if (cancelled) return;
        if (emptyRoom) {
          const ids = new Set(rooms.map((r) => r.id));
          if (!ids.has(emptyRoom.id)) rooms.push(emptyRoom);
        }
        setVirtualRoomsWithReservations(rooms);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [currentDate, virtualRoomsFetchKey]);

  // Refetch virtual rooms after TQ reservation data settles (server confirmed)
  // but NOT on optimistic overrides (which would cause race conditions)
  useEffect(() => {
    setVirtualRoomsFetchKey((k) => k + 1);
  }, [reservations]);

  return {
    reservations,
    rooms,
    guests,
    isUpdating,
    refreshData,
    updateReservation,
    updateReservationStatus,
    deleteReservation,
    virtualRoomsWithReservations,
  };
}
