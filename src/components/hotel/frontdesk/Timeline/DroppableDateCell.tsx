import { format, startOfDay, differenceInCalendarDays } from 'date-fns';
import { useDrop } from 'react-dnd';
import { Reservation } from '../../../../lib/hotel/types';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { ItemTypes, DragItem } from './types';
import type { CellHighlight } from '../useTimelineDragCreate';

const EMPTY_RESERVATIONS: Reservation[] = [];

interface DroppableDateCellProps {
  room: Room;
  dayIndex: number;
  halfDayIndex: number;
  isSecondHalf: boolean;
  date: Date;
  onMoveReservation: (
    reservationId: number,
    newRoomId: number,
    newCheckIn: Date,
    newCheckOut: Date
  ) => void;
  existingReservations?: Reservation[];
  onCellClick?: (roomId: string, date: Date, isAM: boolean) => void;
  onCellHover?: (roomId: string, date: Date) => void;
  shouldHighlightCell?: (roomId: string, date: Date, isAM: boolean) => CellHighlight;
  dragNightCount?: number | null;
}

export function DroppableDateCell({
  room,
  dayIndex,
  halfDayIndex,
  isSecondHalf,
  date,
  onMoveReservation,
  existingReservations = EMPTY_RESERVATIONS,
  onCellClick,
  onCellHover,
  shouldHighlightCell,
  dragNightCount,
}: DroppableDateCellProps) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isAM = !isSecondHalf;
  const roomIdStr = room.id.toString();

  const hasExistingReservation = existingReservations.some((res) => {
    const resCheckInDate = startOfDay(new Date(res.check_in_date));
    const resCheckOutDate = startOfDay(new Date(res.check_out_date));
    const cellDate = startOfDay(date);
    const resStartDay = differenceInCalendarDays(resCheckInDate, cellDate);
    const resEndDay = differenceInCalendarDays(resCheckOutDate, cellDate);

    if (res.room_id === room.id && resStartDay <= dayIndex && resEndDay > dayIndex) {
      if (dayIndex === resStartDay && isSecondHalf) return true;
      if (dayIndex === resEndDay && !isSecondHalf) return true;
      if (dayIndex > resStartDay && dayIndex < resEndDay) return true;
    }
    return false;
  });

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.RESERVATION,
      drop: (item: DragItem) => {
        const isAllocationFromFloor5 = item.currentRoomFloor === 5;

        if (isAllocationFromFloor5) {
          onMoveReservation(item.reservationId, room.id, item.checkIn, item.checkOut);
        } else {
          const originalDuration = differenceInCalendarDays(item.checkOut, item.checkIn);

          if (isSecondHalf) {
            const newCheckIn = new Date(date);
            newCheckIn.setHours(15, 0, 0, 0);
            const newCheckOut = new Date(newCheckIn);
            newCheckOut.setDate(newCheckOut.getDate() + originalDuration);
            newCheckOut.setHours(11, 0, 0, 0);
            onMoveReservation(item.reservationId, room.id, newCheckIn, newCheckOut);
          } else {
            const newCheckOut = new Date(date);
            newCheckOut.setHours(11, 0, 0, 0);
            const newCheckIn = new Date(newCheckOut);
            newCheckIn.setDate(newCheckIn.getDate() - originalDuration);
            newCheckIn.setHours(15, 0, 0, 0);
            onMoveReservation(item.reservationId, room.id, newCheckIn, newCheckOut);
          }
        }
      },
      canDrop: (item: DragItem) => {
        const isSamePosition =
          item.currentRoomId === room.id &&
          new Date(item.checkIn).toDateString() === date.toDateString() &&
          ((isSecondHalf && new Date(item.checkIn).getHours() >= 12) ||
            (!isSecondHalf && new Date(item.checkIn).getHours() < 12));
        return !hasExistingReservation && !isSamePosition;
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [room, dayIndex, halfDayIndex, isSecondHalf, date, onMoveReservation, hasExistingReservation]
  );

  // Compute highlight once per render
  const highlight = shouldHighlightCell
    ? shouldHighlightCell(roomIdStr, date, isAM)
    : ('none' as const);

  const handleClick = (e: React.MouseEvent) => {
    if (hasExistingReservation) return;
    if (highlight !== 'none' || (isSecondHalf && !hasExistingReservation)) {
      e.preventDefault();
      onCellClick?.(roomIdStr, date, isAM);
    }
  };

  const highlightStyle: Record<CellHighlight, string> = {
    start:
      'bg-blue-500 ring-2 ring-blue-400/70 ring-offset-1 shadow-md shadow-blue-400/30 cursor-default transition-all duration-150',
    preview:
      'bg-blue-400/35 border-y border-blue-300/40 cursor-default transition-colors duration-100',
    selectable: isSecondHalf
      ? 'cursor-pointer border border-dashed border-blue-300/50 bg-blue-50/40 hover:bg-blue-100 hover:border-blue-400 transition-all duration-150'
      : 'cursor-pointer border border-dashed border-emerald-300/50 bg-emerald-50/40 hover:bg-emerald-100 hover:border-emerald-400 transition-all duration-150',
    none: '',
  };

  const showNightBadge = highlight === 'start' && dragNightCount != null && dragNightCount > 0;

  return (
    <div
      ref={(el) => {
        drop(el);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!hasExistingReservation && onCellClick && isSecondHalf) {
            onCellClick(roomIdStr, date, isAM);
          }
        }
      }}
      className={`relative h-12 border-r border-gray-200 transition-all duration-200 ${
        highlightStyle[highlight] ||
        (isOver && canDrop
          ? 'border-2 border-green-400 bg-green-100'
          : isOver && !canDrop
            ? 'border-2 border-red-400 bg-red-100'
            : isWeekend
              ? 'bg-orange-50/20'
              : isSecondHalf
                ? 'bg-green-50/20 hover:bg-green-50/40'
                : 'bg-red-50/20 hover:bg-red-50/40')
      }`}
      title={
        canDrop
          ? `Drop here to ${isSecondHalf ? 'move check-in to' : 'move check-out to'} ${format(date, 'MMM dd')} ${isSecondHalf ? '3:00 PM' : '11:00 AM'}`
          : isSecondHalf
            ? 'Check-in zone (PM) - Drop to move reservation start'
            : 'Check-out zone (AM) - Drop to move reservation end'
      }
      onClick={handleClick}
      onMouseEnter={() => onCellHover?.(roomIdStr, date)}
    >
      {/* Night count badge on start cell */}
      {showNightBadge && (
        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white shadow-lg shadow-blue-500/30">
            {dragNightCount} {dragNightCount === 1 ? 'night' : 'nights'}
          </div>
        </div>
      )}

      {isOver && canDrop && (
        <div
          className={`absolute inset-0 ${isSecondHalf ? 'border-2 border-green-400 bg-green-200' : 'border-2 border-red-400 bg-red-200'} flex items-center justify-center border-dashed`}
        >
          <span className={`text-xs font-bold ${isSecondHalf ? 'text-green-700' : 'text-red-700'}`}>
            {isSecondHalf ? '→ IN' : 'OUT ←'}
          </span>
        </div>
      )}

      {isOver && !canDrop && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full border-2 border-dashed border-red-500 bg-red-100/50">
            <div className="flex h-full w-full items-center justify-center text-xs text-red-500">
              ×
            </div>
          </div>
        </div>
      )}

      <div
        className={`absolute right-0 bottom-0 left-0 h-0.5 ${isSecondHalf ? 'bg-green-400' : 'bg-red-400'} opacity-60`}
      />
      <div
        className={`absolute top-0 right-0 px-1 text-xs text-gray-500 ${isSecondHalf ? 'text-green-600' : 'text-red-600'}`}
      >
        {isSecondHalf ? 'PM' : 'AM'}
      </div>
    </div>
  );
}
