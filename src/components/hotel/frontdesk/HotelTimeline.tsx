import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { addDays } from 'date-fns';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Maximize2,
  Minimize2,
  Move,
  ArrowLeftRight,
  Square,
  RefreshCw,
  MousePointer2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  useReservations,
  useUpdateReservation,
  useUpdateReservationStatus,
  useDeleteReservation,
} from '../../../lib/queries/hooks/useReservations';
import { useRooms } from '../../../lib/queries/hooks/useRooms';
import { useGuests } from '../../../lib/queries/hooks/useGuests';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queries/queryKeys';
import { format } from 'date-fns';
import { formatRoomNumber } from '../../../lib/hotel/calendarUtils';
import {
  CalendarEvent,
  ReservationStatus,
  Reservation,
  Room,
  Guest,
} from '../../../lib/hotel/types';
import ReservationPopup from './Reservations/ReservationPopup';
import ModernCreateBookingModal from './ModernCreateBookingModal';
import RoomChangeConfirmDialog from './RoomChangeConfirmDialog';
import HotelOrdersModal from './RoomService/HotelOrdersModal';
import hotelNotification from '../../../lib/notifications';
import { OrderItem } from '../../../lib/hotel/orderTypes';
import { useHotelTimelineState } from '../../../lib/hooks/useHotelTimelineState';
import { useSimpleDragCreate, DragCreateSelection } from '../../../lib/hooks/useSimpleDragCreate';
import SimpleDragCreateButton from './SimpleDragCreateButton';
// EnhancedDailyViewModal removed — operated on dropped reservation_daily_details table
import DragCreateOverlay from './DragCreateOverlay';
import { virtualRoomService } from '../../../lib/hotel/services/VirtualRoomService';
import { OptimisticUpdateService } from '../../../lib/hotel/services/OptimisticUpdateService';
// unifiedPricingService removed — pricing now handled via reservation_charges
import { Button } from '../../ui/button';

import { TimelineHeader } from './Timeline/TimelineHeader';
import { RoomAvailabilityModal } from './Timeline/RoomAvailabilityModal';
import { FloorSection } from './Timeline/FloorSection';
import { RoomOverviewFloorSection } from './Timeline/RoomOverviewFloorSection';
import { DayAvailability } from './Timeline/types';

