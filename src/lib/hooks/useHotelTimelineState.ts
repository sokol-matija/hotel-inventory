// useHotelTimelineState - Consolidated state management for hotel timeline
// Manages all timeline modes, dates, UI states, and drag operations

import { useState, useMemo, useCallback } from 'react';
import { HotelTimelineService, TimelineContextMenu, DragCreateState, DragCreatePreview, RoomChangeDialog, DrinkModalState, OccupancyData } from '../hotel/services/HotelTimelineService';
import { CalendarEvent, Reservation, Room } from '../hotel/types';
import { useHotel } from '../hotel/state/SupabaseHotelContext';

export interface HotelTimelineState {
  // Date management
  currentDate: Date;
  overviewDate: Date;
  
  // Floor expansion states
  expandedFloors: Record<number, boolean>;
  expandedOverviewFloors: Record<number, boolean>;
  
  // Modal and popup states
  selectedReservation: Reservation | null;
  showReservationPopup: boolean;
  selectedRoom: Room | null;
  showCreateBooking: boolean;
  roomChangeDialog: RoomChangeDialog;
  drinkModal: DrinkModalState;
  
  // Drag create mode states
  isDragCreateMode: boolean;
  isDragCreating: boolean;
  dragCreateStart: DragCreateState | null;
  dragCreateEnd: DragCreateState | null;
  dragCreatePreview: DragCreatePreview | null;
  dragCreateDates: { checkIn: Date; checkOut: Date } | null;
  
  // Timeline mode states
  isExpansionMode: boolean;
  isMoveMode: boolean;
  
  // Computed states
  roomsByFloor: Record<number, Room[]>;
  calendarEvents: CalendarEvent[];
  currentOccupancy: OccupancyData;
  timelineStats: {
    totalReservations: number;
    occupiedRooms: number;
    availableRooms: number;
    checkInsToday: number;
    checkOutsToday: number;
  };
}

export interface HotelTimelineActions {
  // Date navigation
  handleNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  handleOverviewNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  
  // Floor expansion
  toggleFloor: (floor: number) => void;
  toggleOverviewFloor: (floor: number) => void;
  
  // Modal and popup actions
  handleReservationClick: (reservation: Reservation) => void;
  handleRoomClick: (room: Room) => void;
  closeReservationPopup: () => void;
  closeCreateBooking: () => void;
  showRoomChangeDialog: (reservationId: string, fromRoomId: string, toRoomId: string) => void;
  closeRoomChangeDialog: () => void;
  handleShowDrinksModal: (reservationId: string) => void;
  closeDrinksModal: () => void;
  
  // Mode toggles
  toggleDragCreateMode: () => void;
  toggleExpansionMode: () => void;
  toggleMoveMode: () => void;
  exitAllModes: () => void;
  
  // Drag create operations
  handleDragCreateStart: (roomId: string, dayIndex: number) => void;
  handleDragCreateMove: (roomId: string, dayIndex: number) => void;
  handleDragCreateEnd: () => void;
  clearDragCreate: () => void;
  
  // Utility functions
  positionContextMenu: (x: number, y: number) => { x: number; y: number };
  validateReservationMove: (reservation: Reservation, targetRoomId: string) => { valid: boolean; error?: string };
}

