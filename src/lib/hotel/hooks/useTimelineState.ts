// useTimelineState - Timeline state management hook
// Manages all timeline-related state and computed values

import { useState, useMemo, useCallback } from 'react';
import { TimelineService, TimelineDate, DragCreateOperation, RoomChangeOperation } from '../services/TimelineService';
import { Room, Reservation } from '../types';

export interface TimelineState {
  // Core timeline state
  currentDate: Date;
  expandedFloors: Record<number, boolean>;
  expandedOverviewFloors: Record<number, boolean>;
  
  // Modal states
  selectedReservation: Reservation | null;
  showReservationPopup: boolean;
  selectedRoom: Room | null;
  showCreateBooking: boolean;
  overviewDate: Date;
  
  // Interaction modes
  isDragCreateMode: boolean;
  isDragCreating: boolean;
  isExpansionMode: boolean;
  isMoveMode: boolean;
  
  // Drag-to-create state
  dragCreateStart: { roomId: string; dayIndex: number } | null;
  dragCreateEnd: { roomId: string; dayIndex: number } | null;
  dragCreatePreview: { roomId: string; startDay: number; endDay: number } | null;
  dragCreateDates: { checkIn: Date; checkOut: Date } | null;
  
  // Room change dialog state
  roomChangeDialog: {
    show: boolean;
    reservationId: string;
    currentRoom: Room | null;
    targetRoom: Room | null;
    newCheckIn: Date | null;
    newCheckOut: Date | null;
    reservation: Reservation | null;
    guest: any;
  };
  
  // Hotel orders modal state
  showHotelOrdersModal: boolean;
  hotelOrdersReservation: Reservation | null;
}

const initialState: TimelineState = {
  currentDate: new Date(),
  expandedFloors: { 1: true, 2: true, 3: true, 4: true },
  expandedOverviewFloors: { 1: true, 2: true, 3: true, 4: true },
  selectedReservation: null,
  showReservationPopup: false,
  selectedRoom: null,
  showCreateBooking: false,
  overviewDate: new Date(),
  isDragCreateMode: false,
  isDragCreating: false,
  isExpansionMode: false,
  isMoveMode: false,
  dragCreateStart: null,
  dragCreateEnd: null,
  dragCreatePreview: null,
  dragCreateDates: null,
  roomChangeDialog: {
    show: false,
    reservationId: '',
    currentRoom: null,
    targetRoom: null,
    newCheckIn: null,
    newCheckOut: null,
    reservation: null,
    guest: null
  },
  showHotelOrdersModal: false,
  hotelOrdersReservation: null
};

