import { useState, useMemo, useCallback } from 'react';
import { addDays } from 'date-fns';
import { isRoomAvailable, formatRoomNumber } from '../hotel/calendarUtils';
import type { Reservation, ReservationUpdateInput } from '../queries/hooks/useReservations';
import type { Guest } from '../queries/hooks/useGuests';
import type { Room } from '../queries/hooks/useRooms';
import hotelNotification from '../notifications';
import { OrderItem } from '../hotel/orderTypes';
import { virtualRoomService } from '../hotel/services/VirtualRoomService';
import { OptimisticUpdateService } from '../hotel/services/OptimisticUpdateService';
import { unifiedPricingService } from '../hotel/services/UnifiedPricingService';
import { supabase } from '../supabase';
import type { RoomChangeDialog } from '../hotel/services/HotelTimelineService';

export interface UseReservationActionsParams {
  reservations: Reservation[];
  rooms: Room[];
  guests: Guest[];
  roomChangeDialog: RoomChangeDialog;
  selectedReservation: Reservation | null;
  showRoomChangeDialog: (reservationId: number, fromRoomId: number, toRoomId: number) => void;
  closeRoomChangeDialog: () => void;
  updateReservation: (id: number, updates: ReservationUpdateInput) => Promise<void>;
}

export interface UseReservationActionsReturn {
  localReservations: Reservation[];
  handleMoveReservation: (
    reservationId: number,
    newRoomId: number,
    newCheckIn: Date,
    newCheckOut: Date
  ) => Promise<void>;
  handleMoveReservationArrow: (direction: 'left' | 'right') => Promise<void>;
  handleConfirmRoomChange: () => Promise<void>;
  handleFreeUpgrade: () => Promise<void>;
  handleResizeReservation: (
    reservationId: number,
    side: 'start' | 'end',
    newDate: Date
  ) => Promise<void>;
  handleDrinksOrderComplete: (
    reservation: Reservation,
    orderItems: OrderItem[],
    orderTotal: number
  ) => Promise<void>;
}

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

      // Regenerate charges for the new room (skip for free upgrades — keep old pricing)
      if (variant === 'standard') {
        try {
          const adults = reservation.adults ?? 1;
          const childrenCount = reservation.children_count ?? 0;
          const guestEntries = [
            ...Array(adults)
              .fill(null)
              .map(() => ({
                name: guest?.display_name ?? 'Guest',
                type: 'adult' as const,
              })),
            ...Array(childrenCount)
              .fill(null)
              .map((_, i) => ({
                name: `Child ${i + 1}`,
                type: 'child' as const,
              })),
          ];
          const newCharges = await unifiedPricingService.generateCharges({
            roomId: String(targetRoom.id),
            checkIn: new Date(reservation.check_in_date),
            checkOut: new Date(reservation.check_out_date),
            guests: guestEntries,
            hasPets: reservation.has_pets ?? false,
            parkingRequired: reservation.parking_required ?? false,
          });
          await supabase
            .from('reservation_charges')
            .delete()
            .eq('reservation_id', dialog.reservationId);
          if (newCharges.length > 0) {
            await supabase.from('reservation_charges').insert(
              newCharges.map((c) => ({
                reservation_id: dialog.reservationId,
                charge_type: c.chargeType,
                description: c.description,
                quantity: c.quantity,
                unit_price: c.unitPrice,
                total: c.total,
                vat_rate: c.vatRate ?? 0.13,
                sort_order: c.sortOrder ?? 0,
              }))
            );
          }
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

export function useReservationActions(
  params: UseReservationActionsParams
): UseReservationActionsReturn {
  const {
    reservations,
    rooms,
    guests,
    roomChangeDialog,
    selectedReservation,
    showRoomChangeDialog,
    closeRoomChangeDialog,
    updateReservation,
  } = params;

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

        let allocationGuestData: Partial<Guest> | undefined;

        if (isVirtualToReal) {
          const guest = guests.find((g) => g.id === reservation.guest_id);
          if (!guest) {
            hotelNotification.error('Allocation Failed', 'Guest not found for reservation');
            return;
          }
          // Only pass guest data for placeholder guests that need replacing.
          // If an existing real guest was selected during booking, keep them as-is.
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
          // If not a placeholder, allocationGuestData stays undefined
          // and convertToRealReservation will skip guest creation
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
          check_in_date: newCheckIn.toISOString().split('T')[0],
          check_out_date: newCheckOut.toISOString().split('T')[0],
        };

        if (isRoomTypeChange && !isVirtualToReal) {
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
              check_in_date: newCheckIn.toISOString().split('T')[0],
              check_out_date: newCheckOut.toISOString().split('T')[0],
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

  const handleResizeReservation = useCallback(
    async (reservationId: number, side: 'start' | 'end', newDate: Date) => {
      try {
        const reservation = localReservations.find((r) => r.id === reservationId);
        if (!reservation) throw new Error('Reservation not found');

        const room = rooms.find((r) => r.id === reservation.room_id);
        const guest = guests.find((g) => g.id === reservation.guest_id);
        const newCheckIn = side === 'start' ? newDate : new Date(reservation.check_in_date);
        const newCheckOut = side === 'end' ? newDate : new Date(reservation.check_out_date);
        const daysDiff = Math.ceil(
          (newCheckOut.getTime() - newCheckIn.getTime()) / (24 * 60 * 60 * 1000)
        );

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
          check_in_date: newCheckIn.toISOString().split('T')[0],
          check_out_date: newCheckOut.toISOString().split('T')[0],
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
            const adults = reservation.adults ?? 1;
            const childrenCount = reservation.children_count ?? 0;
            const guestEntries = [
              ...Array(adults)
                .fill(null)
                .map(() => ({
                  name: guest?.display_name ?? 'Guest',
                  type: 'adult' as const,
                })),
              ...Array(childrenCount)
                .fill(null)
                .map((_, i) => ({
                  name: `Child ${i + 1}`,
                  type: 'child' as const,
                })),
            ];
            const newCharges = await unifiedPricingService.generateCharges({
              roomId: String(reservation.room_id),
              checkIn: newCheckIn,
              checkOut: newCheckOut,
              guests: guestEntries,
              hasPets: reservation.has_pets ?? false,
              parkingRequired: reservation.parking_required ?? false,
            });
            // Replace charges atomically
            await supabase.from('reservation_charges').delete().eq('reservation_id', reservationId);
            if (newCharges.length > 0) {
              await supabase.from('reservation_charges').insert(
                newCharges.map((c) => ({
                  reservation_id: reservationId,
                  charge_type: c.chargeType,
                  description: c.description,
                  quantity: c.quantity,
                  unit_price: c.unitPrice,
                  total: c.total,
                  vat_rate: c.vatRate ?? 0.13,
                  sort_order: c.sortOrder ?? 0,
                }))
              );
            }
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

  return {
    localReservations,
    handleMoveReservation,
    handleMoveReservationArrow,
    handleConfirmRoomChange,
    handleFreeUpgrade,
    handleResizeReservation,
    handleDrinksOrderComplete,
  };
}
