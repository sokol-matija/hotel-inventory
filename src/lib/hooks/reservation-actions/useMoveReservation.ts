import { useCallback } from 'react';
import { addDays, format, differenceInCalendarDays } from 'date-fns';
import { isRoomAvailable, formatRoomNumber } from '@/lib/hotel/calendarUtils';
import type { Reservation, ReservationUpdateInput } from '@/lib/queries/hooks/useReservations';
import type { Guest } from '@/lib/queries/hooks/useGuests';
import type { Room } from '@/lib/queries/hooks/useRooms';
import hotelNotification from '@/lib/notifications';
import { virtualRoomService } from '@/lib/hotel/services/VirtualRoomService';
import { OptimisticUpdateService } from '@/lib/hotel/services/OptimisticUpdateService';
import { regenerateReservationCharges } from '@/lib/hotel/services/chargeRegeneration';

export interface UseMoveReservationParams {
  localReservations: Reservation[];
  rooms: Room[];
  guests: Guest[];
  selectedReservation: Reservation | null;
  showRoomChangeDialog: (reservationId: number, fromRoomId: number, toRoomId: number) => void;
  updateReservationInState: (id: number, updates: ReservationUpdateInput) => void;
  updateReservation: (id: number, updates: ReservationUpdateInput) => Promise<void>;
}

export interface UseMoveReservationReturn {
  handleMoveReservation: (
    reservationId: number,
    newRoomId: number,
    newCheckIn: Date,
    newCheckOut: Date
  ) => Promise<void>;
  handleMoveReservationArrow: (direction: 'left' | 'right') => Promise<void>;
  handleResizeReservation: (
    reservationId: number,
    side: 'start' | 'end',
    newDate: Date
  ) => Promise<void>;
}

/**
 * Handles drag-and-drop moves, keyboard arrow moves, and edge-resize
 * of reservations on the hotel timeline.
 */
