import React, { useState, useMemo } from 'react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Users,
  Baby,
  Heart,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Move
} from 'lucide-react';
import { HOTEL_POREC_ROOMS, getRoomsByFloor } from '../../../lib/hotel/hotelData';
import { SAMPLE_GUESTS } from '../../../lib/hotel/sampleData';
import { useHotel } from '../../../lib/hotel/state/HotelContext';
import { RESERVATION_STATUS_COLORS, formatRoomNumber, getRoomTypeDisplay } from '../../../lib/hotel/calendarUtils';
import { getCountryFlag } from '../../../lib/hotel/countryFlags';
import { CalendarEvent, ReservationStatus, Reservation, Room } from '../../../lib/hotel/types';
import ReservationPopup from './Reservations/ReservationPopup';
import CreateBookingModal from './CreateBookingModal';
import hotelNotification from '../../../lib/notifications';

interface HotelTimelineProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Timeline header component showing dates
function TimelineHeader({ 
  startDate, 
  onNavigate 
}: { 
  startDate: Date; 
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
}) {
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
  
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      {/* Navigation row */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('PREV')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('NEXT')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-lg font-semibold text-gray-900">
          {format(startDate, 'MMMM yyyy')} - 14 Day View
        </div>
        
        <div className="text-sm text-gray-500">
          Hotel Porec - 46 Rooms
        </div>
      </div>
      
      {/* Date headers */}
      <div className="grid grid-cols-[240px_repeat(14,minmax(60px,1fr))] border-b border-gray-200 relative z-20">
        <div className="p-3 bg-gray-50 border-r border-gray-200 font-medium text-gray-700">
          Rooms
        </div>
        {dates.map((date, index) => {
          const isToday = isSameDay(date, new Date());
          const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday = 0, Saturday = 6
          
          return (
            <div 
              key={index}
              className={`p-3 text-center border-r border-gray-200 ${
                isToday 
                  ? 'bg-blue-50 font-semibold text-blue-700' 
                  : isWeekend
                  ? 'bg-orange-50 text-orange-700 font-medium'
                  : 'bg-gray-50 text-gray-700'
              }`}
            >
            <div className="text-xs font-medium">
              {format(date, 'EEE')}
            </div>
            <div className="text-sm">
              {format(date, 'dd')}
            </div>
            <div className="text-xs opacity-75">
              {format(date, 'MMM')}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// Define DnD types
const ItemTypes = {
  RESERVATION: 'reservation'
};

// Reservation block component with resize handles
function ReservationBlock({ 
  reservation, 
  guest, 
  room,
  startDate,
  onReservationClick,
  onMoveReservation 
}: {
  reservation: Reservation;
  guest: any;
  room: Room;
  startDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation?: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
}) {
  // Setup drag functionality - MUST be at the top level before any early returns
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.RESERVATION,
    item: {
      reservationId: reservation.id,
      currentRoomId: room.id,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guestName: guest?.name || 'Guest',
      reservation
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [reservation, room, guest]);

  // DEBUG: Fixed positioning logic with better logging
  const checkInDate = startOfDay(reservation.checkIn);
  const checkOutDate = startOfDay(reservation.checkOut);
  const timelineStart = startOfDay(startDate);
  
  // Calculate day indices from timeline start (0-based)
  const startDayIndex = Math.floor((checkInDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
  const endDayIndex = Math.floor((checkOutDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
  
  // DEBUG logging to understand the mismatch
  console.log(`POSITIONING DEBUG for ${guest?.name}:`, {
    checkInDate: format(checkInDate, 'MMM dd'),
    checkOutDate: format(checkOutDate, 'MMM dd'),
    timelineStart: format(timelineStart, 'MMM dd'),
    startDayIndex,
    endDayIndex,
    reservationId: reservation.id
  });
  
  // Don't render if completely outside visible timeline (0-13 days)
  if (startDayIndex >= 14 || endDayIndex <= 0) {
    return null;
  }
  
  // Clamp to visible range
  const visibleStartDay = Math.max(0, startDayIndex);
  const visibleEndDay = Math.min(13, endDayIndex); // 0-13 = 14 days
  
  // FIXED: Full-day positioning math
  // - 14 days total, each day = 100% / 14 = ~7.143%
  // - Reservation starts at LEFT edge of check-in day (full left)
  // - Reservation ends at RIGHT edge of check-out day (full right)
  const dayWidth = 100 / 14; // ~7.143%
  
  // Visual positioning:
  // Start: LEFT edge of start day = startDay * dayWidth
  // End: RIGHT edge of end day = (endDay + 1) * dayWidth  
  const visualStartPercent = visibleStartDay * dayWidth;
  const visualEndPercent = (visibleEndDay + 1) * dayWidth;
  const visualWidthPercent = visualEndPercent - visualStartPercent;
  
  // Skip if no visible width
  if (visualWidthPercent <= 0) {
    return null;
  }
  
  const statusColors = RESERVATION_STATUS_COLORS[reservation.status as ReservationStatus] || RESERVATION_STATUS_COLORS.confirmed;
  const flag = getCountryFlag(guest?.nationality || '');
  
  return (
    <div
      ref={drag as any}
      className={`absolute rounded cursor-move hover:shadow-md transition-all duration-200 border flex items-center px-2 text-xs font-medium overflow-hidden group z-10 ${
        isDragging ? 'opacity-50 ring-2 ring-blue-400' : ''
      }`}
      style={{
        left: `calc(240px + ${visualStartPercent}%)`, // Room column + visual start position
        width: `${visualWidthPercent}%`, // Visual width from LEFT start to RIGHT end
        height: 'calc(100% - 2px)', // Fill row height minus margins
        top: '1px',
        backgroundColor: statusColors.backgroundColor,
        borderColor: statusColors.borderColor,
        color: statusColors.textColor,
        zIndex: isDragging ? 50 : 5 // Higher z-index when dragging
      }}
      onClick={(e) => {
        if (!isDragging) {
          onReservationClick(reservation);
        }
      }}
      title={`${guest?.name || 'Guest'} - ${reservation.numberOfGuests} guests ${isDragging ? '(Dragging...)' : '(Click for details, drag to move)'}`}
    >
      {/* Main content */}
      <div className="flex items-center space-x-1 min-w-0 flex-1">
        {/* Drag handle */}
        <Move className="h-3 w-3 opacity-40 flex-shrink-0" />
        
        {/* Country flag */}
        <span className="text-sm flex-shrink-0">{flag}</span>
        
        {/* Guest name */}
        <span className="truncate font-medium">
          {guest?.name || 'Guest'}
        </span>
        
        {/* Occupancy icons */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {reservation.adults > 0 && (
            <div className="flex items-center">
              <Users className="h-3 w-3" />
              <span className="ml-0.5 text-xs">{reservation.adults}</span>
            </div>
          )}
          
          {reservation.children.length > 0 && (
            <div className="flex items-center">
              <Baby className="h-3 w-3" />
              <span className="ml-0.5 text-xs">{reservation.children.length}</span>
            </div>
          )}
          
          {guest?.hasPets && (
            <Heart className="h-3 w-3 text-red-500" />
          )}
        </div>
      </div>
      
      {/* Resize handles */}
      <div className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-transparent hover:bg-white/20 group-hover:bg-white/30 transition-colors"
           title="Drag to change check-in date"
           onMouseDown={(e) => {
             e.stopPropagation(); // Prevent main drag
             // TODO: Implement resize from left handle
           }}
      ></div>
      
      <div className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-transparent hover:bg-white/20 group-hover:bg-white/30 transition-colors"
           title="Drag to change check-out date"
           onMouseDown={(e) => {
             e.stopPropagation(); // Prevent main drag
             // TODO: Implement resize from right handle
           }}
      ></div>
      
      {/* Hover tooltip */}
      <div className="absolute top-full left-0 mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-20 whitespace-nowrap">
        {guest?.name} • {reservation.numberOfGuests} guests • {format(reservation.checkIn, 'MMM dd')} - {format(reservation.checkOut, 'MMM dd')}
      </div>
    </div>
  );
}

// CLEAN REWRITE: Split day cell with LEFT/RIGHT drop zones
function DroppableDateCell({ 
  room, 
  dayIndex, 
  date, 
  onMoveReservation,
  existingReservations = []
}: {
  room: Room;
  dayIndex: number;
  date: Date;
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
  existingReservations?: Reservation[];
}) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Check if this date already has a reservation for this room
  const hasExistingReservation = existingReservations.some(res => 
    res.roomId === room.id && 
    isSameDay(startOfDay(res.checkIn), date)
  );
  
  // LEFT HALF - Where reservations start (check-in zone)
  const [{ isOverLeft, canDropLeft }, dropLeft] = useDrop(() => ({
    accept: ItemTypes.RESERVATION,
    drop: (item: any) => {
      const originalDuration = Math.ceil((item.checkOut.getTime() - item.checkIn.getTime()) / (24 * 60 * 60 * 1000));
      
      // Set check-in to 3:00 PM on dropped date
      const newCheckIn = new Date(date);
      newCheckIn.setHours(15, 0, 0, 0);
      
      // Set check-out to 11:00 AM after original duration
      const newCheckOut = addDays(newCheckIn, originalDuration);
      newCheckOut.setHours(11, 0, 0, 0);
      
      // DEBUG logging for drop logic
      console.log(`DROP DEBUG:`, {
        droppedOn: format(date, 'MMM dd'),
        newCheckIn: format(newCheckIn, 'MMM dd'),
        newCheckOut: format(newCheckOut, 'MMM dd'),
        originalDuration,
        guestName: item.guestName
      });
      
      onMoveReservation(item.reservationId, room.id, newCheckIn, newCheckOut);
    },
    canDrop: (item: any) => {
      // Can't drop if there's already a reservation starting on this date in this room
      // Can't drop on same room/same date as current position
      return !hasExistingReservation && 
             !(item.currentRoomId === room.id && isSameDay(item.checkIn, date));
    },
    collect: (monitor) => ({
      isOverLeft: !!monitor.isOver(),
      canDropLeft: !!monitor.canDrop(),
    }),
  }), [room, dayIndex, date, onMoveReservation, hasExistingReservation]);

  return (
    <div 
      ref={dropLeft as any}
      className={`h-14 border-r border-gray-200 transition-all duration-200 relative ${
        isOverLeft && canDropLeft 
          ? 'bg-green-100 border-2 border-green-400' 
          : isOverLeft && !canDropLeft 
          ? 'bg-red-100 border-2 border-red-400' 
          : isWeekend
          ? 'bg-orange-50/20'
          : 'bg-white hover:bg-blue-50/30'
      }`}
      title={canDropLeft ? `Drop here for check-in on ${format(date, 'MMM dd')}` : 'Cannot drop here'}
    >
      {/* Dotted circle indicator when dragging over valid drop zone */}
      {isOverLeft && canDropLeft && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-dashed border-green-500 rounded-full bg-green-100/50"></div>
        </div>
      )}
      
      {/* Invalid drop indicator */}
      {isOverLeft && !canDropLeft && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-dashed border-red-500 rounded-full bg-red-100/50">
            <div className="w-full h-full flex items-center justify-center text-red-500 text-xs">×</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Room row component
function RoomRow({ 
  room, 
  reservations, 
  startDate,
  onReservationClick,
  onMoveReservation 
}: {
  room: Room;
  reservations: Reservation[];
  startDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
}) {
  // Find reservations for this room
  const roomReservations = reservations.filter(r => r.roomId === room.id);
  
  return (
    <div className="relative grid grid-cols-[240px_repeat(14,minmax(60px,1fr))] border-b border-gray-100 hover:bg-gray-50">
      {/* Room info */}
      <div className="p-3 border-r border-gray-200 flex items-center justify-between h-14">
        <div>
          <div className="font-medium text-gray-900">
            {formatRoomNumber(room)}
          </div>
          <div className="text-xs text-gray-500">
            {getRoomTypeDisplay(room)}
          </div>
        </div>
        {room.isPremium && (
          <Badge variant="secondary" className="text-xs">
            Premium
          </Badge>
        )}
      </div>
      
      {/* Date cells */}
      {Array.from({ length: 14 }, (_, dayIndex) => {
        const cellDate = addDays(startDate, dayIndex);
        return (
          <DroppableDateCell
            key={dayIndex}
            room={room}
            dayIndex={dayIndex}
            date={cellDate}
            onMoveReservation={onMoveReservation}
            existingReservations={reservations}
          />
        );
      })}
      
      {/* Reservation blocks positioned absolutely over the entire row */}
      {roomReservations.map(reservation => {
        const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
        return (
          <ReservationBlock
            key={reservation.id}
            reservation={reservation}
            guest={guest}
            room={room}
            startDate={startDate}
            onReservationClick={onReservationClick}
            onMoveReservation={onMoveReservation}
          />
        );
      })}
    </div>
  );
}

// Floor section component
function FloorSection({ 
  floor, 
  rooms, 
  reservations,
  startDate,
  isExpanded, 
  onToggle,
  onReservationClick,
  onMoveReservation 
}: {
  floor: number;
  rooms: Room[];
  reservations: Reservation[];
  startDate: Date;
  isExpanded: boolean;
  onToggle: () => void;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
}) {
  const floorName = floor === 4 ? 'Rooftop Premium' : `Floor ${floor}`;
  const occupiedRooms = rooms.filter(room => 
    reservations.some(r => r.roomId === room.id && 
      startOfDay(new Date()) >= startOfDay(r.checkIn) && 
      startOfDay(new Date()) < startOfDay(r.checkOut)
    )
  );
  const occupancyRate = rooms.length > 0 ? (occupiedRooms.length / rooms.length) * 100 : 0;
  
  return (
    <div className="border-b border-gray-200">
      {/* Floor header */}
      <div 
        className="bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200 relative z-10"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
            <span className={`font-semibold ${floor === 4 ? 'text-yellow-600' : 'text-gray-900'}`}>
              {floorName}
            </span>
            <Badge variant="secondary">
              {rooms.length} rooms
            </Badge>
            <Badge variant={occupancyRate > 80 ? "default" : occupancyRate > 50 ? "secondary" : "destructive"}>
              {occupancyRate.toFixed(0)}% occupied
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Room rows */}
      {isExpanded && (
        <div>
          {rooms.map(room => (
            <RoomRow
              key={room.id}
              room={room}
              reservations={reservations}
              startDate={startDate}
              onReservationClick={onReservationClick}
              onMoveReservation={onMoveReservation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Room overview floor section component
function RoomOverviewFloorSection({ 
  floor, 
  rooms, 
  isExpanded, 
  onToggle,
  occupancyData,
  onRoomClick 
}: {
  floor: number;
  rooms: Room[];
  isExpanded: boolean;
  onToggle: () => void;
  occupancyData: Record<string, any>;
  onRoomClick: (room: Room, reservation?: any) => void;
}) {
  const floorName = floor === 4 ? 'Rooftop Premium' : `Floor ${floor}`;
  const occupiedRooms = rooms.filter(room => occupancyData[room.id]);
  const occupancyRate = rooms.length > 0 ? (occupiedRooms.length / rooms.length) * 100 : 0;
  
  return (
    <Card className="mb-4">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-3">
            <span className={floor === 4 ? 'text-yellow-600' : 'text-gray-900'}>
              {floorName}
            </span>
            <Badge variant="secondary">
              {rooms.length} rooms
            </Badge>
            <Badge variant={occupancyRate > 80 ? "default" : occupancyRate > 50 ? "secondary" : "destructive"}>
              {occupancyRate.toFixed(0)}% occupied
            </Badge>
          </CardTitle>
          
          <Button variant="ghost" size="sm">
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {rooms.map(room => {
              const isOccupied = !!occupancyData[room.id];
              const reservation = occupancyData[room.id]?.reservation;
              const status = occupancyData[room.id]?.status;
              const statusColors = status ? RESERVATION_STATUS_COLORS[status as ReservationStatus] : null;
              const guest = reservation ? SAMPLE_GUESTS.find(g => g.id === reservation.guestId) : null;
              
              // Calculate days left if occupied
              const daysLeft = reservation ? Math.ceil((reservation.checkOut.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : 0;
              
              return (
                <div
                  key={room.id}
                  className={`
                    relative p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md
                    ${isOccupied 
                      ? 'border-2' 
                      : 'border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }
                    ${room.isPremium ? 'bg-gradient-to-br from-yellow-50 to-amber-50' : 'bg-white'}
                  `}
                  style={isOccupied && statusColors ? {
                    borderColor: statusColors.borderColor,
                    backgroundColor: `${statusColors.backgroundColor}10`
                  } : {}}
                  onClick={() => onRoomClick(room, reservation)}
                  title={isOccupied 
                    ? `View reservation details for ${guest?.name || 'Guest'}`
                    : `Create new booking for ${formatRoomNumber(room)}`
                  }
                >
                  {/* Price in top right corner */}
                  {isOccupied && reservation && (
                    <div className="absolute top-2 right-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      €{reservation.totalAmount}
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-1">
                    <div className="font-semibold text-sm pr-16">
                      {formatRoomNumber(room)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getRoomTypeDisplay(room)}
                    </div>
                    
                    {isOccupied && reservation && guest ? (
                      <div className="text-xs mt-2 space-y-1">
                        <div className="font-medium">
                          {guest.name}
                        </div>
                        
                        {/* Guest composition with icons */}
                        <div className="flex items-center space-x-2 text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{reservation.adults}</span>
                          </div>
                          {reservation.children.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Baby className="h-3 w-3" />
                              <span>{reservation.children.length}</span>
                            </div>
                          )}
                          {guest.hasPets && (
                            <Heart className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        
                        {/* Days left */}
                        <div className="text-xs text-blue-600 font-medium">
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Checking out today'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs mt-2 text-gray-400 italic">
                        Click to create booking
                      </div>
                    )}
                    
                    {isOccupied && statusColors && (
                      <Badge 
                        className="mt-1 text-xs"
                        style={{ 
                          backgroundColor: statusColors.backgroundColor,
                          color: statusColors.textColor 
                        }}
                      >
                        {statusColors.label}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Main timeline component
export default function HotelTimeline({ isFullscreen = false, onToggleFullscreen }: HotelTimelineProps) {
  const { reservations, isUpdating, createReservation, createGuest, updateReservation } = useHotel();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>({
    1: true,
    2: true, 
    3: true,
    4: true
  });
  const [expandedOverviewFloors, setExpandedOverviewFloors] = useState<Record<number, boolean>>({
    1: true,
    2: true, 
    3: true,
    4: true
  });
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showReservationPopup, setShowReservationPopup] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  
  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    return {
      1: getRoomsByFloor(1),
      2: getRoomsByFloor(2),
      3: getRoomsByFloor(3),
      4: getRoomsByFloor(4)
    };
  }, []);
  
  // Get current occupancy data for today
  const currentOccupancy = useMemo(() => {
    const today = new Date();
    const occupancy: Record<string, any> = {};
    
    reservations.forEach(reservation => {
      if (today >= reservation.checkIn && today < reservation.checkOut) {
        occupancy[reservation.roomId] = {
          reservation,
          status: reservation.status
        };
      }
    });
    
    return occupancy;
  }, [reservations]);
  
  const toggleFloor = (floor: number) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floor]: !prev[floor]
    }));
  };
  
  const toggleOverviewFloor = (floor: number) => {
    setExpandedOverviewFloors(prev => ({
      ...prev,
      [floor]: !prev[floor]
    }));
  };
  
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    if (action === 'PREV') {
      setCurrentDate(prev => addDays(prev, -14));
    } else if (action === 'NEXT') {
      setCurrentDate(prev => addDays(prev, 14));
    } else if (action === 'TODAY') {
      setCurrentDate(new Date());
    }
  };
  
  const handleReservationClick = (reservation: Reservation) => {
    console.log('Reservation clicked:', reservation);
    setSelectedReservation(reservation);
    setShowReservationPopup(true);
  };
  
  const handleRoomClick = (room: Room, reservation?: any) => {
    if (reservation) {
      // Occupied room - show reservation details
      setSelectedReservation(reservation);
      setShowReservationPopup(true);
    } else {
      // Empty room - show create booking modal
      console.log('Creating new booking for room:', room.number);
      setSelectedRoom(room);
      setShowCreateBooking(true);
    }
  };
  
  const handleMoveReservation = async (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => {
    try {
      const reservation = reservations.find(r => r.id === reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
      const newRoom = HOTEL_POREC_ROOMS.find(r => r.id === newRoomId);
      const oldRoom = HOTEL_POREC_ROOMS.find(r => r.id === reservation.roomId);

      await updateReservation(reservationId, {
        roomId: newRoomId,
        checkIn: newCheckIn,
        checkOut: newCheckOut
      });

      // Show success notification
      hotelNotification.success(
        'Reservation Moved Successfully!',
        `${guest?.name || 'Guest'} moved from ${formatRoomNumber(oldRoom!)} to ${formatRoomNumber(newRoom!)} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`,
        5
      );

    } catch (error) {
      console.error('Error moving reservation:', error);
      hotelNotification.error(
        'Failed to Move Reservation',
        'Unable to move the reservation. Please try again.',
        5
      );
    }
  };

  const handleCreateBooking = async (bookingData: any) => {
    try {
      console.log('Creating booking:', bookingData);
      
      let guestId = bookingData.guest.id;
      
      // Create new guest if needed
      if (bookingData.isNewGuest) {
        await createGuest(bookingData.guest);
        // Generate guest ID for the new guest
        guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Create the reservation
      const reservationData = {
        roomId: bookingData.room.id,
        guestId: guestId,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        numberOfGuests: bookingData.adults + bookingData.children.length,
        adults: bookingData.adults,
        children: bookingData.children,
        status: bookingData.status,
        bookingSource: bookingData.bookingSource,
        specialRequests: bookingData.specialRequests,
        seasonalPeriod: bookingData.pricing.seasonalPeriod,
        baseRoomRate: bookingData.pricing.baseRate,
        numberOfNights: bookingData.pricing.numberOfNights,
        subtotal: bookingData.pricing.subtotal,
        childrenDiscounts: bookingData.pricing.totalDiscounts,
        tourismTax: bookingData.pricing.fees.tourism,
        vatAmount: bookingData.pricing.fees.vat,
        petFee: bookingData.pricing.fees.pets,
        parkingFee: bookingData.pricing.fees.parking,
        shortStaySuplement: bookingData.pricing.fees.shortStay,
        additionalCharges: bookingData.pricing.fees.additional,
        totalAmount: bookingData.pricing.total,
        notes: ''
      };
      
      await createReservation(reservationData);
      
      // Close modal and show success
      setShowCreateBooking(false);
      setSelectedRoom(null);
      
      // Show custom notification
      hotelNotification.success(
        'Booking Created Successfully!',
        `${bookingData.guest.name} • ${formatRoomNumber(bookingData.room)} • ${bookingData.checkIn.toLocaleDateString()} - ${bookingData.checkOut.toLocaleDateString()} • €${bookingData.pricing.total.toFixed(2)}`,
        6
      );
      
    } catch (error) {
      console.error('Error creating booking:', error);
      hotelNotification.error(
        'Booking Creation Failed',
        'Unable to create the booking. Please check the details and try again.',
        5
      );
    }
  };
  
  // Convert reservation to CalendarEvent format for the popup
  const selectedEvent: CalendarEvent | null = useMemo(() => {
    if (!selectedReservation) return null;
    
    const room = HOTEL_POREC_ROOMS.find(r => r.id === selectedReservation.roomId);
    const guest = SAMPLE_GUESTS.find(g => g.id === selectedReservation.guestId);
    
    return {
      id: `event-${selectedReservation.id}`,
      reservationId: selectedReservation.id,
      roomId: selectedReservation.roomId,
      title: guest?.name || 'Guest',
      start: selectedReservation.checkIn,
      end: selectedReservation.checkOut,
      resource: {
        status: selectedReservation.status,
        guestName: guest?.name || 'Guest',
        roomNumber: room?.number || 'Unknown',
        numberOfGuests: selectedReservation.numberOfGuests,
        hasPets: guest?.hasPets || false
      }
    };
  }, [selectedReservation]);
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">Front Desk Timeline</h2>
              {isUpdating && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-600">Updating...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600">Hotel Porec - Timeline View</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {onToggleFullscreen && (
              <Button variant="outline" onClick={onToggleFullscreen}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Room Status Overview for Today */}
        {!isFullscreen && (
          <div className="p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-4">
              <CalendarIcon className="h-5 w-5" />
              <span>Room Status Overview - {format(new Date(), 'MMMM dd, yyyy')}</span>
            </h3>
            
            <div className="space-y-4">
              {Object.entries(roomsByFloor).map(([floor, rooms]) => (
                <RoomOverviewFloorSection
                  key={`overview-${floor}`}
                  floor={parseInt(floor)}
                  rooms={rooms}
                  isExpanded={expandedOverviewFloors[parseInt(floor)]}
                  onToggle={() => toggleOverviewFloor(parseInt(floor))}
                  occupancyData={currentOccupancy}
                  onRoomClick={handleRoomClick}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Timeline container */}
        <div className="flex-1 overflow-auto">
          {/* Timeline header with dates */}
          <TimelineHeader 
            startDate={currentDate}
            onNavigate={handleNavigate}
          />
          
          {/* Floor sections */}
          <div>
            {Object.entries(roomsByFloor).map(([floor, rooms]) => (
              <FloorSection
                key={floor}
                floor={parseInt(floor)}
                rooms={rooms}
                reservations={reservations}
                startDate={currentDate}
                isExpanded={expandedFloors[parseInt(floor)]}
                onToggle={() => toggleFloor(parseInt(floor))}
                onReservationClick={handleReservationClick}
                onMoveReservation={handleMoveReservation}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Reservation Popup */}
      <ReservationPopup
        isOpen={showReservationPopup}
        onClose={() => setShowReservationPopup(false)}
        event={selectedEvent}
        onStatusChange={(reservationId, newStatus) => {
          console.log(`Status change: ${reservationId} -> ${newStatus}`);
          // TODO: Update reservation status in state
          setShowReservationPopup(false);
        }}
      />

      {/* Create Booking Modal */}
      {selectedRoom && (
        <CreateBookingModal
          isOpen={showCreateBooking}
          onClose={() => {
            setShowCreateBooking(false);
            setSelectedRoom(null);
          }}
          room={selectedRoom}
          onCreateBooking={handleCreateBooking}
        />
      )}
      </div>
    </DndProvider>
  );
}