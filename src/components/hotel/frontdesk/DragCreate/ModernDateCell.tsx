/**
 * ModernDateCell - Clean date cell component with new drag-create architecture
 * 
 * A streamlined, maintainable date cell that integrates with the new
 * DragCreateService for clean separation of concerns and better UX.
 * 
 * Features:
 * - Clean integration with DragCreateService  
 * - Clear visual feedback for selectable/preview states
 * - Proper accessibility and keyboard support
 * - Simplified logic without complex state management
 * - Support for both drag-drop reservations and drag-create
 * 
 * @author Hotel Management System v2.8
 * @since August 2025
 */

import React from 'react';
import { useDrop } from 'react-dnd';
import { startOfDay, addDays } from 'date-fns';
import { Room, Reservation } from '../../../../lib/hotel/types';

// Item types for drag and drop
const ItemTypes = {
  RESERVATION: 'reservation'
};

interface ModernDateCellProps {
  room: Room;
  dayIndex: number;
  date: Date;
  isAM: boolean; // true for AM (morning/checkout), false for PM (afternoon/checkin)
  
  // Reservation management
  existingReservations: Reservation[];
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
  
  // Drag-create integration
  highlightMode: 'selectable' | 'preview' | 'none';
  onCellClick: (roomId: string, date: Date, isAM: boolean) => void;
  
  // Optional styling
  className?: string;
}

const ModernDateCell: React.FC<ModernDateCellProps> = ({
  room,
  dayIndex,
  date,
  isAM,
  existingReservations,
  onMoveReservation,
  highlightMode,
  onCellClick,
  className = ''
}) => {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  // Check if this cell has an existing reservation
  const hasExistingReservation = existingReservations.some(res => {
    const resCheckInDate = startOfDay(res.checkIn);
    const resCheckOutDate = startOfDay(res.checkOut);
    const currentDateStart = startOfDay(date);
    
    // Check if this room and time slot conflicts with the reservation
    if (res.roomId === room.id) {
      if (isAM) {
        // AM cell - check if this is the checkout day
        return resCheckOutDate.getTime() === currentDateStart.getTime();
      } else {
        // PM cell - check if this is within the stay period
        return resCheckInDate <= currentDateStart && resCheckOutDate > currentDateStart;
      }
    }
    return false;
  });

  // Drop zone for reservation moves
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.RESERVATION,
    drop: (item: any) => {
      const originalDuration = Math.ceil(
        (item.checkOut.getTime() - item.checkIn.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      if (isAM) {
        // AM cell - set as checkout time
        const newCheckOut = new Date(date);
        newCheckOut.setHours(11, 0, 0, 0);
        
        const newCheckIn = addDays(newCheckOut, -originalDuration);
        newCheckIn.setHours(15, 0, 0, 0);
        
        onMoveReservation(item.reservationId, room.id, newCheckIn, newCheckOut);
      } else {
        // PM cell - set as checkin time
        const newCheckIn = new Date(date);
        newCheckIn.setHours(15, 0, 0, 0);
        
        const newCheckOut = addDays(newCheckIn, originalDuration);
        newCheckOut.setHours(11, 0, 0, 0);
        
        onMoveReservation(item.reservationId, room.id, newCheckIn, newCheckOut);
      }
    },
    canDrop: (item: any) => {
      // Can't drop on occupied cells
      if (hasExistingReservation) return false;
      
      // Can't drop on same position
      const isSamePosition = item.currentRoomId === room.id && 
                            item.checkIn.toDateString() === date.toDateString();
      
      return !isSamePosition;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }), [room, date, isAM, hasExistingReservation, onMoveReservation]);

  // Handle cell clicks for drag-create
  const handleClick = (e: React.MouseEvent) => {
    if (hasExistingReservation) return;
    
    e.preventDefault();
    onCellClick(room.id, date, isAM);
  };

  // Determine cell styling
  const getCellStyle = () => {
    const baseStyles = 'h-12 border-r border-gray-200 transition-all duration-200 relative cursor-pointer';
    
    // Drop zone feedback
    if (isOver && canDrop) {
      return `${baseStyles} bg-green-100 border-2 border-green-400`;
    }
    if (isOver && !canDrop) {
      return `${baseStyles} bg-red-100 border-2 border-red-400`;
    }
    
    // Existing reservation
    if (hasExistingReservation) {
      return `${baseStyles} bg-gray-200 cursor-not-allowed`;
    }
    
    // Drag-create highlights
    switch (highlightMode) {
      case 'selectable':
        return `${baseStyles} bg-blue-100 border-2 border-blue-300 hover:bg-blue-200`;
      case 'preview':
        return `${baseStyles} bg-green-100 border-2 border-green-400`;
      default:
        // Default styling based on cell type and weekend
        if (isWeekend) {
          return `${baseStyles} bg-orange-50/30`;
        }
        return `${baseStyles} ${
          isAM 
            ? 'bg-red-50/20 hover:bg-red-50/40' // Morning (checkout) 
            : 'bg-green-50/20 hover:bg-green-50/40' // Afternoon (checkin)
        }`;
    }
  };

  return (
    <div
      ref={drop as any}
      className={`${getCellStyle()} ${className}`}
      onClick={handleClick}
      title={
        hasExistingReservation
          ? 'Occupied'
          : isAM
          ? `${date.toDateString()} - Morning (Check-out zone)`
          : `${date.toDateString()} - Afternoon (Check-in zone)`
      }
      role="gridcell"
      aria-label={
        hasExistingReservation
          ? `Occupied - ${date.toDateString()} ${isAM ? 'morning' : 'afternoon'}`
          : `Available - ${date.toDateString()} ${isAM ? 'morning' : 'afternoon'} - Click to ${
              highlightMode === 'selectable' 
                ? isAM ? 'set checkout time' : 'set checkin time'
                : 'interact'
            }`
      }
    >
      {/* Visual indicator for cell type */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
        isAM ? 'bg-red-400 opacity-30' : 'bg-green-400 opacity-30'
      }`} />
      
      {/* Highlight overlay for drag-create modes */}
      {highlightMode !== 'none' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full ${
            highlightMode === 'selectable' 
              ? 'bg-blue-500 animate-pulse' 
              : 'bg-green-500'
          }`} />
        </div>
      )}
      
      {/* Loading state for occupied cells */}
      {hasExistingReservation && (
        <div className="absolute inset-0 bg-gray-400 opacity-40 flex items-center justify-center">
          <div className="w-3 h-3 bg-gray-600 rounded-sm" />
        </div>
      )}
    </div>
  );
};

export default ModernDateCell;