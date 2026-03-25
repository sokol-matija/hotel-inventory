import React, { useState, useRef, useEffect } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { useDrag } from 'react-dnd';
import { gsap } from 'gsap';
import { Users, Baby, Dog, Move, Plus } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../../../lib/hotel/types';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { RESERVATION_STATUS_COLORS } from '../../../../lib/hotel/calendarUtils';
import { getCountryFlag } from '../../../../lib/hotel/countryFlags';
import LabelBadge from '../../shared/LabelBadge';
import { ReservationContextMenu } from './ReservationContextMenu';
import { ItemTypes, SimpleDragCreateHook } from './types';

interface ReservationBlockProps {
  reservation: Reservation;
  guest: Guest | undefined;
  room: Room;
  startDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation?: (
    reservationId: string,
    newRoomId: string,
    newCheckIn: Date,
    newCheckOut: Date
  ) => void;
  isFullscreen?: boolean;
  onUpdateReservationStatus?: (id: string, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: string) => Promise<void>;
  isExpansionMode?: boolean;
  isMoveMode?: boolean;
  onResizeReservation?: (reservationId: string, side: 'start' | 'end', newDate: Date) => void;
  onShowDrinksModal?: (reservation: Reservation) => void;
  calculateContextMenuPosition?: (
    e: React.MouseEvent,
    menuWidth?: number,
    menuHeight?: number
  ) => { x: number; y: number };
  onShowExpandedDailyView?: (reservation: Reservation) => void;
  // Legacy props (unused but kept for type compatibility)
  isDragCreateMode?: boolean;
  isDragCreating?: boolean;
  dragCreateStart?: unknown;
  dragCreateEnd?: unknown;
  dragCreatePreview?: unknown;
  onDragCreateStart?: unknown;
  onDragCreateMove?: unknown;
  onDragCreateEnd?: unknown;
  onCellClick?: unknown;
  shouldHighlightCell?: SimpleDragCreateHook['shouldHighlightCell'];
  dragCreate?: SimpleDragCreateHook;
}

