import React, { useMemo } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
import { RESERVATION_STATUS_COLORS, formatRoomNumber } from '../../../lib/hotel/calendarUtils';
import { ReservationStatus } from '../../../lib/hotel/types';

interface HotelTimelineV2Props {
  startDate?: Date;
}

// Simple date navigation header
function TimelineHeader({ startDate, onNavigate }: {
  startDate: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
  
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      {/* Navigation Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Hotel Timeline V2 (Simplified)
          </h2>
          <Badge variant="secondary" className="text-xs">
            {format(startDate, 'MMM yyyy')}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('next')}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Date Headers - Matching original AM/PM system */}
      <div className="grid grid-cols-[180px_repeat(28,minmax(22px,1fr))] border-b border-gray-200">
        {/* Room column header */}
        <div className="p-3 bg-gray-50 border-r border-gray-200 font-medium text-sm text-gray-700">
          Rooms
        </div>
        
        {/* Date columns - AM/PM pairs */}
        {dates.map((date, index) => {
          const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          
          return (
            <React.Fragment key={index}>
              {/* AM half (Check-out zone) */}
              <div 
                className={`p-1 text-center border-r border-gray-300 text-xs ${
                  isToday 
                    ? 'bg-blue-50 font-semibold text-blue-700' 
                    : isWeekend
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-gray-50 text-gray-600'
                } relative`}
                title={`${format(date, 'EEEE, MMMM dd, yyyy')} - Morning (Check-out at 11:00 AM)`}
              >
                <div className="font-medium">{format(date, 'EEE')}</div>
                <div className="font-bold">{format(date, 'dd')}</div>
                {/* Visual indicator for check-out zone */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 opacity-30"></div>
              </div>
              
              {/* PM half (Check-in zone) */}
              <div 
                className={`p-1 text-center border-r border-gray-200 text-xs ${
                  isToday 
                    ? 'bg-blue-50 font-semibold text-blue-700' 
                    : isWeekend
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-gray-50 text-gray-600'
                } relative`}
                title={`${format(date, 'EEEE, MMMM dd, yyyy')} - Afternoon (Check-in at 3:00 PM)`}
              >
                <div className="font-medium opacity-30">{format(date, 'EEE')}</div>
                <div className="font-bold opacity-30">{format(date, 'dd')}</div>
                {/* Visual indicator for check-in zone */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400 opacity-30"></div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Reservation block matching original half-day system
function ReservationBlock({ 
  reservation, 
  guest, 
  startHalfDayIndex, 
  endHalfDayIndex 
}: {
  reservation: any;
  guest: any;
  startHalfDayIndex: number;
  endHalfDayIndex: number;
}) {
  const statusColors = RESERVATION_STATUS_COLORS[reservation.status as ReservationStatus] || RESERVATION_STATUS_COLORS.confirmed;
  
  // Calculate positioning based on 28-column grid (same as original)
  // Grid columns: 1=rooms, 2=day0_AM, 3=day0_PM, 4=day1_AM, 5=day1_PM, ..., 29=day13_PM
  const gridColumnStart = startHalfDayIndex + 2; // +2 for room column offset
  const gridColumnEnd = endHalfDayIndex + 2; // Grid end is exclusive
  
  const nights = Math.ceil((endHalfDayIndex - startHalfDayIndex) / 2);
  
  return (
    <div
      className="col-span-1 row-start-1 rounded-md border-2 px-2 py-1 text-xs font-medium text-white shadow-sm cursor-pointer transition-all hover:shadow-md z-10 m-0.5"
      style={{
        backgroundColor: statusColors.backgroundColor,
        borderColor: statusColors.borderColor,
        gridColumnStart,
        gridColumnEnd,
        minWidth: '44px' // Minimum to fit 2 half-day columns
      }}
    >
      <div className="truncate">
        {guest?.firstName || 'Guest'} {guest?.lastName || ''}
      </div>
      <div className="text-xs opacity-90 truncate">
        {nights} night{nights !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// Room row matching original half-day system
function RoomRow({ 
  room, 
  reservations, 
  guests,
  startDate 
}: {
  room: any;
  reservations: any[];
  guests: any[];
  startDate: Date;
}) {
  const timelineStart = startOfDay(startDate);
  const roomReservations = reservations.filter(r => r.roomId === room.id);
  
  return (
    <div className="relative">
      {/* Grid structure matching original */}
      <div className="grid grid-cols-[180px_repeat(28,minmax(22px,1fr))] border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
        {/* Room info column */}
        <div className="p-3 border-r border-gray-200 bg-white">
          <div className="font-medium text-sm text-gray-900">
            {formatRoomNumber(room)}
          </div>
          <div className="text-xs text-gray-500">
            Floor {room.floor}
          </div>
        </div>
        
        {/* Half-day cells - 28 columns (14 days × 2 half-days) */}
        {Array.from({ length: 28 }, (_, halfDayIndex) => {
          const dayIndex = Math.floor(halfDayIndex / 2);
          const isSecondHalf = halfDayIndex % 2 === 1; // true for PM, false for AM
          const date = addDays(startDate, dayIndex);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          
          return (
            <div
              key={halfDayIndex}
              className={`h-16 border-r border-gray-200 ${
                isSecondHalf 
                  ? 'bg-green-50/20 hover:bg-green-50/40' // Check-in zone (PM)
                  : 'bg-red-50/20 hover:bg-red-50/40'     // Check-out zone (AM)
              } ${isWeekend ? 'bg-orange-50/20' : ''}`}
              title={`${format(date, 'MMM dd')} ${isSecondHalf ? 'PM (Check-in)' : 'AM (Check-out)'}`}
            />
          );
        })}
      </div>
      
      {/* Reservations positioned absolutely over the grid */}
      <div className="absolute inset-0 grid grid-cols-[180px_repeat(28,minmax(22px,1fr))] pointer-events-none">
        <div></div> {/* Empty room column */}
        
        {/* Render reservations in the half-day columns */}
        {roomReservations.map(reservation => {
          const guest = guests.find(g => g.id === reservation.guestId);
          const checkInDate = startOfDay(reservation.checkIn);
          const checkOutDate = startOfDay(reservation.checkOut);
          
          // Calculate half-day indices (same as original timeline)
          const startDayIndex = Math.floor(
            (checkInDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)
          );
          const endDayIndex = Math.floor(
            (checkOutDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)
          );
          
          // Half-day positioning: Check-in starts PM (day * 2 + 1), Check-out ends AM (day * 2)
          const startHalfDayIndex = startDayIndex * 2 + 1; // Second half (PM)
          const endHalfDayIndex = endDayIndex * 2;         // First half (AM)
          
          // Only show if within visible range (0-27 for 28 columns)
          if (startHalfDayIndex < 28 && endHalfDayIndex > 0) {
            const visibleStart = Math.max(0, startHalfDayIndex);
            const visibleEnd = Math.min(28, endHalfDayIndex);
            
            if (visibleEnd > visibleStart) {
              return (
                <ReservationBlock
                  key={reservation.id}
                  reservation={reservation}
                  guest={guest}
                  startHalfDayIndex={visibleStart}
                  endHalfDayIndex={visibleEnd}
                />
              );
            }
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default function HotelTimelineV2({ 
  startDate = new Date() 
}: HotelTimelineV2Props) {
  const { rooms, reservations, guests } = useHotel();
  
  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    rooms.forEach(room => {
      if (!grouped[room.floor]) grouped[room.floor] = [];
      grouped[room.floor].push(room);
    });
    
    // Sort rooms by number within each floor
    Object.keys(grouped).forEach(floor => {
      grouped[parseInt(floor)].sort((a, b) => 
        parseInt(a.number) - parseInt(b.number)
      );
    });
    
    return grouped;
  }, [rooms]);
  
  const handleNavigate = (direction: 'prev' | 'next') => {
    // For now, just log - we'll implement navigation later
    console.log(`Navigate ${direction} from`, startDate);
  };
  
  const floors = Object.keys(roomsByFloor)
    .map(floor => parseInt(floor))
    .sort((a, b) => a - b);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <TimelineHeader 
        startDate={startDate} 
        onNavigate={handleNavigate}
      />
      
      <div className="max-h-96 overflow-y-auto">
        {floors.map(floor => (
          <div key={floor}>
            {/* Floor separator */}
            <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
              Floor {floor}
            </div>
            
            {/* Rooms on this floor */}
            {roomsByFloor[floor].map(room => (
              <RoomRow
                key={room.id}
                room={room}
                reservations={reservations}
                guests={guests}
                startDate={startDate}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Simple footer with stats */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
        Showing {rooms.length} rooms • {reservations.length} reservations
      </div>
    </div>
  );
}