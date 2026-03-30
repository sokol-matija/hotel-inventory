import { useState, useMemo, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CalendarEvent, Reservation, ReservationStatus } from '../../../../lib/hotel/types';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { useHotelTimelineState } from '../../../../lib/hooks/useHotelTimelineState';
import { useReservationActions } from '../../../../lib/hooks/useReservationActions';
import { useTimelineModals } from '../useTimelineModals';
import { useTimelineDragCreate } from '../useTimelineDragCreate';
import { useTimelineKeyboardShortcuts } from '../useTimelineKeyboardShortcuts';
import { useHotelTimelineData } from './useHotelTimelineData';
import { TimelineModeBanner } from './TimelineModeBanner';
import { TimelineToolbar } from './TimelineToolbar';
import { RoomStatusOverview } from './RoomStatusOverview';
import { TimelineGrid } from './TimelineGrid';
import { TimelineModals } from './TimelineModals';

interface HotelTimelineProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function HotelTimeline({
  isFullscreen = false,
  onToggleFullscreen,
}: HotelTimelineProps) {
  const timelineState = useHotelTimelineState();
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
    positionContextMenu,
    setCurrentDate,
    setOverviewDate,
  } = timelineState;

  const {
    reservations,
    rooms,
    guests,
    isUpdating,
    refreshData,
    updateReservation,
    updateReservationStatus,
    deleteReservation,
    virtualRoomsWithReservations,
  } = useHotelTimelineData(currentDate);

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

  const dragCreate = useTimelineDragCreate({ rooms, handleRoomClick });

  const [editReservationId, setEditReservationId] = useState<number | null>(null);

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

  const timelineRef = useRef<HTMLDivElement>(null);

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
    handleShowDrinksModal(reservation.id);
  };

  const calculateContextMenuPosition = (e: React.MouseEvent) =>
    positionContextMenu(e.clientX, e.clientY);

  const floorSectionSharedProps = {
    reservations: localReservations,
    guests,
    startDate: currentDate,
    onReservationClick: handleReservationClick,
    onMoveReservation: handleMoveReservation,
    isFullscreen,
    onUpdateReservationStatus: updateReservationStatus,
    onDeleteReservation: deleteReservation,
    onEditReservation: setEditReservationId,
    isExpansionMode,
    isMoveMode,
    onResizeReservation: handleResizeReservation,
    onShowDrinksModal: handleShowDrinksModalWrapper,
    calculateContextMenuPosition,
    onCellClick: dragCreate.handleCellClick,
    onCellHover: dragCreate.handleCellHover,
    shouldHighlightCell: dragCreate.shouldHighlightCell,
    dragNightCount: dragCreate.nightCount,
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
        <div className="flex h-full flex-col">
          <TimelineModeBanner
            isDragCreateEnabled={dragCreate.state.isEnabled}
            isDragCreateSelecting={dragCreate.state.isSelecting}
            nightCount={dragCreate.nightCount}
            isExpansionMode={isExpansionMode}
            isMoveMode={isMoveMode}
          />

          <TimelineToolbar
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
            isUpdating={isUpdating}
            dragCreateState={dragCreate.state}
            onToggleDragCreate={() =>
              dragCreate.state.isEnabled
                ? dragCreate.actions.disable()
                : dragCreate.actions.enable()
            }
            isExpansionMode={isExpansionMode}
            onToggleExpansionMode={toggleExpansionMode}
            isMoveMode={isMoveMode}
            onToggleMoveMode={toggleMoveMode}
            onRefresh={refreshData}
          />

          {!isFullscreen && (
            <RoomStatusOverview
              overviewDate={overviewDate}
              overviewPeriod={overviewPeriod}
              onToggleOverviewPeriod={toggleOverviewPeriod}
              onOverviewNavigate={handleOverviewNavigate}
              onSetOverviewDate={setOverviewDate}
              roomsByFloor={roomsByFloor}
              expandedOverviewFloors={expandedOverviewFloors}
              onToggleOverviewFloor={toggleOverviewFloor}
              guests={guests}
              currentOccupancy={currentOccupancy}
              virtualRoomsWithReservations={virtualRoomsWithReservations}
              onRoomClick={handleRoomClickWrapper}
              onUpdateReservationStatus={updateReservationStatus}
              onDeleteReservation={deleteReservation}
              onShowDrinksModal={handleShowDrinksModalWrapper}
            />
          )}

          <TimelineGrid
            timelineRef={timelineRef}
            currentDate={currentDate}
            rooms={rooms}
            localReservations={localReservations}
            roomsByFloor={roomsByFloor}
            expandedFloors={expandedFloors}
            onToggleFloor={toggleFloor}
            onNavigate={handleNavigate}
            onDateSelect={setCurrentDate}
            onAvailabilityClick={openAvailabilityModal}
            virtualRoomsWithReservations={virtualRoomsWithReservations}
            floorSectionSharedProps={floorSectionSharedProps}
          />
        </div>

        <TimelineModals
          showReservationPopup={showReservationPopup}
          onCloseReservationPopup={closeReservationPopup}
          selectedEvent={selectedEvent}
          showCreateBooking={showCreateBooking}
          onCloseCreateBooking={closeCreateBooking}
          selectedRoom={selectedRoom}
          overviewDate={overviewDate}
          preSelectedDates={dragCreate.preSelectedDates}
          onClearPreSelectedDates={dragCreate.clearPreSelectedDates}
          onDisableDragCreate={dragCreate.actions.disable}
          roomChangeDialog={roomChangeDialog}
          onCloseRoomChangeDialog={closeRoomChangeDialog}
          localReservations={localReservations}
          rooms={rooms}
          guests={guests}
          onConfirmRoomChange={handleConfirmRoomChange}
          onFreeUpgrade={handleFreeUpgrade}
          showHotelOrdersModal={showHotelOrdersModal}
          hotelOrdersReservation={hotelOrdersReservation}
          onCloseHotelOrdersModal={closeHotelOrdersModal}
          onDrinksOrderComplete={handleDrinksOrderComplete}
          showAvailabilityModal={showAvailabilityModal}
          onCloseAvailabilityModal={closeAvailabilityModal}
          selectedAvailabilityDate={selectedAvailabilityDate}
          selectedAvailabilityData={selectedAvailabilityData}
          editReservationId={editReservationId}
          onCloseEditReservation={() => setEditReservationId(null)}
        />
      </div>
    </DndProvider>
  );
}