export function ReservationBlock({
  reservation,
  guest,
  room,
  startDate,
  onReservationClick,
  onMoveReservation,
  isFullscreen = false,
  onUpdateReservationStatus,
  onDeleteReservation,
  isExpansionMode = false,
  isMoveMode = false,
  onResizeReservation,
  onShowDrinksModal,
  calculateContextMenuPosition,
  onShowExpandedDailyView,
}: ReservationBlockProps) {
  const [contextMenu, setContextMenu] = useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });
  const [isClosingContextMenu, setIsClosingContextMenu] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag(
    () => ({
      type: ItemTypes.RESERVATION,
      item: {
        reservationId: reservation.id,
        currentRoomId: room.id,
        currentRoomFloor: room.floor_number,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        guestName: guest?.display_name || 'Guest',
        reservation,
      },
      canDrag: () => isMoveMode,
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }),
    [reservation, room, guest, isMoveMode]
  );

  const dragHandleRef = useRef<HTMLDivElement>(null);

  const checkInDate = startOfDay(reservation.checkIn);
  const checkOutDate = startOfDay(reservation.checkOut);
  const timelineStart = startOfDay(startDate);

  const startDayIndex = Math.floor(
    (checkInDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)
  );
  const endDayIndex = Math.floor(
    (checkOutDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)
  );

  const startHalfDayIndex = startDayIndex * 2 + 1;
  const endHalfDayIndex = endDayIndex * 2;
  const visibleStartHalfDay = Math.max(0, startHalfDayIndex);
  const visibleEndHalfDay = Math.min(27, endHalfDayIndex);
  const gridColumnStart = visibleStartHalfDay + 2;
  const gridColumnEnd = visibleEndHalfDay + 3;

  const statusColors =
    RESERVATION_STATUS_COLORS[reservation.status as ReservationStatus] ||
    RESERVATION_STATUS_COLORS.confirmed;
  const flag = getCountryFlag(guest?.nationality || '');

  const reservationDays = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  const isShortReservation = reservationDays <= 2;

  const checkInTime = reservation.checkIn.getTime();
  const checkOutTime = reservation.checkOut.getTime();

  useEffect(() => {
    if (blockRef.current && !isDragging) {
      gsap.fromTo(
        blockRef.current,
        { scale: 0.95, boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)', y: -2 },
        {
          scale: 1,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          y: 0,
          duration: 0.4,
          ease: 'back.out(1.2)',
        }
      );
    }
  }, [gridColumnStart, gridColumnEnd, isDragging, checkInTime, checkOutTime]);

  useEffect(() => {
    if (blockRef.current) {
      gsap.fromTo(
        blockRef.current,
        { opacity: 0, scale: 0.8, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  if (startDayIndex >= 14 || endDayIndex <= 0) return null;
  if (visibleEndHalfDay < visibleStartHalfDay) return null;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const position = calculateContextMenuPosition
      ? calculateContextMenuPosition(e)
      : { x: e.clientX, y: e.clientY };
    setContextMenu({ show: true, x: position.x, y: position.y });
  };

  const handleContextMenuClose = (closedWithAction?: boolean) => {
    if (!closedWithAction) {
      setIsClosingContextMenu(true);
      setTimeout(() => setIsClosingContextMenu(false), 100);
    }
    setContextMenu({ show: false, x: 0, y: 0 });
  };

  return (
    <div
      ref={(el) => {
        dragPreview(el);
        blockRef.current = el;
      }}
      role="button"
      tabIndex={0}
      className={`flex cursor-pointer items-center rounded border px-2 py-0.5 text-xs font-medium hover:shadow-md ${
        isExpansionMode ? 'overflow-visible' : 'overflow-hidden'
      } group pointer-events-auto z-10 ${isDragging ? 'opacity-50 ring-2 ring-blue-400' : ''}`}
      style={{
        gridColumnStart,
        gridColumnEnd,
        gridRowStart: 1,
        gridRowEnd: 1,
        height: 'calc(100% - 2px)',
        margin: '1px 0',
        backgroundColor: statusColors.backgroundColor,
        borderColor: statusColors.borderColor,
        color: statusColors.textColor,
        zIndex: isDragging ? 50 : 5,
      }}
      onClick={() => {
        if (!isDragging && !isClosingContextMenu) {
          onReservationClick(reservation);
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isDragging && !isClosingContextMenu) {
          onReservationClick(reservation);
        }
      }}
      onContextMenu={handleContextMenu}
      title={`${guest?.display_name || 'Guest'} - ${reservation.numberOfGuests} guests ${isDragging ? '(Dragging...)' : '(Click for details)'}`}
    >
      {/* Label Badge */}
      {reservation.label && (
        <div className="absolute top-1 left-1 z-10">
          <LabelBadge label={reservation.label} />
        </div>
      )}

      <div
        className={`flex min-w-0 flex-1 items-center space-x-2 ${isShortReservation ? 'pt-4' : ''}`}
      >
        <span className="flex-shrink-0 text-xs">{flag}</span>

        <div className="flex min-w-0 flex-1 items-center space-x-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium">{guest?.display_name || 'Guest'}</span>
            {(() => {
              const daysLeft = Math.ceil(
                (reservation.checkOut.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
              );
              return (
                <span className="text-xs font-medium text-white">
                  {daysLeft > 0 ? (
                    <>
                      <span className="font-bold">{daysLeft}</span>{' '}
                      {daysLeft === 1 ? 'day' : 'days'}
                    </>
                  ) : daysLeft === 0 ? (
                    'Today'
                  ) : (
                    'Checked out'
                  )}
                </span>
              );
            })()}
          </div>

          <div className="flex flex-shrink-0 items-center space-x-0.5">
            {reservation.adults > 0 && (
              <div className="flex items-center">
                <Users className="h-2.5 w-2.5" />
                <span className="ml-0.5 text-xs">{reservation.adults}</span>
              </div>
            )}
            {reservation.children.length > 0 && (
              <div className="flex items-center">
                <Baby className="h-2.5 w-2.5" />
                <span className="ml-0.5 text-xs">{reservation.children.length}</span>
              </div>
            )}
            {(reservation.hasPets || guest?.has_pets) && <Dog className="h-3 w-3 text-white" />}
          </div>
        </div>

        {!isShortReservation && isMoveMode && (
          <div
            ref={(el) => {
              drag(el);
              dragHandleRef.current = el;
            }}
            className="flex-shrink-0 cursor-move rounded-md border border-gray-200/60 bg-white/95 p-1 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-gray-300 hover:bg-white hover:shadow-md"
            title="⋮⋮ Drag to move reservation"
          >
            <Move className="h-3 w-3 text-gray-500 hover:text-gray-700" />
          </div>
        )}
      </div>

      {isShortReservation && isMoveMode && (
        <div
          ref={(el) => {
            drag(el);
            dragHandleRef.current = el;
          }}
          className="absolute -top-3 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 transform cursor-move items-center justify-center rounded-full border border-gray-200/40 bg-white/70 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-gray-300/60 hover:bg-white/90 hover:shadow-md"
          title="+ Drag to move reservation"
        >
          <Plus className="h-3 w-3 text-gray-400/70 hover:text-gray-600" />
        </div>
      )}

      {isMoveMode && (
        <div className="ml-2 flex items-center space-x-1">
          <button
            className="flex h-4 w-4 items-center justify-center rounded-sm bg-blue-500 text-xs text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md"
            title="Move left (previous day)"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onMoveReservation && startDayIndex > 0) {
                onMoveReservation(
                  reservation.id,
                  room.id.toString(),
                  addDays(reservation.checkIn, -1),
                  addDays(reservation.checkOut, -1)
                );
              }
            }}
          >
            ←
          </button>
          <button
            className="flex h-4 w-4 items-center justify-center rounded-sm bg-blue-500 text-xs text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md"
            title="Move right (next day)"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onMoveReservation && endDayIndex < 13) {
                onMoveReservation(
                  reservation.id,
                  room.id.toString(),
                  addDays(reservation.checkIn, 1),
                  addDays(reservation.checkOut, 1)
                );
              }
            }}
          >
            →
          </button>
        </div>
      )}

      {/* Hover tooltip */}
      <div className="pointer-events-none absolute top-full left-0 z-20 mt-1 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 group-hover:opacity-100">
        {guest?.display_name} • {reservation.numberOfGuests} guests •{' '}
        {format(reservation.checkIn, 'MMM dd')} - {format(reservation.checkOut, 'MMM dd')}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <ReservationContextMenu
          reservation={reservation}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          guest={guest}
          room={room}
          isFullscreen={isFullscreen}
          onClose={handleContextMenuClose}
          onUpdateReservationStatus={onUpdateReservationStatus}
          onDeleteReservation={onDeleteReservation}
          onShowDrinksModal={onShowDrinksModal}
          onShowExpandedDailyView={onShowExpandedDailyView}
        />
      )}

      {/* Expansion Mode Controls */}
      {isExpansionMode && (
        <>
          <div className="absolute top-0 bottom-0 left-1 z-50 flex flex-col justify-center space-y-1">
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:scale-110 hover:bg-blue-600 hover:shadow-md"
              title="Expand to previous day (PM)"
              disabled={startDayIndex <= 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && startDayIndex > 0) {
                  const d = addDays(reservation.checkIn, -1);
                  d.setHours(15, 0, 0, 0);
                  onResizeReservation(reservation.id, 'start', d);
                  if (blockRef.current)
                    gsap.fromTo(
                      blockRef.current,
                      { scale: 1 },
                      { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
                    );
                }
              }}
            >
              ←
            </button>
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:scale-110 hover:bg-blue-700 hover:shadow-md"
              title="Contract from left (remove one day)"
              disabled={reservationDays <= 1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && reservationDays > 1) {
                  const d = addDays(reservation.checkIn, 1);
                  d.setHours(15, 0, 0, 0);
                  onResizeReservation(reservation.id, 'start', d);
                  if (blockRef.current)
                    gsap.fromTo(
                      blockRef.current,
                      { scale: 1 },
                      { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
                    );
                }
              }}
            >
              →
            </button>
          </div>

          <div className="absolute top-0 right-1 bottom-0 z-50 flex flex-col justify-center space-y-1">
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:scale-110 hover:bg-blue-600 hover:shadow-md"
              title="Expand to next day (AM)"
              disabled={endDayIndex >= 13}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && endDayIndex < 13) {
                  const d = addDays(reservation.checkOut, 1);
                  d.setHours(11, 0, 0, 0);
                  onResizeReservation(reservation.id, 'end', d);
                  if (blockRef.current)
                    gsap.fromTo(
                      blockRef.current,
                      { scale: 1 },
                      { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
                    );
                }
              }}
            >
              →
            </button>
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:scale-110 hover:bg-blue-700 hover:shadow-md"
              title="Contract from right (remove one day)"
              disabled={reservationDays <= 1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && reservationDays > 1) {
                  const d = addDays(reservation.checkOut, -1);
                  d.setHours(11, 0, 0, 0);
                  onResizeReservation(reservation.id, 'end', d);
                  if (blockRef.current)
                    gsap.fromTo(
                      blockRef.current,
                      { scale: 1 },
                      { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
                    );
                }
              }}
            >
              ←
            </button>
          </div>
        </>
      )}
    </div>
  );
}