interface HotelTimelineProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function HotelTimeline({
  isFullscreen = false,
  onToggleFullscreen,
}: HotelTimelineProps) {
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

  const refreshData = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });

  const updateReservation = useCallback(
    async (id: string, updates: Partial<Reservation>) => {
      await updateReservationMutation.mutateAsync({ id, updates });
    },
    [updateReservationMutation]
  );

  const updateReservationStatus = useCallback(
    async (id: string, status: string) => {
      await updateReservationStatusMutation.mutateAsync({
        id,
        status: status as ReservationStatus,
      });
    },
    [updateReservationStatusMutation]
  );

  const deleteReservation = useCallback(
    async (id: string) => {
      await deleteReservationMutation.mutateAsync(id);
    },
    [deleteReservationMutation]
  );

  const dragCreate = useSimpleDragCreate();
  const [dragCreatePreSelectedDates, setDragCreatePreSelectedDates] = useState<{
    checkIn: Date;
    checkOut: Date;
  } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [optimisticOverrides, setOptimisticOverrides] = useState<Map<string, Partial<Reservation>>>(
    new Map()
  );

  const localReservations = useMemo(
    () =>
      reservations.map((r) => {
        const overrides = optimisticOverrides.get(r.id);
        return overrides ? { ...r, ...overrides } : r;
      }),
    [reservations, optimisticOverrides]
  );

  const updateReservationInState = useCallback((id: string, updates: Partial<Reservation>) => {
    setOptimisticOverrides((prev) => new Map(prev).set(id, { ...prev.get(id), ...updates }));
  }, []);

  const {
    currentDate,
    overviewDate,
    expandedFloors,
    expandedOverviewFloors,
    selectedReservation,
    showReservationPopup,
    selectedRoom,
    showCreateBooking,
    roomChangeDialog,
    dragCreateDates,
    isExpansionMode,
    isMoveMode,
    overviewPeriod,
    roomsByFloor,
    currentOccupancy,
    handleNavigate,
    handleOverviewNavigate,
    toggleFloor,
    toggleOverviewFloor,
    toggleOverviewPeriod,
    handleReservationClick,
    handleRoomClick,
    closeReservationPopup,
    closeCreateBooking,
    showRoomChangeDialog,
    closeRoomChangeDialog,
    handleShowDrinksModal,
    toggleExpansionMode,
    toggleMoveMode,
    exitAllModes,
    clearDragCreate,
    positionContextMenu,
  } = useHotelTimelineState();

  const [showHotelOrdersModal, setShowHotelOrdersModal] = useState(false);
  const [hotelOrdersReservation, setHotelOrdersReservation] = useState<Reservation | null>(null);
  // EnhancedDailyViewModal removed — operated on dropped reservation_daily_details table
  void 0; // showExpandedDailyView and expandedReservation state removed
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState<Date | null>(null);
  const [selectedAvailabilityData, setSelectedAvailabilityData] = useState<DayAvailability | null>(
    null
  );
  const [virtualRoomsWithReservations, setVirtualRoomsWithReservations] = useState<Room[]>([]);

  useEffect(() => {
    virtualRoomService
      .getVirtualRoomsWithReservations(currentDate)
      .then(setVirtualRoomsWithReservations);
  }, [currentDate, localReservations]);

  const calculateContextMenuPosition = (e: React.MouseEvent) =>
    positionContextMenu(e.clientX, e.clientY);

  // No-op: EnhancedDailyViewModal removed (operated on dropped table)
  const handleShowExpandedDailyView = (_reservation: Reservation) => {
    // Intentionally empty — daily view feature removed with reservation_daily_details table
  };

  // Cancel drag-create on Escape
  const dragCreateActions = dragCreate.actions;
  const dragCreateIsSelecting = dragCreate.state.isSelecting;
  useEffect(() => {
    if (!dragCreateIsSelecting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dragCreateActions.cancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dragCreateIsSelecting, dragCreateActions]);

  // Keyboard shortcuts
  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const initKeyboardShortcuts = async () => {
      const { KeyboardShortcutService } =
        await import('../../../lib/hotel/services/KeyboardShortcutService');
      const shortcutService = KeyboardShortcutService.getInstance();
      shortcutService.updateContext({
        isModalOpen: showReservationPopup || showCreateBooking || roomChangeDialog.show,
        selectedReservations: selectedReservation ? [selectedReservation.id] : [],
        activeMode: dragCreate.state.isEnabled
          ? 'drag_create'
          : isExpansionMode
            ? 'expand'
            : isMoveMode
              ? 'move'
              : 'normal',
        currentDate,
      });

      const handleShortcut = (event: CustomEvent) => {
        const { action } = event.detail;
        switch (action) {
          case 'navigate_prev_day':
            handleNavigate('PREV');
            break;
          case 'navigate_next_day':
            handleNavigate('NEXT');
            break;
          case 'navigate_today':
            handleNavigate('TODAY');
            break;
          case 'toggle_drag_create':
            if (dragCreate.state.isEnabled) {
              dragCreate.actions.disable();
            } else {
              dragCreate.actions.enable();
            }
            break;
          case 'toggle_expansion':
            toggleExpansionMode();
            break;
          case 'toggle_move':
            toggleMoveMode();
            break;
          case 'escape':
            exitAllModes();
            if (showReservationPopup) closeReservationPopup();
            if (showCreateBooking) closeCreateBooking();
            if (roomChangeDialog.show) closeRoomChangeDialog();
            break;
          case 'move_reservation_left':
            handleMoveReservationArrow('left');
            break;
          case 'move_reservation_right':
            handleMoveReservationArrow('right');
            break;
        }
      };

      document.addEventListener('hotel-timeline-shortcut', handleShortcut as EventListener);
      removeListener = () =>
        document.removeEventListener('hotel-timeline-shortcut', handleShortcut as EventListener);
    };

    initKeyboardShortcuts();
    return () => removeListener?.();
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [
    dragCreate.state.isEnabled,
    isExpansionMode,
    isMoveMode,
    showReservationPopup,
    showCreateBooking,
    roomChangeDialog.show,
    currentDate,
    closeCreateBooking,
    closeReservationPopup,
    closeRoomChangeDialog,
    dragCreate.actions,
    exitAllModes,
    handleNavigate,
    selectedReservation,
    toggleExpansionMode,
    toggleMoveMode,
  ]);

  const handleRoomClickWrapper = (room: Room, reservation?: Reservation) => {
    if (reservation) {
      handleReservationClick(reservation);
    } else {
      handleRoomClick(room);
    }
  };

  const basicRoomAvailabilityCheck = (
    excludeReservationId: string,
    roomId: string,
    checkIn: Date,
    checkOut: Date
  ) => {
    const roomReservations = localReservations.filter(
      (r) => r.roomId === roomId && r.id !== excludeReservationId
    );
    const conflicts: Array<{
      type: string;
      severity: string;
      message: string;
      suggestedAlternatives?: Room[];
    }> = [];
    const checkInTime = checkIn.getTime();
    const checkOutTime = checkOut.getTime();

    for (const reservation of roomReservations) {
      const existingCheckIn = new Date(reservation.checkIn).getTime();
      const existingCheckOut = new Date(reservation.checkOut).getTime();
      if (!(checkOutTime <= existingCheckIn || checkInTime >= existingCheckOut)) {
        const guest = guests.find((g) => g.id === reservation.guestId);
        conflicts.push({
          type: 'overlapping_reservation',
          severity: 'error',
          message: `Room ${roomId} is already booked by ${guest?.fullName || 'Guest'} from ${new Date(existingCheckIn).toLocaleDateString()} to ${new Date(existingCheckOut).toLocaleDateString()}`,
        });
      }
    }

    return Promise.resolve({
      hasConflict: conflicts.length > 0,
      conflicts,
      warnings: [],
      suggestions: [],
    });
  };

  const handleMoveReservation = async (
    reservationId: string,
    newRoomId: string,
    newCheckIn: Date,
    newCheckOut: Date
  ) => {
    try {
      const reservation = localReservations.find((r) => r.id === reservationId);
      if (!reservation) throw new Error('Reservation not found');

      const oldRoom = rooms.find((r) => r.id === reservation.roomId);
      const newRoom = rooms.find((r) => r.id === newRoomId);
      if (!oldRoom || !newRoom) throw new Error('Room not found');

      const isVirtualToReal =
        virtualRoomService.isVirtualRoom(oldRoom) && !virtualRoomService.isVirtualRoom(newRoom);

      let allocationGuestData: Partial<Guest> | undefined;

      if (isVirtualToReal) {
        const guest = guests.find((g) => g.id === reservation.guestId);
        if (!guest) {
          hotelNotification.error('Allocation Failed', 'Guest not found for reservation');
          return;
        }
        const actualName = guest.lastName;
        const nameParts = actualName.trim().split(/\s+/);
        const actualFirstName = nameParts[0] || 'Guest';
        const actualLastName = nameParts.slice(1).join(' ') || actualFirstName;
        allocationGuestData = {
          firstName: actualFirstName,
          lastName: actualLastName,
          email: guest.email || undefined,
          phone: guest.phone || undefined,
          nationality: guest.nationality || undefined,
          dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth) : undefined,
        };
      }

      const conflictResult = await basicRoomAvailabilityCheck(
        reservationId,
        newRoomId,
        newCheckIn,
        newCheckOut
      );

      if (conflictResult.hasConflict) {
        hotelNotification.error(
          'Move Blocked!',
          conflictResult.conflicts.map((c) => c.message).join('\n'),
          5
        );
        const firstConflict = conflictResult.conflicts[0];
        if (firstConflict?.suggestedAlternatives?.length) {
          hotelNotification.info(
            'Alternative Rooms',
            `Try: ${firstConflict.suggestedAlternatives.map((r) => `Room ${r.number}`).join(', ')}`,
            7
          );
        }
        return;
      }

      if (conflictResult.warnings.length > 0) {
        hotelNotification.warning(
          'Move Warnings',
          conflictResult.warnings.map((w: { message: string }) => w.message).join('\n'),
          4
        );
      }

      const guest = guests.find((g) => g.id === reservation.guestId);
      const isRoomTypeChange = oldRoom.type !== newRoom.type;
      const updatedReservationData: Partial<Reservation> = {
        roomId: newRoomId,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
      };

      if (isRoomTypeChange) {
        showRoomChangeDialog(reservationId, reservation.roomId, newRoomId);
        return;
      }

      const optimisticService = OptimisticUpdateService.getInstance();
      let result: { success: boolean; error?: string };

      if (isVirtualToReal) {
        result = await optimisticService.optimisticUpdateReservation(
          reservationId,
          reservation,
          {
            roomId: newRoomId,
            checkIn: newCheckIn,
            checkOut: newCheckOut,
            status: 'confirmed' as ReservationStatus,
          },
          updateReservationInState,
          async () => {
            const allocationResult = await virtualRoomService.convertToRealReservation(
              reservationId,
              newRoomId,
              allocationGuestData!
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
          `${guest?.fullName || 'Guest'} allocated to ${formatRoomNumber(newRoom)} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`,
          5
        );
      } else {
        hotelNotification.success(
          'Reservation Moved Successfully!',
          `${guest?.fullName || 'Guest'} moved from ${formatRoomNumber(oldRoom)} to ${formatRoomNumber(newRoom)} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`,
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
  };

  const handleMoveReservationArrow = async (direction: 'left' | 'right') => {
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
      reservation.roomId,
      addDays(reservation.checkIn, daysToMove),
      addDays(reservation.checkOut, daysToMove)
    );
  };

  const handleConfirmRoomChange = async () => {
    if (!roomChangeDialog.show || !roomChangeDialog.reservationId) return;
    const reservation = localReservations.find((r) => r.id === roomChangeDialog.reservationId);
    const targetRoom = rooms.find((r) => r.id === roomChangeDialog.toRoomId);
    const currentRoom = rooms.find((r) => r.id === roomChangeDialog.fromRoomId);
    if (!reservation || !targetRoom || !currentRoom) return;

    try {
      // Pricing recalculation for room changes will be handled via reservation_charges (Phase 7+)
      const updatedReservationData = {
        roomId: targetRoom.id,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
      };

      const optimisticService = OptimisticUpdateService.getInstance();
      const result = await optimisticService.optimisticUpdateReservation(
        roomChangeDialog.reservationId,
        reservation,
        updatedReservationData,
        updateReservationInState,
        async () => {
          await updateReservation(roomChangeDialog.reservationId, updatedReservationData);
        }
      );

      if (result.success) {
        const guest = guests.find((g) => g.id === reservation.guestId);
        hotelNotification.success(
          'Room Change Successful!',
          `${guest?.fullName || 'Guest'} moved from ${formatRoomNumber(currentRoom)} to ${formatRoomNumber(targetRoom)} with updated pricing`,
          5
        );
      } else {
        hotelNotification.error('Move Failed!', result.error || 'Failed to move reservation', 5);
        return;
      }
      closeRoomChangeDialog();
    } catch {
      hotelNotification.error(
        'Failed to Change Room',
        'Unable to complete the room change. Please try again.',
        5
      );
    }
  };

  const handleFreeUpgrade = async () => {
    if (!roomChangeDialog.show || !roomChangeDialog.reservationId) return;
    const reservation = localReservations.find((r) => r.id === roomChangeDialog.reservationId);
    const targetRoom = rooms.find((r) => r.id === roomChangeDialog.toRoomId);
    const currentRoom = rooms.find((r) => r.id === roomChangeDialog.fromRoomId);
    if (!reservation || !targetRoom || !currentRoom) return;

    try {
      const updatedReservationData = {
        roomId: targetRoom.id,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
      };
      const optimisticService = OptimisticUpdateService.getInstance();
      const result = await optimisticService.optimisticUpdateReservation(
        roomChangeDialog.reservationId,
        reservation,
        updatedReservationData,
        updateReservationInState,
        async () => {
          await updateReservation(roomChangeDialog.reservationId, updatedReservationData);
        }
      );

      if (result.success) {
        const guest = guests.find((g) => g.id === reservation.guestId);
        hotelNotification.success(
          'Free Upgrade Applied!',
          `${guest?.fullName || 'Guest'} received a FREE UPGRADE from ${formatRoomNumber(currentRoom)} to ${formatRoomNumber(targetRoom)}!`,
          7
        );
      } else {
        hotelNotification.error(
          'Upgrade Failed!',
          result.error || 'Failed to apply free upgrade',
          5
        );
        return;
      }
      closeRoomChangeDialog();
    } catch {
      hotelNotification.error(
        'Failed to Apply Upgrade',
        'Unable to complete the free upgrade. Please try again.',
        5
      );
    }
  };

  const handleResizeReservation = async (
    reservationId: string,
    side: 'start' | 'end',
    newDate: Date
  ) => {
    try {
      const reservation = localReservations.find((r) => r.id === reservationId);
      if (!reservation) throw new Error('Reservation not found');

      const room = rooms.find((r) => r.id === reservation.roomId);
      const guest = guests.find((g) => g.id === reservation.guestId);
      const newCheckIn = side === 'start' ? newDate : reservation.checkIn;
      const newCheckOut = side === 'end' ? newDate : reservation.checkOut;
      const daysDiff = Math.ceil(
        (newCheckOut.getTime() - newCheckIn.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysDiff < 1) {
        hotelNotification.error('Invalid Reservation Length', 'Minimum stay is 1 day', 3);
        return;
      }

      const hasConflict = localReservations.some(
        (r) =>
          r.id !== reservationId &&
          r.roomId === reservation.roomId &&
          ((newCheckIn >= r.checkIn && newCheckIn < r.checkOut) ||
            (newCheckOut > r.checkIn && newCheckOut <= r.checkOut) ||
            (newCheckIn <= r.checkIn && newCheckOut >= r.checkOut))
      );

      if (hasConflict) {
        hotelNotification.error(
          'Booking Conflict',
          'Another reservation conflicts with these dates',
          4
        );
        return;
      }

      // Pricing recalculation for date changes will be handled via reservation_charges (Phase 7+)
      const updatedData = {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        numberOfNights: daysDiff,
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
        hotelNotification.success(
          'Reservation Updated!',
          `${guest?.fullName || 'Guest'} • ${room ? formatRoomNumber(room) : 'Room'} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`,
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
  };

  const selectedEvent: CalendarEvent | null = useMemo(() => {
    if (!selectedReservation) return null;
    const room = rooms.find((r) => r.id === selectedReservation.roomId);
    const guest = guests.find((g) => g.id === selectedReservation.guestId);
    return {
      id: `event-${selectedReservation.id}`,
      reservationId: selectedReservation.id,
      roomId: selectedReservation.roomId,
      title: guest?.fullName || 'Guest',
      start: selectedReservation.checkIn,
      end: selectedReservation.checkOut,
      resource: {
        status: selectedReservation.status,
        guestName: guest?.fullName || 'Guest',
        roomNumber: room?.number || 'Unknown',
        numberOfGuests: selectedReservation.numberOfGuests,
        hasPets: guest?.hasPets || false,
      },
    };
  }, [selectedReservation, rooms, guests]);

  const handleShowDrinksModalWrapper = (reservation: Reservation) => {
    setHotelOrdersReservation(reservation);
    setShowHotelOrdersModal(true);
    handleShowDrinksModal(reservation.id);
  };

  const handleAvailabilityClick = (date: Date, availabilityData: DayAvailability) => {
    setSelectedAvailabilityDate(date);
    setSelectedAvailabilityData(availabilityData);
    setShowAvailabilityModal(true);
  };

  const handleDragCreateCellClick = useCallback(
    (roomId: string, date: Date, isAM: boolean) => {
      if (!dragCreate.state.isEnabled) return;

      if (!dragCreate.state.isSelecting && !isAM) {
        dragCreate.actions.startSelection(roomId, date);
      } else if (dragCreate.state.isSelecting && dragCreate.state.currentSelection && isAM) {
        const completedSelection = dragCreate.actions.completeSelection(
          date
        ) as DragCreateSelection | null;
        if (completedSelection && completedSelection.checkOutDate) {
          const dragDates = {
            checkIn: completedSelection.checkInDate,
            checkOut: completedSelection.checkOutDate,
          };
          setDragCreatePreSelectedDates(dragDates);
          const room = rooms.find((r) => r.id === roomId);
          if (room) handleRoomClick(room);
        }
      }
    },
    [dragCreate, rooms, handleRoomClick]
  );

  const handleDrinksOrderComplete = async (orderItems: OrderItem[], orderTotal: number) => {
    if (!hotelOrdersReservation) return;
    try {
      const room = rooms.find((r) => r.id === hotelOrdersReservation.roomId);

      // Update notes on the reservation (charges are stored separately in reservation_charges)
      const updatedReservation = {
        notes:
          (hotelOrdersReservation.notes || '') +
          `\nRoom Service ordered (${new Date().toLocaleDateString()}): ${orderItems.map((item) => `${item.quantity}x ${item.itemName}`).join(', ')} - Total: €${orderTotal.toFixed(2)}`,
      };

      await updateReservation(hotelOrdersReservation.id, updatedReservation);
      hotelNotification.success(
        'Room Service Added to Bill',
        `€${orderTotal.toFixed(2)} in charges added to Room ${room ? formatRoomNumber(room) : hotelOrdersReservation.roomId} bill`,
        4
      );
      setShowHotelOrdersModal(false);
      setHotelOrdersReservation(null);
    } catch {
      hotelNotification.error(
        'Failed to Add Room Service',
        'Unable to add room service to room bill. Please try again.',
        5
      );
    }
  };

  // Shared props passed down to all FloorSection components
  const floorSectionSharedProps = {
    reservations: localReservations,
    guests,
    startDate: currentDate,
    onReservationClick: handleReservationClick,
    onMoveReservation: handleMoveReservation,
    isFullscreen,
    onUpdateReservationStatus: updateReservationStatus,
    onDeleteReservation: deleteReservation,
    isDragCreateMode: dragCreate.state.isEnabled,
    isDragCreating: dragCreate.state.isSelecting,
    isExpansionMode,
    isMoveMode,
    onResizeReservation: handleResizeReservation,
    onShowDrinksModal: handleShowDrinksModalWrapper,
    calculateContextMenuPosition,
    onCellClick: handleDragCreateCellClick,
    shouldHighlightCell: dragCreate.shouldHighlightCell,
    dragCreate,
    onShowExpandedDailyView: handleShowExpandedDailyView,
    cellRefs: cellRefs.current,
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
        <div className="flex h-full flex-col">
          {/* Mode status banner */}
          {(dragCreate.state.isEnabled || isExpansionMode || isMoveMode) && (
            <div
              className={`px-4 py-2 text-sm font-medium text-white ${dragCreate.state.isEnabled ? 'bg-blue-600' : isExpansionMode ? 'bg-green-600' : 'bg-purple-600'}`}
            >
              <div className="flex items-center justify-center space-x-2">
                {dragCreate.state.isEnabled && (
                  <>
                    <MousePointer2 className="h-4 w-4" />
                    <span>
                      Drag Create Mode: Click PM slots to start, AM slots to finish creating
                      reservations
                    </span>
                  </>
                )}
                {isExpansionMode && (
                  <>
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>
                      Expansion Mode: Use resize controls (← →) on reservations to extend or shorten
                      stays
                    </span>
                  </>
                )}
                {isMoveMode && (
                  <>
                    <Move className="h-4 w-4" />
                    <span>
                      Move Mode: Drag reservations or use arrow controls to move between rooms and
                      dates
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Top toolbar */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-900">Front Desk Timeline</h2>
                {isUpdating && (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-600">Updating...</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600">Hotel Porec - Timeline View</p>
            </div>

            <div className="flex items-center space-x-2">
              <SimpleDragCreateButton
                state={dragCreate.state}
                onToggle={() =>
                  dragCreate.state.isEnabled
                    ? dragCreate.actions.disable()
                    : dragCreate.actions.enable()
                }
              />

              <Button
                variant={isExpansionMode ? 'default' : 'outline'}
                onClick={toggleExpansionMode}
                className={`transition-all duration-200 ${isExpansionMode ? 'bg-green-600 text-white shadow-lg hover:bg-green-700' : 'hover:bg-green-50'}`}
                title={
                  isExpansionMode
                    ? 'Click to exit expand mode'
                    : 'Show resize controls on reservations'
                }
              >
                {isExpansionMode ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <ArrowLeftRight className="h-4 w-4" />
                )}
                {isExpansionMode ? 'Exit Expand Mode' : 'Expand Reservations'}
              </Button>

              <Button
                variant={isMoveMode ? 'default' : 'outline'}
                onClick={toggleMoveMode}
                className={`transition-all duration-200 ${isMoveMode ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700' : 'hover:bg-purple-50'}`}
                title={isMoveMode ? 'Click to exit move mode' : 'Show drag handles on reservations'}
              >
                {isMoveMode ? <Square className="h-4 w-4" /> : <Move className="h-4 w-4" />}
                {isMoveMode ? 'Exit Move Mode' : 'Move Reservations'}
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  hotelNotification.info('Refreshing Data', 'Loading latest reservations...', 2);
                  try {
                    await refreshData();
                    hotelNotification.success(
                      'Data Refreshed',
                      'All reservations and rooms updated successfully',
                      3
                    );
                  } catch {
                    hotelNotification.error(
                      'Refresh Failed',
                      'Unable to refresh data. Please try again.',
                      4
                    );
                  }
                }}
                disabled={isUpdating}
                title="Refresh all data from server"
              >
                <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {onToggleFullscreen && (
                <Button variant="outline" onClick={onToggleFullscreen}>
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </Button>
              )}
            </div>
          </div>

          {/* Room Status Overview */}
          {!isFullscreen && (
            <div className="bg-gray-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
                  <CalendarIcon className="h-5 w-5" />
                  <span>Room Status Overview - {format(overviewDate, 'MMMM dd, yyyy')}</span>
                </h3>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 rounded-lg border border-gray-300 bg-white p-1">
                    <Button
                      variant={overviewPeriod === 'AM' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => toggleOverviewPeriod('AM')}
                      title="Show rooms with checkout today"
                      className="text-xs"
                    >
                      AM
                    </Button>
                    <Button
                      variant={overviewPeriod === 'PM' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => toggleOverviewPeriod('PM')}
                      title="Show rooms with check-in today"
                      className="text-xs"
                    >
                      PM
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOverviewNavigate('PREV')}
                    title="Previous day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOverviewNavigate('TODAY')}
                    title="Today"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOverviewNavigate('NEXT')}
                    title="Next day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(roomsByFloor)
                  .filter(([floor]) => parseInt(floor) !== 5)
                  .map(([floor, floorRooms]) => (
                    <RoomOverviewFloorSection
                      key={`overview-${floor}`}
                      floor={parseInt(floor)}
                      rooms={floorRooms}
                      guests={guests}
                      isExpanded={expandedOverviewFloors[parseInt(floor)]}
                      onToggle={() => toggleOverviewFloor(parseInt(floor))}
                      occupancyData={currentOccupancy}
                      onRoomClick={handleRoomClickWrapper}
                      onUpdateReservationStatus={updateReservationStatus}
                      onDeleteReservation={deleteReservation}
                      onShowDrinksModal={handleShowDrinksModalWrapper}
                    />
                  ))}

                {virtualRoomsWithReservations.length > 0 && (
                  <RoomOverviewFloorSection
                    key="overview-unallocated"
                    floor={5}
                    rooms={virtualRoomsWithReservations}
                    guests={guests}
                    isExpanded={expandedOverviewFloors[5]}
                    onToggle={() => toggleOverviewFloor(5)}
                    occupancyData={currentOccupancy}
                    onRoomClick={handleRoomClickWrapper}
                    onUpdateReservationStatus={updateReservationStatus}
                    onDeleteReservation={deleteReservation}
                    onShowDrinksModal={handleShowDrinksModalWrapper}
                  />
                )}
              </div>
            </div>
          )}

          {/* Timeline grid */}
          <div ref={timelineRef} className="relative flex-1 overflow-auto">
            <TimelineHeader
              startDate={currentDate}
              onNavigate={handleNavigate}
              rooms={rooms}
              reservations={localReservations}
              onAvailabilityClick={handleAvailabilityClick}
            />

            <div>
              {Object.entries(roomsByFloor)
                .filter(([floor]) => parseInt(floor) !== 5)
                .map(([floor, floorRooms]) => (
                  <FloorSection
                    key={floor}
                    floor={parseInt(floor)}
                    rooms={floorRooms}
                    isExpanded={expandedFloors[parseInt(floor)]}
                    onToggle={() => toggleFloor(parseInt(floor))}
                    {...floorSectionSharedProps}
                  />
                ))}

              {virtualRoomsWithReservations.length > 0 && (
                <div className="sticky bottom-0 z-20 border-t-4 border-blue-500 bg-white shadow-2xl dark:bg-gray-900">
                  <FloorSection
                    key="timeline-unallocated"
                    floor={5}
                    rooms={virtualRoomsWithReservations}
                    isExpanded={expandedFloors[5]}
                    onToggle={() => toggleFloor(5)}
                    {...floorSectionSharedProps}
                  />
                </div>
              )}
            </div>

            <DragCreateOverlay
              dragCreateState={dragCreate.state}
              timelineRef={timelineRef}
              cellRefs={cellRefs.current}
            />
          </div>
        </div>

        {/* Modals */}
        <ReservationPopup
          isOpen={showReservationPopup}
          onClose={closeReservationPopup}
          event={selectedEvent}
          onStatusChange={(_reservationId, _newStatus) => {
            closeReservationPopup();
          }}
        />

        {selectedRoom && (
          <ModernCreateBookingModal
            isOpen={showCreateBooking}
            onClose={() => {
              closeCreateBooking();
              clearDragCreate();
              setDragCreatePreSelectedDates(null);
              dragCreate.actions.disable();
            }}
            room={selectedRoom}
            currentDate={currentDate}
            preSelectedDates={dragCreatePreSelectedDates || dragCreateDates}
          />
        )}

        {roomChangeDialog.show &&
          (() => {
            const reservation = localReservations.find(
              (r) => r.id === roomChangeDialog.reservationId
            );
            const currentRoom = rooms.find((r) => r.id === roomChangeDialog.fromRoomId);
            const targetRoom = rooms.find((r) => r.id === roomChangeDialog.toRoomId);
            const guest = reservation
              ? guests.find((g) => g.id === reservation.guestId) || null
              : null;
            if (!reservation || !currentRoom || !targetRoom) return null;
            return (
              <RoomChangeConfirmDialog
                isOpen={roomChangeDialog.show}
                onClose={closeRoomChangeDialog}
                currentRoom={currentRoom}
                targetRoom={targetRoom}
                reservation={reservation}
                guest={guest}
                onConfirmChange={handleConfirmRoomChange}
                onFreeUpgrade={handleFreeUpgrade}
              />
            );
          })()}

        {showHotelOrdersModal && hotelOrdersReservation && (
          <HotelOrdersModal
            reservation={hotelOrdersReservation}
            isOpen={showHotelOrdersModal}
            onClose={() => {
              setShowHotelOrdersModal(false);
              setHotelOrdersReservation(null);
            }}
            onOrderComplete={handleDrinksOrderComplete}
          />
        )}

        <RoomAvailabilityModal
          isOpen={showAvailabilityModal}
          onClose={() => {
            setShowAvailabilityModal(false);
            setSelectedAvailabilityDate(null);
            setSelectedAvailabilityData(null);
          }}
          date={selectedAvailabilityDate}
          availabilityData={selectedAvailabilityData}
        />

        {/* EnhancedDailyViewModal removed — operated on dropped reservation_daily_details table */}
      </div>
    </DndProvider>
  );
}
