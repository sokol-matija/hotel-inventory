import type { Reservation, ReservationUpdateInput } from '../queries/hooks/useReservations';
import type { Guest } from '../queries/hooks/useGuests';
import type { Room } from '../queries/hooks/useRooms';
import { OrderItem } from '../hotel/orderTypes';
import type { RoomChangeDialog } from '../hotel/services/HotelTimelineService';
import { useOptimisticReservations } from './reservation-actions/useOptimisticReservations';
import { useMoveReservation } from './reservation-actions/useMoveReservation';
import { useRoomChangeActions } from './reservation-actions/useRoomChangeActions';
import { useRoomServiceOrder } from './reservation-actions/useRoomServiceOrder';

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

/**
 * Thin orchestrator that composes the four focused sub-hooks and
 * returns the original interface expected by `HotelTimeline.tsx`.
 */
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

  const { localReservations, updateReservationInState } = useOptimisticReservations(reservations);

  const { handleMoveReservation, handleMoveReservationArrow, handleResizeReservation } =
    useMoveReservation({
      localReservations,
      rooms,
      guests,
      selectedReservation,
      showRoomChangeDialog,
      updateReservationInState,
      updateReservation,
    });

  const { handleConfirmRoomChange, handleFreeUpgrade } = useRoomChangeActions({
    localReservations,
    rooms,
    guests,
    roomChangeDialog,
    updateReservationInState,
    updateReservation,
    closeRoomChangeDialog,
  });

  const { handleDrinksOrderComplete } = useRoomServiceOrder({
    rooms,
    updateReservation,
  });

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
