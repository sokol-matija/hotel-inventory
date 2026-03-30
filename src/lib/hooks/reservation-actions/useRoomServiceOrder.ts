import { useCallback } from 'react';
import { formatRoomNumber } from '@/lib/hotel/calendarUtils';
import type { Reservation, ReservationUpdateInput } from '@/lib/queries/hooks/useReservations';
import type { Room } from '@/lib/queries/hooks/useRooms';
import hotelNotification from '@/lib/notifications';
import { OrderItem } from '@/lib/hotel/orderTypes';

export interface UseRoomServiceOrderParams {
  rooms: Room[];
  updateReservation: (id: number, updates: ReservationUpdateInput) => Promise<void>;
}

export interface UseRoomServiceOrderReturn {
  handleDrinksOrderComplete: (
    reservation: Reservation,
    orderItems: OrderItem[],
    orderTotal: number
  ) => Promise<void>;
}

/**
 * Handles appending room-service order text to a reservation's
 * `internal_notes` field.
 */
export function useRoomServiceOrder(params: UseRoomServiceOrderParams): UseRoomServiceOrderReturn {
  const { rooms, updateReservation } = params;

  const handleDrinksOrderComplete = useCallback(
    async (reservation: Reservation, orderItems: OrderItem[], orderTotal: number) => {
      try {
        const room = rooms.find((r) => r.id === reservation.room_id);
        const updatedReservation: ReservationUpdateInput = {
          internal_notes:
            (reservation.internal_notes || '') +
            `\nRoom Service ordered (${new Date().toLocaleDateString()}): ${orderItems.map((item) => `${item.quantity}x ${item.itemName}`).join(', ')} - Total: €${orderTotal.toFixed(2)}`,
        };
        await updateReservation(reservation.id, updatedReservation);
        hotelNotification.success(
          'Room Service Added to Bill',
          `€${orderTotal.toFixed(2)} in charges added to Room ${room ? formatRoomNumber(room) : reservation.room_id} bill`,
          4
        );
      } catch {
        hotelNotification.error(
          'Failed to Add Room Service',
          'Unable to add room service to room bill. Please try again.',
          5
        );
      }
    },
    [rooms, updateReservation]
  );

  return { handleDrinksOrderComplete };
}
