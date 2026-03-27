import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
import { CalendarEvent, Reservation, ReservationStatus } from '../../../lib/hotel/types';
import type { Room } from '../../../lib/queries/hooks/useRooms';
import ReservationPopup from './Reservations/ReservationPopup';
import ModernCreateBookingModal from './ModernCreateBookingModal';
import RoomChangeConfirmDialog from './RoomChangeConfirmDialog';
import HotelOrdersModal from './RoomService/HotelOrdersModal';
import hotelNotification from '../../../lib/notifications';
import { useHotelTimelineState } from '../../../lib/hooks/useHotelTimelineState';
import { useReservationActions } from '../../../lib/hooks/useReservationActions';
import SimpleDragCreateButton from './SimpleDragCreateButton';
// EnhancedDailyViewModal removed — operated on dropped reservation_daily_details table
import DragCreateOverlay from './DragCreateOverlay';
import { virtualRoomService } from '../../../lib/hotel/services/VirtualRoomService';
// unifiedPricingService removed — pricing now handled via reservation_charges
import { Button } from '../../ui/button';

import { TimelineHeader } from './Timeline/TimelineHeader';
import { RoomAvailabilityModal } from './Timeline/RoomAvailabilityModal';
import { FloorSection } from './Timeline/FloorSection';
import { RoomOverviewFloorSection } from './Timeline/RoomOverviewFloorSection';
import { useTimelineModals } from './useTimelineModals';
import { useTimelineDragCreate } from './useTimelineDragCreate';
import { useTimelineKeyboardShortcuts } from './useTimelineKeyboardShortcuts';

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
    async (
      id: number,
      updates: import('../../../lib/queries/hooks/useReservations').ReservationUpdateInput
    ) => {
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

  const timelineRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

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
    setCurrentDate,
    setOverviewDate,
  } = useHotelTimelineState();

  const {
    localReservations,
    handleMoveReservation,
    handleMoveReservationArrow,
    handleConfirmRoomChange,
    handleFreeUpgrade,
    handleResizeReservation,
    handleDrinksOrderComplete,
  } = useReservationActions({
    reservations,
    rooms,
    guests,
    roomChangeDialog,
    selectedReservation,
    showRoomChangeDialog,
    closeRoomChangeDialog,
    updateReservation,
  });

  // Modal state for hotel orders and availability
  const {
    showHotelOrdersModal,
    hotelOrdersReservation,
    openHotelOrdersModal,
    closeHotelOrdersModal,
    showAvailabilityModal,
    selectedAvailabilityDate,
    selectedAvailabilityData,
    openAvailabilityModal,
    closeAvailabilityModal,
  } = useTimelineModals();

  // Drag-create state and cell click handler
  const {
    dragCreate,
    dragCreatePreSelectedDates,
    clearDragCreatePreSelectedDates,
    handleDragCreateCellClick,
  } = useTimelineDragCreate({ rooms, handleRoomClick });

  // EnhancedDailyViewModal removed — operated on dropped reservation_daily_details table
  void 0; // showExpandedDailyView and expandedReservation state removed

  const [virtualRoomsWithReservations, setVirtualRoomsWithReservations] = useState<Room[]>([]);

  useEffect(() => {
    let cancelled = false;
    virtualRoomService
      .getVirtualRoomsWithReservations(currentDate)
      .then((rooms) => {
        if (!cancelled) setVirtualRoomsWithReservations(rooms);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [currentDate, localReservations]);

  const calculateContextMenuPosition = (e: React.MouseEvent) =>
    positionContextMenu(e.clientX, e.clientY);

  // No-op: EnhancedDailyViewModal removed (operated on dropped table)
  const handleShowExpandedDailyView = (_reservation: Reservation) => {
    // Intentionally empty — daily view feature removed with reservation_daily_details table
  };

  // Keyboard shortcuts
  useTimelineKeyboardShortcuts({
    dragCreate,
    isExpansionMode,
    isMoveMode,
    showReservationPopup,
    showCreateBooking,
    roomChangeDialog,
    currentDate,
    selectedReservation,
    handleNavigate,
    toggleExpansionMode,
    toggleMoveMode,
    exitAllModes,
    closeReservationPopup,
    closeCreateBooking,
    closeRoomChangeDialog,
    handleMoveReservationArrow,
  });

  const handleRoomClickWrapper = (room: Room, reservation?: Reservation) => {
    if (reservation) {
      handleReservationClick(reservation);
    } else {
      handleRoomClick(room);
    }
  };

  const selectedEvent: CalendarEvent | null = useMemo(() => {
    if (!selectedReservation) return null;
    const room = rooms.find((r) => r.id === selectedReservation.room_id);
    const guestName =
      selectedReservation.guests?.full_name ||
      `${selectedReservation.guests?.first_name ?? ''} ${selectedReservation.guests?.last_name ?? ''}`.trim() ||
      'Guest';
    const guest = guests.find((g) => g.id === selectedReservation.guest_id);
    return {
      id: `event-${selectedReservation.id}`,
      reservationId: String(selectedReservation.id),
      roomId: String(selectedReservation.room_id),
      title: guestName,
      start: new Date(selectedReservation.check_in_date),
      end: new Date(selectedReservation.check_out_date),
      resource: {
        status: (selectedReservation.reservation_statuses?.code ??
          'confirmed') as ReservationStatus,
        guestName: guest?.display_name || guestName,
        roomNumber: room?.room_number || 'Unknown',
        numberOfGuests: selectedReservation.number_of_guests ?? selectedReservation.adults ?? 1,
        hasPets: selectedReservation.has_pets || guest?.has_pets || false,
      },
    };
  }, [selectedReservation, rooms, guests]);

  const handleShowDrinksModalWrapper = (reservation: Reservation) => {
    openHotelOrdersModal(reservation);
    handleShowDrinksModal(reservation.id); // number
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
                  <input
                    type="date"
                    value={format(overviewDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const d = new Date(e.target.value + 'T00:00:00');
                      if (!isNaN(d.getTime())) setOverviewDate(d);
                    }}
                    className="h-9 rounded-md border border-gray-300 px-2 text-sm"
                    title="Jump to date"
                  />
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
              onDateSelect={setCurrentDate}
              rooms={rooms}
              reservations={localReservations}
              onAvailabilityClick={openAvailabilityModal}
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
              clearDragCreatePreSelectedDates();
              dragCreate.actions.disable();
            }}
            room={selectedRoom}
            currentDate={overviewDate}
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
              ? guests.find((g) => g.id === reservation.guest_id) || null
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
            onClose={closeHotelOrdersModal}
            onOrderComplete={(orderItems, total) => {
              handleDrinksOrderComplete(hotelOrdersReservation, orderItems, total);
              closeHotelOrdersModal();
            }}
          />
        )}

        <RoomAvailabilityModal
          isOpen={showAvailabilityModal}
          onClose={closeAvailabilityModal}
          date={selectedAvailabilityDate}
          availabilityData={selectedAvailabilityData}
        />

        {/* EnhancedDailyViewModal removed — operated on dropped reservation_daily_details table */}
      </div>
    </DndProvider>
  );
}