export function useHotelTimelineState(): HotelTimelineState & HotelTimelineActions {
  const timelineService = HotelTimelineService.getInstance();
  const { reservations, rooms, updateReservation, updateReservationStatus, deleteReservation } = useHotel();
  
  // Date states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [overviewDate, setOverviewDate] = useState(new Date());
  
  // Floor expansion states
  const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true
  });
  
  const [expandedOverviewFloors, setExpandedOverviewFloors] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true
  });
  
  // Modal and popup states
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showReservationPopup, setShowReservationPopup] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  
  const [roomChangeDialog, setRoomChangeDialog] = useState<RoomChangeDialog>({
    show: false,
    reservationId: '',
    fromRoomId: '',
    toRoomId: ''
  });
  
  const [drinkModal, setDrinkModal] = useState<DrinkModalState>({
    show: false,
    reservationId: ''
  });
  
  // Drag create mode states
  const [isDragCreateMode, setIsDragCreateMode] = useState(false);
  const [isDragCreating, setIsDragCreating] = useState(false);
  const [dragCreateStart, setDragCreateStart] = useState<DragCreateState | null>(null);
  const [dragCreateEnd, setDragCreateEnd] = useState<DragCreateState | null>(null);
  const [dragCreatePreview, setDragCreatePreview] = useState<DragCreatePreview | null>(null);
  const [dragCreateDates, setDragCreateDates] = useState<{ checkIn: Date; checkOut: Date } | null>(null);
  
  // Timeline mode states
  const [isExpansionMode, setIsExpansionMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  
  // Computed states
  const roomsByFloor = useMemo(() => timelineService.getRoomsByFloor(rooms), [rooms]);
  
  const calendarEvents = useMemo(() => 
    timelineService.generateCalendarEvents(reservations, currentDate, rooms),
    [reservations, currentDate, rooms]
  );
  
  const currentOccupancy = useMemo(() =>
    timelineService.calculateOccupancyData(reservations, overviewDate, rooms),
    [reservations, overviewDate, rooms]
  );
  
  const timelineStats = useMemo(() =>
    timelineService.getTimelineStats(reservations, currentDate, rooms),
    [reservations, currentDate, rooms]
  );
  
  // Date navigation actions
  const handleNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = timelineService.navigateTimeline(currentDate, action);
    setCurrentDate(newDate);
  }, [currentDate]);
  
  const handleOverviewNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = timelineService.navigateOverview(overviewDate, action);
    setOverviewDate(newDate);
  }, [overviewDate]);
  
  // Floor expansion actions
  const toggleFloor = useCallback((floor: number) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floor]: !prev[floor]
    }));
  }, []);
  
  const toggleOverviewFloor = useCallback((floor: number) => {
    setExpandedOverviewFloors(prev => ({
      ...prev,
      [floor]: !prev[floor]
    }));
  }, []);
  
  // Modal and popup actions
  const handleReservationClick = useCallback((reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowReservationPopup(true);
  }, []);
  
  const handleRoomClick = useCallback((room: Room) => {
    setSelectedRoom(room);
    setShowCreateBooking(true);
  }, []);
  
  const closeReservationPopup = useCallback(() => {
    setShowReservationPopup(false);
    setSelectedReservation(null);
  }, []);
  
  const closeCreateBooking = useCallback(() => {
    setShowCreateBooking(false);
    setSelectedRoom(null);
  }, []);
  
  const showRoomChangeDialog = useCallback((reservationId: string, fromRoomId: string, toRoomId: string) => {
    setRoomChangeDialog({
      show: true,
      reservationId,
      fromRoomId,
      toRoomId
    });
  }, []);
  
  const closeRoomChangeDialog = useCallback(() => {
    setRoomChangeDialog({
      show: false,
      reservationId: '',
      fromRoomId: '',
      toRoomId: ''
    });
  }, []);
  
  const handleShowDrinksModal = useCallback((reservationId: string) => {
    setDrinkModal({
      show: true,
      reservationId
    });
  }, []);
  
  const closeDrinksModal = useCallback(() => {
    setDrinkModal({
      show: false,
      reservationId: ''
    });
  }, []);
  
  // Mode toggle actions
  const exitAllModes = useCallback(() => {
    setIsDragCreateMode(false);
    setIsExpansionMode(false);
    setIsMoveMode(false);
    setIsDragCreating(false);
    setDragCreateStart(null);
    setDragCreateEnd(null);
    setDragCreatePreview(null);
    setDragCreateDates(null);
  }, []);
  
  const toggleDragCreateMode = useCallback(() => {
    const newMode = !isDragCreateMode;
    setIsDragCreateMode(newMode);
    
    if (newMode) {
      // Entering drag create mode - disable others
      setIsExpansionMode(false);
      setIsMoveMode(false);
    } else {
      // Exiting drag create mode - clear state
      setIsDragCreating(false);
      setDragCreateStart(null);
      setDragCreateEnd(null);
      setDragCreatePreview(null);
      setDragCreateDates(null);
    }
  }, [isDragCreateMode]);
  
  const toggleExpansionMode = useCallback(() => {
    const newMode = !isExpansionMode;
    setIsExpansionMode(newMode);
    
    if (newMode) {
      // Entering expansion mode - disable others
      setIsDragCreateMode(false);
      setIsMoveMode(false);
      setIsDragCreating(false);
      setDragCreateStart(null);
      setDragCreateEnd(null);
      setDragCreatePreview(null);
    }
  }, [isExpansionMode]);
  
  const toggleMoveMode = useCallback(() => {
    const newMode = !isMoveMode;
    setIsMoveMode(newMode);
    
    if (newMode) {
      // Entering move mode - disable others
      setIsDragCreateMode(false);
      setIsExpansionMode(false);
      setIsDragCreating(false);
      setDragCreateStart(null);
      setDragCreateEnd(null);
      setDragCreatePreview(null);
    }
  }, [isMoveMode]);
  
  // Drag create operations
  const handleDragCreateStart = useCallback((roomId: string, dayIndex: number) => {
    if (!isDragCreateMode) return;
    
    setIsDragCreating(true);
    setDragCreateStart({ roomId, dayIndex });
    setDragCreateEnd({ roomId, dayIndex });
    
    const preview = timelineService.calculateDragCreatePreview({ roomId, dayIndex }, { roomId, dayIndex });
    setDragCreatePreview(preview);
    
    if (preview) {
      const dates = timelineService.convertDayIndexToDates(preview.startDay, preview.endDay, currentDate);
      setDragCreateDates(dates);
    }
  }, [isDragCreateMode, currentDate]);
  
  const handleDragCreateMove = useCallback((roomId: string, dayIndex: number) => {
    if (!isDragCreating || !dragCreateStart) return;
    
    setDragCreateEnd({ roomId, dayIndex });
    
    const preview = timelineService.calculateDragCreatePreview(dragCreateStart, { roomId, dayIndex });
    setDragCreatePreview(preview);
    
    if (preview) {
      const dates = timelineService.convertDayIndexToDates(preview.startDay, preview.endDay, currentDate);
      setDragCreateDates(dates);
    }
  }, [isDragCreating, dragCreateStart, currentDate]);
  
  const handleDragCreateEnd = useCallback(() => {
    setIsDragCreating(false);
    // Keep preview and dates for booking creation
  }, []);
  
  const clearDragCreate = useCallback(() => {
    setIsDragCreating(false);
    setDragCreateStart(null);
    setDragCreateEnd(null);
    setDragCreatePreview(null);
    setDragCreateDates(null);
  }, []);
  
  // Utility functions
  const positionContextMenu = useCallback((x: number, y: number) => {
    return timelineService.positionContextMenu(x, y);
  }, []);
  
  const validateReservationMove = useCallback((reservation: Reservation, targetRoomId: string) => {
    return timelineService.validateReservationMove(reservation, targetRoomId, reservations, rooms);
  }, [reservations, rooms]);
  
  // Return combined state and actions
  return {
    // State
    currentDate,
    overviewDate,
    expandedFloors,
    expandedOverviewFloors,
    selectedReservation,
    showReservationPopup,
    selectedRoom,
    showCreateBooking,
    roomChangeDialog,
    drinkModal,
    isDragCreateMode,
    isDragCreating,
    dragCreateStart,
    dragCreateEnd,
    dragCreatePreview,
    dragCreateDates,
    isExpansionMode,
    isMoveMode,
    roomsByFloor,
    calendarEvents,
    currentOccupancy,
    timelineStats,
    
    // Actions
    handleNavigate,
    handleOverviewNavigate,
    toggleFloor,
    toggleOverviewFloor,
    handleReservationClick,
    handleRoomClick,
    closeReservationPopup,
    closeCreateBooking,
    showRoomChangeDialog,
    closeRoomChangeDialog,
    handleShowDrinksModal,
    closeDrinksModal,
    toggleDragCreateMode,
    toggleExpansionMode,
    toggleMoveMode,
    exitAllModes,
    handleDragCreateStart,
    handleDragCreateMove,
    handleDragCreateEnd,
    clearDragCreate,
    positionContextMenu,
    validateReservationMove
  };
}