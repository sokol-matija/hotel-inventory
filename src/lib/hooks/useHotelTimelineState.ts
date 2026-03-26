// useHotelTimelineState - Thin orchestrator composing focused timeline sub-hooks
import { useMemo, useCallback } from 'react';
import { HotelTimelineService } from '../hotel/services/HotelTimelineService';
import { Reservation } from '../hotel/types';
import type { Room } from '../queries/hooks/useRooms';
import { useReservations } from '../queries/hooks/useReservations';
import { useRooms } from '../queries/hooks/useRooms';
import { useFloorExpansion } from './useFloorExpansion';
import { useTimelineSelectionState } from './useTimelineSelectionState';
import { useTimelineInteractionModes } from './useTimelineInteractionModes';
import { useTimelineNavigation } from './useTimelineNavigation';

export type { HotelTimelineState, HotelTimelineActions };

interface HotelTimelineState {
  currentDate: Date;
  overviewDate: Date;
  expandedFloors: Record<number, boolean>;
  expandedOverviewFloors: Record<number, boolean>;
  selectedReservation: Reservation | null;
  showReservationPopup: boolean;
  selectedRoom: Room | null;
  showCreateBooking: boolean;
  roomChangeDialog: import('../hotel/services/HotelTimelineService').RoomChangeDialog;
  drinkModal: import('../hotel/services/HotelTimelineService').DrinkModalState;
  isDragCreateMode: boolean;
  isDragCreating: boolean;
  dragCreateStart: import('../hotel/services/HotelTimelineService').DragCreateState | null;
  dragCreateEnd: import('../hotel/services/HotelTimelineService').DragCreateState | null;
  dragCreatePreview: import('../hotel/services/HotelTimelineService').DragCreatePreview | null;
  dragCreateDates: { checkIn: Date; checkOut: Date } | null;
  isExpansionMode: boolean;
  isMoveMode: boolean;
  overviewPeriod: 'AM' | 'PM';
  roomsByFloor: Record<number, Room[]>;
  calendarEvents: import('../hotel/types').CalendarEvent[];
  currentOccupancy: import('../hotel/services/HotelTimelineService').OccupancyData;
  timelineStats: {
    totalReservations: number;
    occupiedRooms: number;
    availableRooms: number;
    checkInsToday: number;
    checkOutsToday: number;
  };
}

interface HotelTimelineActions {
  handleNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  handleOverviewNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  toggleFloor: (floor: number) => void;
  toggleOverviewFloor: (floor: number) => void;
  toggleOverviewPeriod: (period: 'AM' | 'PM') => void;
  handleReservationClick: (reservation: Reservation) => void;
  handleRoomClick: (room: Room) => void;
  closeReservationPopup: () => void;
  closeCreateBooking: () => void;
  showRoomChangeDialog: (reservationId: number, fromRoomId: number, toRoomId: number) => void;
  closeRoomChangeDialog: () => void;
  handleShowDrinksModal: (reservationId: number) => void;
  closeDrinksModal: () => void;
  toggleDragCreateMode: () => void;
  toggleExpansionMode: () => void;
  toggleMoveMode: () => void;
  exitAllModes: () => void;
  handleDragCreateStart: (roomId: string, dayIndex: number) => void;
  handleDragCreateMove: (roomId: string, dayIndex: number) => void;
  handleDragCreateEnd: () => void;
  clearDragCreate: () => void;
  positionContextMenu: (x: number, y: number) => { x: number; y: number };
  validateReservationMove: (
    reservation: Reservation,
    targetRoomId: number
  ) => { valid: boolean; error?: string };
}

export function useHotelTimelineState(): HotelTimelineState & HotelTimelineActions {
  const timelineService = HotelTimelineService.getInstance();
  const { data: reservations = [] } = useReservations();
  const { data: rooms = [] } = useRooms();

  const navigation = useTimelineNavigation({ reservations, rooms, timelineService });
  const floors = useFloorExpansion();
  const selection = useTimelineSelectionState();
  const modes = useTimelineInteractionModes({
    currentDate: navigation.currentDate,
    timelineService,
  });

  const roomsByFloor = useMemo(
    () => timelineService.getRoomsByFloor(rooms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms]
  );

  const positionContextMenu = useCallback(
    (x: number, y: number) => timelineService.positionContextMenu(x, y),
    [timelineService]
  );

  const validateReservationMove = useCallback(
    (reservation: Reservation, targetRoomId: number) =>
      timelineService.validateReservationMove(reservation, targetRoomId, reservations, rooms),
    [reservations, rooms, timelineService]
  );

  return {
    ...navigation,
    ...floors,
    ...selection,
    ...modes,
    roomsByFloor,
    positionContextMenu,
    validateReservationMove,
  };
}