export function useTimelineState(reservations: Reservation[]) {
  const [state, setState] = useState<TimelineState>(initialState);
  const timelineService = TimelineService.getInstance();

  // Computed values
  const timelineDates = useMemo(() => 
    timelineService.getTimelineDates(state.currentDate, 14),
    [state.currentDate, timelineService]
  );

  const roomsGroupedByFloor = useMemo(() => 
    timelineService.getRoomsGroupedByFloor(),
    [timelineService]
  );

  const occupancyStats = useMemo(() => 
    timelineService.getRoomOccupancyStats(state.currentDate, 14, reservations),
    [state.currentDate, reservations, timelineService]
  );

  const currentDragCreateOperation = useMemo((): DragCreateOperation | null => {
    if (!state.dragCreateStart || !state.dragCreateEnd) return null;
    
    return timelineService.validateDragCreate(
      state.dragCreateStart.roomId,
      state.dragCreateStart.dayIndex,
      state.dragCreateEnd.dayIndex,
      state.currentDate,
      reservations
    );
  }, [state.dragCreateStart, state.dragCreateEnd, state.currentDate, reservations, timelineService]);

  // State updaters
  const updateState = useCallback(<K extends keyof TimelineState>(
    updates: Pick<TimelineState, K>
  ) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePartialState = useCallback(<K extends keyof TimelineState>(
    key: K,
    partialUpdate: Partial<TimelineState[K]>
  ) => {
    setState(prev => ({
      ...prev,
      [key]: { ...prev[key], ...partialUpdate }
    }));
  }, []);

  // Timeline navigation
  const navigateTimeline = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = timelineService.navigateTimeline(state.currentDate, action);
    updateState({ currentDate: newDate });
  }, [state.currentDate, timelineService, updateState]);

  // Floor expansion toggle
  const toggleFloorExpansion = useCallback((floor: number, isOverview: boolean = false) => {
    const targetKey = isOverview ? 'expandedOverviewFloors' : 'expandedFloors';
    setState(prev => ({
      ...prev,
      [targetKey]: {
        ...prev[targetKey],
        [floor]: !prev[targetKey][floor]
      }
    }));
  }, []);

  // Modal management
  const openReservationPopup = useCallback((reservation: Reservation) => {
    updateState({
      selectedReservation: reservation,
      showReservationPopup: true
    });
  }, [updateState]);

  const closeReservationPopup = useCallback(() => {
    updateState({
      selectedReservation: null,
      showReservationPopup: false
    });
  }, [updateState]);

  const openCreateBooking = useCallback((room: Room, dates?: { checkIn: Date; checkOut: Date }) => {
    updateState({
      selectedRoom: room,
      showCreateBooking: true,
      dragCreateDates: dates || null
    });
  }, [updateState]);

  const closeCreateBooking = useCallback(() => {
    updateState({
      selectedRoom: null,
      showCreateBooking: false,
      dragCreateDates: null
    });
  }, [updateState]);

  const openHotelOrders = useCallback((reservation: Reservation) => {
    updateState({
      hotelOrdersReservation: reservation,
      showHotelOrdersModal: true
    });
  }, [updateState]);

  const closeHotelOrders = useCallback(() => {
    updateState({
      hotelOrdersReservation: null,
      showHotelOrdersModal: false
    });
  }, [updateState]);

  // Drag-to-create operations
  const startDragCreate = useCallback((roomId: string, dayIndex: number) => {
    updateState({
      isDragCreating: true,
      dragCreateStart: { roomId, dayIndex },
      dragCreateEnd: null,
      dragCreatePreview: null
    });
  }, [updateState]);

  const updateDragCreate = useCallback((roomId: string, dayIndex: number) => {
    if (!state.dragCreateStart) return;
    
    const startDay = Math.min(state.dragCreateStart.dayIndex, dayIndex);
    const endDay = Math.max(state.dragCreateStart.dayIndex, dayIndex);
    
    updateState({
      dragCreateEnd: { roomId, dayIndex },
      dragCreatePreview: {
        roomId: state.dragCreateStart.roomId,
        startDay,
        endDay
      }
    });
  }, [state.dragCreateStart, updateState]);

  const finalizeDragCreate = useCallback(() => {
    if (!currentDragCreateOperation?.isValid) {
      // Invalid operation, reset state
      resetDragCreate();
      return;
    }

    // Open booking modal with the drag-created dates
    const room = roomsGroupedByFloor[1]?.find(r => r.id === currentDragCreateOperation.roomId) ||
                 roomsGroupedByFloor[2]?.find(r => r.id === currentDragCreateOperation.roomId) ||
                 roomsGroupedByFloor[3]?.find(r => r.id === currentDragCreateOperation.roomId) ||
                 roomsGroupedByFloor[4]?.find(r => r.id === currentDragCreateOperation.roomId);
    
    if (room) {
      openCreateBooking(room, {
        checkIn: currentDragCreateOperation.checkIn,
        checkOut: currentDragCreateOperation.checkOut
      });
    }
    
    resetDragCreate();
  }, [currentDragCreateOperation, roomsGroupedByFloor, openCreateBooking]);

  const resetDragCreate = useCallback(() => {
    updateState({
      isDragCreating: false,
      dragCreateStart: null,
      dragCreateEnd: null,
      dragCreatePreview: null,
      dragCreateDates: null
    });
  }, [updateState]);

  // Room change operations
  const openRoomChangeDialog = useCallback((
    reservationId: string,
    currentRoom: Room,
    targetRoom: Room,
    newCheckIn: Date,
    newCheckOut: Date,
    reservation: Reservation,
    guest: any
  ) => {
    updateState({
      roomChangeDialog: {
        show: true,
        reservationId,
        currentRoom,
        targetRoom,
        newCheckIn,
        newCheckOut,
        reservation,
        guest
      }
    });
  }, [updateState]);

  const closeRoomChangeDialog = useCallback(() => {
    updateState({
      roomChangeDialog: {
        show: false,
        reservationId: '',
        currentRoom: null,
        targetRoom: null,
        newCheckIn: null,
        newCheckOut: null,
        reservation: null,
        guest: null
      }
    });
  }, [updateState]);

  // Mode toggles
  const toggleDragCreateMode = useCallback(() => {
    updateState({
      isDragCreateMode: !state.isDragCreateMode,
      isExpansionMode: false,
      isMoveMode: false
    });
    if (state.isDragCreating) {
      resetDragCreate();
    }
  }, [state.isDragCreateMode, state.isDragCreating, updateState, resetDragCreate]);

  const toggleExpansionMode = useCallback(() => {
    updateState({
      isExpansionMode: !state.isExpansionMode,
      isDragCreateMode: false,
      isMoveMode: false
    });
  }, [state.isExpansionMode, updateState]);

  const toggleMoveMode = useCallback(() => {
    updateState({
      isMoveMode: !state.isMoveMode,
      isDragCreateMode: false,
      isExpansionMode: false
    });
  }, [state.isMoveMode, updateState]);

  return {
    // State
    state,
    
    // Computed values
    timelineDates,
    roomsGroupedByFloor,
    occupancyStats,
    currentDragCreateOperation,
    
    // Actions
    navigateTimeline,
    toggleFloorExpansion,
    
    // Modal management
    openReservationPopup,
    closeReservationPopup,
    openCreateBooking,
    closeCreateBooking,
    openHotelOrders,
    closeHotelOrders,
    
    // Drag-to-create
    startDragCreate,
    updateDragCreate,
    finalizeDragCreate,
    resetDragCreate,
    
    // Room change
    openRoomChangeDialog,
    closeRoomChangeDialog,
    
    // Mode toggles
    toggleDragCreateMode,
    toggleExpansionMode,
    toggleMoveMode,
    
    // Direct state updates (for complex cases)
    updateState,
    updatePartialState
  };
}