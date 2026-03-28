import { addDays } from 'date-fns';
import { Reservation, ReservationStatus } from '../../../../lib/hotel/types';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { formatRoomNumber, getRoomTypeDisplay } from '../../../../lib/hotel/calendarUtils';
import { Badge } from '../../../ui/badge';
import { TimelineCleaningIndicator } from '../TimelineCleaningIndicator';
import { ReservationBlock } from './ReservationBlock';
import { DroppableDateCell } from './DroppableDateCell';
import type { CellHighlight } from '../useTimelineDragCreate';

interface RoomRowProps {
  room: Room;
  reservations: Reservation[];
  guests: Guest[];
  startDate: Date;
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
  onEditReservation?: (id: number) => void;
  isExpansionMode?: boolean;
  onResizeReservation?: (reservationId: number, side: 'start' | 'end', newDate: Date) => void;
  onShowDrinksModal?: (reservation: Reservation) => void;
  calculateContextMenuPosition?: (
    e: React.MouseEvent,
    menuWidth?: number,
    menuHeight?: number
  ) => { x: number; y: number };
  isMoveMode?: boolean;
  onCellClick?: (roomId: string, date: Date, isAM: boolean) => void;
  onCellHover?: (roomId: string, date: Date) => void;
  shouldHighlightCell?: (roomId: string, date: Date, isAM: boolean) => CellHighlight;
  dragNightCount?: number | null;
}

export function RoomRow({
  room,
  reservations,
  guests,
  startDate,
  onReservationClick,
  onMoveReservation,
  isFullscreen = false,
  onUpdateReservationStatus,
  onDeleteReservation,
  onEditReservation,
  isExpansionMode,
  onResizeReservation,
  onShowDrinksModal,
  calculateContextMenuPosition,
  isMoveMode,
  onCellClick,
  onCellHover,
  shouldHighlightCell,
  dragNightCount,
}: RoomRowProps) {
  const roomReservations = reservations.filter((r) => r.room_id === room.id);

  return (
    <div className="relative border-b border-gray-100 hover:bg-gray-50">
      {/* Background grid for drop zones */}
      <div className="grid grid-cols-[180px_repeat(28,minmax(22px,1fr))]">
        <div className="flex h-12 items-center justify-between border-r border-gray-200 p-2">
          <div>
            <div className="text-sm font-medium text-gray-900">{formatRoomNumber(room)}</div>
            <div className="text-xs text-gray-500">{getRoomTypeDisplay(room)}</div>
          </div>
          <div className="flex items-center gap-2">
            <TimelineCleaningIndicator roomId={room.id.toString()} />
            {room.is_premium && (
              <Badge variant="secondary" className="text-xs">
                Premium
              </Badge>
            )}
          </div>
        </div>

        {Array.from({ length: 28 }, (_, halfDayIndex) => {
          const dayIndex = Math.floor(halfDayIndex / 2);
          const isSecondHalf = halfDayIndex % 2 === 1;
          const cellDate = addDays(startDate, dayIndex);
          return (
            <DroppableDateCell
              key={halfDayIndex}
              room={room}
              dayIndex={dayIndex}
              halfDayIndex={halfDayIndex}
              isSecondHalf={isSecondHalf}
              date={cellDate}
              onMoveReservation={onMoveReservation}
              existingReservations={reservations}
              onCellClick={onCellClick}
              onCellHover={onCellHover}
              shouldHighlightCell={shouldHighlightCell}
              dragNightCount={dragNightCount}
            />
          );
        })}
      </div>

      {/* Reservation blocks overlaid */}
      <div
        className={`pointer-events-none absolute inset-0 grid grid-cols-[180px_repeat(28,minmax(22px,1fr))] ${
          isExpansionMode ? 'overflow-visible' : 'overflow-hidden'
        }`}
      >
        {roomReservations.map((reservation) => {
          const guest = guests.find((g) => g.id === reservation.guest_id);
          return (
            <ReservationBlock
              key={reservation.id}
              reservation={reservation}
              guest={guest}
              room={room}
              startDate={startDate}
              onReservationClick={onReservationClick}
              onMoveReservation={onMoveReservation}
              isFullscreen={isFullscreen}
              onUpdateReservationStatus={onUpdateReservationStatus}
              onDeleteReservation={onDeleteReservation}
              onEditReservation={onEditReservation}
              isExpansionMode={isExpansionMode}
              isMoveMode={isMoveMode}
              onResizeReservation={onResizeReservation}
              onShowDrinksModal={onShowDrinksModal}
              calculateContextMenuPosition={calculateContextMenuPosition}
            />
          );
        })}
      </div>
    </div>
  );
}