export function useMoveReservation(params: UseMoveReservationParams): UseMoveReservationReturn {
  const {
    localReservations,
    rooms,
    guests,
    selectedReservation,
    showRoomChangeDialog,
    updateReservationInState,
    updateReservation,
  } = params;

  const handleMoveReservation = useCallback(
    async (reservationId: number, newRoomId: number, newCheckIn: Date, newCheckOut: Date) => {
      try {
        const reservation = localReservations.find((r) => r.id === reservationId);
        if (!reservation) throw new Error('Reservation not found');

        const oldRoom = rooms.find((r) => r.id === reservation.room_id);
        const newRoom = rooms.find((r) => r.id === newRoomId);
        if (!oldRoom || !newRoom) throw new Error('Room not found');

        const isVirtualToReal =
          virtualRoomService.isVirtualRoom(oldRoom) && !virtualRoomService.isVirtualRoom(newRoom);
        const isRealToVirtual =
          !virtualRoomService.isVirtualRoom(oldRoom) && virtualRoomService.isVirtualRoom(newRoom);

        let allocationGuestData: Partial<Guest> | undefined;

        if (isVirtualToReal) {
          const guest = guests.find((g) => g.id === reservation.guest_id);
          if (!guest) {
            hotelNotification.error('Allocation Failed', 'Guest not found for reservation');
            return;
          }
          const isPlaceholderGuest = guest.first_name === 'Unallocated';
          if (isPlaceholderGuest) {
            allocationGuestData = {
              first_name: guest.last_name?.split(' ')[0] || 'Guest',
              last_name: guest.last_name?.split(' ').slice(1).join(' ') || '',
              email: guest.email,
              phone: guest.phone,
              nationality: guest.nationality,
              date_of_birth: guest.date_of_birth,
            };
          }
        }

        const reservationsExcludingMoved = localReservations.filter((r) => r.id !== reservationId);
        const available = isRoomAvailable(
          reservationsExcludingMoved,
          newRoomId,
          newCheckIn,
          newCheckOut
        );

        if (!available) {
          hotelNotification.error(
            'Move Blocked!',
            'Room is not available for the selected dates.',
            5
          );
          return;
        }

        const guest = guests.find((g) => g.id === reservation.guest_id);
        const isRoomTypeChange = oldRoom.room_types?.code !== newRoom.room_types?.code;
        const updatedReservationData: ReservationUpdateInput = {
          room_id: newRoomId,
          check_in_date: format(newCheckIn, 'yyyy-MM-dd'),
          check_out_date: format(newCheckOut, 'yyyy-MM-dd'),
        };

        if (isRoomTypeChange && !isVirtualToReal && !isRealToVirtual) {
          showRoomChangeDialog(reservationId, reservation.room_id, newRoomId);
          return;
        }

        const optimisticService = OptimisticUpdateService.getInstance();
        let result: { success: boolean; error?: string };

        if (isVirtualToReal) {
          result = await optimisticService.optimisticUpdateReservation(
            reservationId,
            reservation,
            {
              room_id: newRoomId,
              check_in_date: format(newCheckIn, 'yyyy-MM-dd'),
              check_out_date: format(newCheckOut, 'yyyy-MM-dd'),
              status: 'confirmed',
              reservation_statuses: { code: 'confirmed' },
            } as ReservationUpdateInput,
            updateReservationInState,
            async () => {
              const allocationResult = await virtualRoomService.convertToRealReservation(
                reservationId,
                newRoomId,
                allocationGuestData
              );
              if (!allocationResult.success)
                throw new Error(allocationResult.error || 'Allocation failed');
            }
          );
        } else if (isRealToVirtual) {
          result = await optimisticService.optimisticUpdateReservation(
            reservationId,
            reservation,
            {
              room_id: newRoomId,
              check_in_date: format(newCheckIn, 'yyyy-MM-dd'),
              check_out_date: format(newCheckOut, 'yyyy-MM-dd'),
              status: 'unallocated',
              reservation_statuses: { code: 'unallocated' },
            } as ReservationUpdateInput,
            updateReservationInState,
            async () => {
              await virtualRoomService.convertToUnallocated(reservationId, newRoomId);
            }
          );
        } else {
          result = await optimisticService.optimisticMoveReservation(
            reservationId,
            reservation,
            newRoomId,
            newCheckIn,
            newCheckOut,
            updateReservationInState,
            async () => {
              await updateReservation(reservationId, updatedReservationData);
            }
          );

          // Regenerate charges after regular room-to-room move
          if (result.success) {
            try {
              await regenerateReservationCharges({
                reservationId,
                roomId: newRoomId,
                checkIn: newCheckIn,
                checkOut: newCheckOut,
                adults: reservation.adults ?? 1,
                childrenCount: reservation.children_count ?? 0,
                guestDisplayName: 'Guest',
                hasPets: reservation.has_pets ?? false,
                parkingRequired: reservation.parking_required ?? false,
              });
            } catch (chargeErr) {
              console.error('Failed to regenerate charges after move:', chargeErr);
            }
          }
        }

        if (!result.success) {
          hotelNotification.error(
            isVirtualToReal ? 'Allocation Failed' : 'Move Failed',
            result.error || 'Failed to complete operation. Please try again.',
            4
          );
          return;
        }

        if (isVirtualToReal) {
          hotelNotification.success(
            'Reservation Allocated!',
            `${guest?.display_name || 'Guest'} allocated to ${formatRoomNumber(newRoom)} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`,
            5
          );
        } else if (isRealToVirtual) {
          hotelNotification.success(
            'Reservation Unallocated',
            `${guest?.display_name || 'Guest'} moved back to unallocated queue`,
            5
          );
        } else {
          hotelNotification.success(
            'Reservation Moved Successfully!',
            `${guest?.display_name || 'Guest'} moved from ${formatRoomNumber(oldRoom)} to ${formatRoomNumber(newRoom)} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`,
            5
          );
        }
      } catch {
        hotelNotification.error(
          'Failed to Move Reservation',
          'Unable to move the reservation. Please try again.',
          5
        );
      }
    },
    [
      localReservations,
      rooms,
      guests,
      showRoomChangeDialog,
      updateReservationInState,
      updateReservation,
    ]
  );

  const handleMoveReservationArrow = useCallback(
    async (direction: 'left' | 'right') => {
      if (!selectedReservation) {
        hotelNotification.info(
          'No Selection',
          'Please select a reservation first to move it with arrow keys.',
          3
        );
        return;
      }
      const reservation = localReservations.find((r) => r.id === selectedReservation.id);
      if (!reservation) {
        hotelNotification.error(
          'Reservation Not Found',
          'Selected reservation could not be found.',
          3
        );
        return;
      }
      const daysToMove = direction === 'left' ? -1 : 1;
      await handleMoveReservation(
        reservation.id,
        reservation.room_id,
        addDays(new Date(reservation.check_in_date), daysToMove),
        addDays(new Date(reservation.check_out_date), daysToMove)
      );
    },
    [selectedReservation, localReservations, handleMoveReservation]
  );

  const handleResizeReservation = useCallback(
    async (reservationId: number, side: 'start' | 'end', newDate: Date) => {
      try {
        const reservation = localReservations.find((r) => r.id === reservationId);
        if (!reservation) throw new Error('Reservation not found');

        const room = rooms.find((r) => r.id === reservation.room_id);
        const guest = guests.find((g) => g.id === reservation.guest_id);
        const newCheckIn = side === 'start' ? newDate : new Date(reservation.check_in_date);
        const newCheckOut = side === 'end' ? newDate : new Date(reservation.check_out_date);
        const daysDiff = differenceInCalendarDays(newCheckOut, newCheckIn);

        if (daysDiff < 1) {
          hotelNotification.error('Invalid Reservation Length', 'Minimum stay is 1 day', 3);
          return;
        }

        const hasConflict = localReservations.some((r) => {
          const status = r.reservation_statuses?.code ?? 'confirmed';
          return (
            r.id !== reservationId &&
            r.room_id === reservation.room_id &&
            status !== 'checked-out' &&
            ((newCheckIn >= new Date(r.check_in_date) && newCheckIn < new Date(r.check_out_date)) ||
              (newCheckOut > new Date(r.check_in_date) &&
                newCheckOut <= new Date(r.check_out_date)) ||
              (newCheckIn <= new Date(r.check_in_date) &&
                newCheckOut >= new Date(r.check_out_date)))
          );
        });

        if (hasConflict) {
          hotelNotification.error(
            'Booking Conflict',
            'Another reservation conflicts with these dates',
            4
          );
          return;
        }

        const updatedData: ReservationUpdateInput = {
          check_in_date: format(newCheckIn, 'yyyy-MM-dd'),
          check_out_date: format(newCheckOut, 'yyyy-MM-dd'),
        };

        const optimisticService = OptimisticUpdateService.getInstance();
        const result = await optimisticService.optimisticUpdateReservation(
          reservationId,
          reservation,
          updatedData,
          updateReservationInState,
          async () => {
            await updateReservation(reservationId, updatedData);
          }
        );

        if (result.success) {
          // Regenerate charges for new dates
          try {
            await regenerateReservationCharges({
              reservationId,
              roomId: reservation.room_id,
              checkIn: newCheckIn,
              checkOut: newCheckOut,
              adults: reservation.adults ?? 1,
              childrenCount: reservation.children_count ?? 0,
              guestDisplayName: guest?.display_name ?? 'Guest',
              hasPets: reservation.has_pets ?? false,
              parkingRequired: reservation.parking_required ?? false,
            });
          } catch (chargeErr) {
            console.error('Failed to regenerate charges after resize:', chargeErr);
          }

          hotelNotification.success(
            'Reservation Updated!',
            `${guest?.display_name || 'Guest'} • ${room ? formatRoomNumber(room) : 'Room'} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`,
            6
          );
        } else {
          hotelNotification.error(
            'Update Failed',
            result.error || 'Failed to update reservation. Please try again.',
            4
          );
        }
      } catch {
        hotelNotification.error(
          'Failed to Update Reservation',
          'Unable to change reservation dates. Please try again.',
          4
        );
      }
    },
    [localReservations, rooms, guests, updateReservationInState, updateReservation]
  );

  return { handleMoveReservation, handleMoveReservationArrow, handleResizeReservation };
}
