import { useCallback } from 'react';
import { formatRoomNumber } from '@/lib/hotel/calendarUtils';
import type { Reservation, ReservationUpdateInput } from '@/lib/queries/hooks/useReservations';
import type { Guest } from '@/lib/queries/hooks/useGuests';
import type { Room } from '@/lib/queries/hooks/useRooms';
import hotelNotification from '@/lib/notifications';
import { OptimisticUpdateService } from '@/lib/hotel/services/OptimisticUpdateService';
import { regenerateReservationCharges } from '@/lib/hotel/services/chargeRegeneration';
import type { RoomChangeDialog } from '@/lib/hotel/services/HotelTimelineService';

export interface UseRoomChangeActionsParams {
  localReservations: Reservation[];
  rooms: Room[];
  guests: Guest[];
  roomChangeDialog: RoomChangeDialog;
  updateReservationInState: (id: number, updates: ReservationUpdateInput) => void;
  updateReservation: (id: number, updates: ReservationUpdateInput) => Promise<void>;
  closeRoomChangeDialog: () => void;
}

export interface UseRoomChangeActionsReturn {
  handleConfirmRoomChange: () => Promise<void>;
  handleFreeUpgrade: () => Promise<void>;
}

// ── Shared helper (module-level, not a hook) ─────────────────────────────────

interface ExecuteRoomMutationParams {
  dialog: RoomChangeDialog;
  localReservations: Reservation[];
  rooms: Room[];
  guests: Guest[];
  updateReservationInState: (id: number, updates: ReservationUpdateInput) => void;
  updateReservation: (id: number, updates: ReservationUpdateInput) => Promise<void>;
  closeRoomChangeDialog: () => void;
}

async function executeRoomMutation(
  params: ExecuteRoomMutationParams,
  variant: 'standard' | 'upgrade'
): Promise<void> {
  const {
    dialog,
    localReservations,
    rooms,
    guests,
    updateReservationInState,
    updateReservation,
    closeRoomChangeDialog,
  } = params;

  const reservation = localReservations.find((r) => r.id === dialog.reservationId);
  const targetRoom = rooms.find((r) => r.id === dialog.toRoomId);
  const currentRoom = rooms.find((r) => r.id === dialog.fromRoomId);
  if (!reservation || !targetRoom || !currentRoom) return;

  try {
    const updatedReservationData: ReservationUpdateInput = {
      room_id: targetRoom.id,
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
    };

    const optimisticService = OptimisticUpdateService.getInstance();
    const result = await optimisticService.optimisticUpdateReservation(
      dialog.reservationId,
      reservation,
      updatedReservationData,
      updateReservationInState,
      async () => {
        await updateReservation(dialog.reservationId, updatedReservationData);
      }
    );

    if (result.success) {
      const guest = guests.find((g) => g.id === reservation.guest_id);

      // Regenerate charges for the new room (skip for free upgrades -- keep old pricing)
      if (variant === 'standard') {
        try {
          await regenerateReservationCharges({
            reservationId: dialog.reservationId,
            roomId: targetRoom.id,
            checkIn: new Date(reservation.check_in_date),
            checkOut: new Date(reservation.check_out_date),
            adults: reservation.adults ?? 1,
            childrenCount: reservation.children_count ?? 0,
            guestDisplayName: guest?.display_name ?? 'Guest',
            hasPets: reservation.has_pets ?? false,
            parkingRequired: reservation.parking_required ?? false,
          });
        } catch (chargeErr) {
          console.error('Failed to regenerate charges after room change:', chargeErr);
        }
      }

      if (variant === 'standard') {
        hotelNotification.success(
          'Room Change Successful!',
          `${guest?.display_name || 'Guest'} moved from ${formatRoomNumber(currentRoom)} to ${formatRoomNumber(targetRoom)} with updated pricing`,
          5
        );
      } else {
        hotelNotification.success(
          'Free Upgrade Applied!',
          `${guest?.display_name || 'Guest'} received a FREE UPGRADE from ${formatRoomNumber(currentRoom)} to ${formatRoomNumber(targetRoom)}!`,
          7
        );
      }
    } else {
      hotelNotification.error(
        variant === 'standard' ? 'Move Failed!' : 'Upgrade Failed!',
        result.error ||
          (variant === 'standard' ? 'Failed to move reservation' : 'Failed to apply free upgrade'),
        5
      );
    }
    closeRoomChangeDialog();
  } catch {
    hotelNotification.error(
      variant === 'standard' ? 'Failed to Change Room' : 'Failed to Apply Upgrade',
      variant === 'standard'
        ? 'Unable to complete the room change. Please try again.'
        : 'Unable to complete the free upgrade. Please try again.',
      5
    );
    closeRoomChangeDialog();
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Handles room-change dialog confirmation (standard change and free upgrade).
 * Absorbs the former standalone `executeRoomMutation` helper.
 */
export function useRoomChangeActions(
  params: UseRoomChangeActionsParams
): UseRoomChangeActionsReturn {
  const {
    localReservations,
    rooms,
    guests,
    roomChangeDialog,
    updateReservationInState,
    updateReservation,
    closeRoomChangeDialog,
  } = params;

  const handleConfirmRoomChange = useCallback(async () => {
    if (!roomChangeDialog.show || !roomChangeDialog.reservationId) return;
    await executeRoomMutation(
      {
        dialog: roomChangeDialog,
        localReservations,
        rooms,
        guests,
        updateReservationInState,
        updateReservation,
        closeRoomChangeDialog,
      },
      'standard'
    );
  }, [
    roomChangeDialog,
    localReservations,
    rooms,
    guests,
    updateReservationInState,
    updateReservation,
    closeRoomChangeDialog,
  ]);

  const handleFreeUpgrade = useCallback(async () => {
    if (!roomChangeDialog.show || !roomChangeDialog.reservationId) return;
    await executeRoomMutation(
      {
        dialog: roomChangeDialog,
        localReservations,
        rooms,
        guests,
        updateReservationInState,
        updateReservation,
        closeRoomChangeDialog,
      },
      'upgrade'
    );
  }, [
    roomChangeDialog,
    localReservations,
    rooms,
    guests,
    updateReservationInState,
    updateReservation,
    closeRoomChangeDialog,
  ]);

  return { handleConfirmRoomChange, handleFreeUpgrade };
}
