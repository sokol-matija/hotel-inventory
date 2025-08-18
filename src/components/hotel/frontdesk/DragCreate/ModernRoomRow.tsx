/**
 * ModernRoomRow - Clean room row component with new drag-create architecture
 * 
 * A streamlined room row that uses ModernDateCell components and integrates
 * cleanly with the new DragCreateService for better maintainability.
 * 
 * Features:
 * - Clean separation of concerns
 * - Integration with new drag-create service
 * - Optimized rendering and performance
 * - Accessibility support
 * - Clear visual feedback
 * 
 * @author Hotel Management System v2.8
 * @since August 2025
 */

import React, { memo } from 'react';
import { addDays } from 'date-fns';
import { Room, Reservation } from '../../../../lib/hotel/types';
import { formatRoomNumber, getRoomTypeDisplay } from '../../../../lib/hotel/calendarUtils';
import ModernDateCell from './ModernDateCell';

interface ModernRoomRowProps {
  room: Room;
  startDate: Date;
  reservations: Reservation[];
  
  // Drag-create integration
  shouldHighlightCell: (roomId: string, dayIndex: number, isAM: boolean) => 'selectable' | 'preview' | 'none';
  onCellClick: (roomId: string, date: Date, isAM: boolean) => void;
  
  // Reservation management
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
  onReservationClick?: (reservation: Reservation) => void;
  
  className?: string;
}

const ModernRoomRow: React.FC<ModernRoomRowProps> = memo(({
  room,
  startDate,
  reservations,
  shouldHighlightCell,
  onCellClick,
  onMoveReservation,
  onReservationClick,
  className = ''
}) => {
  // Generate dates for the timeline (14 days)
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
  
  // Filter reservations for this room
  const roomReservations = reservations.filter(res => res.roomId === room.id);

  return (
    <div className={`flex ${className}`}>
      {/* Room info column */}
      <div className="w-[180px] p-2 border-r border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">
              {formatRoomNumber({ number: room.number, isPremium: room.type === 'rooftop-apartment' || room.type === 'apartment' })}
            </div>
            <div className="text-xs text-gray-500">
              {room.type?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Standard'}
            </div>
          </div>
          
          {/* Room status indicators */}
          <div className="flex items-center space-x-1">
            {room.isPremium && (
              <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Premium room" />
            )}
          </div>
        </div>
      </div>

      {/* Date cells grid */}
      <div className="flex-1 grid grid-cols-[repeat(28,minmax(22px,1fr))] border-b border-gray-200">
        {dates.map((date, dayIndex) => {
          // Create AM and PM cells for each date
          return (
            <React.Fragment key={dayIndex}>
              {/* AM Cell (Morning/Checkout) */}
              <ModernDateCell
                room={room}
                dayIndex={dayIndex}
                date={date}
                isAM={true}
                existingReservations={roomReservations}
                onMoveReservation={onMoveReservation}
                highlightMode={shouldHighlightCell(room.id, dayIndex, true)}
                onCellClick={onCellClick}
              />
              
              {/* PM Cell (Afternoon/Checkin) */}
              <ModernDateCell
                room={room}
                dayIndex={dayIndex}
                date={date}
                isAM={false}
                existingReservations={roomReservations}
                onMoveReservation={onMoveReservation}
                highlightMode={shouldHighlightCell(room.id, dayIndex, false)}
                onCellClick={onCellClick}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

ModernRoomRow.displayName = 'ModernRoomRow';

export default ModernRoomRow;