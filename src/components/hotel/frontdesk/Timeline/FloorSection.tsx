import { startOfDay } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../../../lib/hotel/types';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { Badge } from '../../../ui/badge';
import { RoomRow } from './RoomRow';
import { SimpleDragCreateHook } from './types';

interface FloorSectionProps {
  floor: number;
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
  startDate: Date;
  isExpanded: boolean;
  onToggle: () => void;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation: (
    reservationId: number,
    newRoomId: number,
    newCheckIn: Date,
    newCheckOut: Date
  ) => void;
  isFullscreen?: boolean;
  onUpdateReservationStatus?: (id: number, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: number) => Promise<void>;
  isDragCreateMode?: boolean;
  isDragCreating?: boolean;
  dragCreateStart?: { roomId: string; dayIndex: number } | null;
  dragCreateEnd?: { roomId: string; dayIndex: number } | null;
  dragCreatePreview?: { roomId: string; startDay: number; endDay: number } | null;
  onDragCreateStart?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateMove?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateEnd?: (roomId: string, halfDayIndex: number) => void;
  isExpansionMode?: boolean;
  onResizeReservation?: (reservationId: number, side: 'start' | 'end', newDate: Date) => void;
  onShowDrinksModal?: (reservation: Reservation) => void;
  calculateContextMenuPosition?: (
    e: React.MouseEvent,
    menuWidth?: number,
    menuHeight?: number
  ) => { x: number; y: number };
  isMoveMode?: boolean;
  shouldHighlightCell?: SimpleDragCreateHook['shouldHighlightCell'];
  onCellClick?: (roomId: string, date: Date, isAM: boolean) => void;
  dragCreate?: SimpleDragCreateHook;
  onShowExpandedDailyView?: (reservation: Reservation) => void;
  cellRefs?: Map<string, HTMLElement>;
}

export function FloorSection({
  floor,
  rooms,
  reservations,
  guests,
  startDate,
  isExpanded,
  onToggle,
  onReservationClick,
  onMoveReservation,
  isFullscreen = false,
  onUpdateReservationStatus,
  onDeleteReservation,
  isDragCreateMode,
  isDragCreating,
  dragCreateStart,
  dragCreateEnd,
  dragCreatePreview,
  onDragCreateStart,
  onDragCreateMove,
  onDragCreateEnd,
  isExpansionMode,
  onResizeReservation,
  onShowDrinksModal,
  calculateContextMenuPosition,
  isMoveMode,
  shouldHighlightCell,
  onCellClick,
  dragCreate,
  onShowExpandedDailyView,
  cellRefs,
}: FloorSectionProps) {
  const floorName = floor === 4 ? 'Rooftop Premium' : `Floor ${floor}`;
  const today = new Date();
  const occupiedRooms = rooms.filter((room) =>
    reservations.some(
      (r) =>
        r.room_id === room.id &&
        startOfDay(today) >= startOfDay(new Date(r.check_in_date)) &&
        startOfDay(today) < startOfDay(new Date(r.check_out_date))
    )
  );
  const occupancyRate = rooms.length > 0 ? (occupiedRooms.length / rooms.length) * 100 : 0;

  return (
    <div className="border-b border-gray-200">
      <button
        type="button"
        className="relative z-10 w-full cursor-pointer border-b border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <span className={`font-semibold ${floor === 4 ? 'text-yellow-600' : 'text-gray-900'}`}>
              {floorName}
            </span>
            <Badge variant="secondary">{rooms.length} rooms</Badge>
            <Badge
              variant={
                occupancyRate > 80 ? 'default' : occupancyRate > 50 ? 'secondary' : 'destructive'
              }
            >
              {occupancyRate.toFixed(0)}% occupied
            </Badge>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div>
          {rooms.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              reservations={reservations}
              guests={guests}
              startDate={startDate}
              onReservationClick={onReservationClick}
              onMoveReservation={onMoveReservation}
              isFullscreen={isFullscreen}
              onUpdateReservationStatus={onUpdateReservationStatus}
              onDeleteReservation={onDeleteReservation}
              isDragCreateMode={isDragCreateMode}
              isDragCreating={isDragCreating}
              dragCreateStart={dragCreateStart}
              dragCreateEnd={dragCreateEnd}
              dragCreatePreview={dragCreatePreview}
              onDragCreateStart={onDragCreateStart}
              onDragCreateMove={onDragCreateMove}
              onDragCreateEnd={onDragCreateEnd}
              isExpansionMode={isExpansionMode}
              isMoveMode={isMoveMode}
              onResizeReservation={onResizeReservation}
              onShowDrinksModal={onShowDrinksModal}
              calculateContextMenuPosition={calculateContextMenuPosition}
              onCellClick={onCellClick}
              shouldHighlightCell={shouldHighlightCell}
              dragCreate={dragCreate}
              onShowExpandedDailyView={onShowExpandedDailyView}
              cellRefs={cellRefs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
