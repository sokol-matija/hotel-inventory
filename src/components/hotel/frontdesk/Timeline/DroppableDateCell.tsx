import { format, startOfDay } from 'date-fns';
import { useDrop } from 'react-dnd';
import { Reservation, Room } from '../../../../lib/hotel/types';
import { ItemTypes, DragItem, SimpleDragCreateHook } from './types';

const EMPTY_RESERVATIONS: Reservation[] = [];

interface DroppableDateCellProps {
  room: Room;
  dayIndex: number;
  halfDayIndex: number;
  isSecondHalf: boolean;
  date: Date;
  onMoveReservation: (
    reservationId: string,
    newRoomId: string,
    newCheckIn: Date,
    newCheckOut: Date
  ) => void;
  existingReservations?: Reservation[];
  isDragCreateMode?: boolean;
  isDragCreating?: boolean;
  dragCreateStart?: { roomId: string; dayIndex: number } | null;
  dragCreateEnd?: { roomId: string; dayIndex: number } | null;
  dragCreatePreview?: { roomId: string; startDay: number; endDay: number } | null;
  onDragCreateStart?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateMove?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateEnd?: (roomId: string, halfDayIndex: number) => void;
  onCellClick?: (roomId: string, date: Date, isAM: boolean) => void;
  shouldHighlightCell?: SimpleDragCreateHook['shouldHighlightCell'];
  dragCreate?: SimpleDragCreateHook;
  cellRefs?: Map<string, HTMLElement>;
}

export function DroppableDateCell({
  room,
  dayIndex,
  halfDayIndex,
  isSecondHalf,
  date,
  onMoveReservation,
  existingReservations = EMPTY_RESERVATIONS,
  isDragCreating,
  dragCreatePreview,
  onCellClick,
  shouldHighlightCell,
  dragCreate,
  cellRefs,
}: DroppableDateCellProps) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const hasExistingReservation = existingReservations.some((res) => {
    const resCheckInDate = startOfDay(res.checkIn);
    const resCheckOutDate = startOfDay(res.checkOut);
    const resStartDay = Math.floor(
      (resCheckInDate.getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000)
    );
    const resEndDay = Math.floor(
      (resCheckOutDate.getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000)
    );

    if (res.roomId === room.id && resStartDay <= dayIndex && resEndDay > dayIndex) {
      if (dayIndex === resStartDay && isSecondHalf) return true;
      if (dayIndex === resEndDay && !isSecondHalf) return true;
      if (dayIndex > resStartDay && dayIndex < resEndDay) return true;
    }
    return false;
  });

  const isInDragPreview =
    dragCreatePreview &&
    dragCreatePreview.roomId === room.id &&
    isDragCreating &&
    ((dayIndex === dragCreatePreview.startDay && isSecondHalf) ||
      (dayIndex > dragCreatePreview.startDay && dayIndex < dragCreatePreview.endDay) ||
      (dayIndex === dragCreatePreview.endDay && !isSecondHalf));

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.RESERVATION,
      drop: (item: DragItem) => {
        const isAllocationFromFloor5 = item.currentRoomFloor === 5;

        if (isAllocationFromFloor5) {
          onMoveReservation(item.reservationId, room.id, item.checkIn, item.checkOut);
        } else {
          const originalDuration = Math.ceil(
            (item.checkOut.getTime() - item.checkIn.getTime()) / (24 * 60 * 60 * 1000)
          );

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

  const handleClick = (e: React.MouseEvent) => {
    if (hasExistingReservation) return;
    if (shouldHighlightCell && shouldHighlightCell(room.id, date, !isSecondHalf) !== 'none') {
      e.preventDefault();
      onCellClick?.(room.id, date, !isSecondHalf);
    }
  };

  const getSimpleDragCreateStyle = () => {
    if (!shouldHighlightCell) return '';
    const highlightType = shouldHighlightCell(room.id, date, !isSecondHalf);
    switch (highlightType) {
      case 'selectable':
        return !isSecondHalf
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-400 cursor-pointer hover:from-emerald-100 hover:to-emerald-200 hover:shadow-lg hover:shadow-emerald-200/50 transition-all duration-200'
          : 'bg-gradient-to-br from-sky-50 to-sky-100 border-2 border-sky-400 cursor-pointer hover:from-sky-100 hover:to-sky-200 hover:shadow-lg hover:shadow-sky-200/50 transition-all duration-200';
      case 'preview':
        return 'bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 border border-blue-300 opacity-80';
      default:
        return '';
    }
  };

  const handleMouseEnter = () => {
    if (dragCreate?.actions?.setHoverPreview && dragCreate?.state?.isSelecting) {
      dragCreate.actions.setHoverPreview(room.id, date, !isSecondHalf);
    }
  };

  const handleMouseLeave = () => {
    if (dragCreate?.actions?.clearHoverPreview && dragCreate?.state?.isSelecting) {
      dragCreate.actions.clearHoverPreview();
    }
  };

  const cellKey = `${room.id}-${date.toISOString().split('T')[0]}-${isSecondHalf ? 'PM' : 'AM'}`;

  return (
    <div
      ref={(el) => {
        drop(el);
        if (el && cellRefs) cellRefs.set(cellKey, el);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (
            !hasExistingReservation &&
            onCellClick &&
            shouldHighlightCell &&
            shouldHighlightCell(room.id, date, !isSecondHalf) !== 'none'
          ) {
            onCellClick(room.id, date, !isSecondHalf);
          }
        }
      }}
      className={`relative h-12 border-r border-gray-200 transition-all duration-200 ${
        getSimpleDragCreateStyle() ||
        (isInDragPreview
          ? 'border-2 border-blue-400 bg-blue-200'
          : isOver && canDrop
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
