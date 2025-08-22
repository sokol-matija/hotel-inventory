import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { gsap } from 'gsap';
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
  Move,
  Plus,
  Dog,
  DollarSign,
  MousePointer2,
  Square,
  ArrowLeftRight,

} from 'lucide-react';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
import { RESERVATION_STATUS_COLORS, formatRoomNumber, getRoomTypeDisplay } from '../../../lib/hotel/calendarUtils';
import { getCountryFlag } from '../../../lib/hotel/countryFlags';
import { CalendarEvent, ReservationStatus, Reservation, Room, Guest } from '../../../lib/hotel/types';
import ReservationPopup from './Reservations/ReservationPopup';
import NewCreateBookingModal from './NewCreateBookingModal';
import RoomChangeConfirmDialog from './RoomChangeConfirmDialog';
import HotelOrdersModal from './RoomService/HotelOrdersModal';
import hotelNotification from '../../../lib/notifications';
import { OrderItem } from '../../../lib/hotel/orderTypes';
import { useHotelTimelineState } from '../../../lib/hooks/useHotelTimelineState';
import { useSimpleDragCreate } from '../../../lib/hooks/useSimpleDragCreate';
import SimpleDragCreateButton from './SimpleDragCreateButton';

interface HotelTimelineProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Timeline header component showing dates
// Room availability interfaces
interface RoomTypeAvailability {
  total: number;
  available: number;
  occupied: number;
}

interface DayAvailability {
  date: Date;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  roomTypes: {
    standard: RoomTypeAvailability;
    premium: RoomTypeAvailability;
    suite: RoomTypeAvailability;
  };
  availableRoomsList: Room[];
  occupiedReservations: Reservation[];
}

function TimelineHeader({ 
  startDate, 
  onNavigate,
  rooms,
  reservations,
  onAvailabilityClick
}: { 
  startDate: Date; 
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  rooms: Room[];
  reservations: Reservation[];
  onAvailabilityClick?: (date: Date, availabilityData: DayAvailability) => void;
}) {
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
  const [showFreeRooms, setShowFreeRooms] = useState(true);

  // Calculate availability for each date
  const calculateDayAvailability = (date: Date): DayAvailability => {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    // Get reservations that occupy this date
    const occupiedReservations = reservations.filter(reservation => {
      const checkIn = new Date(reservation.checkIn);
      const checkOut = new Date(reservation.checkOut);
      
      // Room is occupied from checkin day UNTIL checkout day (exclusive)
      // This means checkout day is available for new bookings
      return checkIn <= dateEnd && checkOut > dateEnd;
    });

    const occupiedRoomIds = new Set(occupiedReservations.map(r => r.roomId));
    const availableRooms = rooms.filter(room => !occupiedRoomIds.has(room.id));

    // Group by room type
    const roomsByType = {
      standard: rooms.filter(r => !r.isPremium && r.floor <= 2),
      premium: rooms.filter(r => r.isPremium && r.floor <= 3),
      suite: rooms.filter(r => r.floor >= 4)
    };

    const availableByType = {
      standard: availableRooms.filter(r => !r.isPremium && r.floor <= 2),
      premium: availableRooms.filter(r => r.isPremium && r.floor <= 3),
      suite: availableRooms.filter(r => r.floor >= 4)
    };

    const occupiedByType = {
      standard: roomsByType.standard.length - availableByType.standard.length,
      premium: roomsByType.premium.length - availableByType.premium.length,
      suite: roomsByType.suite.length - availableByType.suite.length
    };

    return {
      date,
      totalRooms: rooms.length,
      availableRooms: availableRooms.length,
      occupiedRooms: occupiedRoomIds.size,
      occupancyRate: Math.round((occupiedRoomIds.size / rooms.length) * 100),
      roomTypes: {
        standard: { total: roomsByType.standard.length, available: availableByType.standard.length, occupied: occupiedByType.standard },
        premium: { total: roomsByType.premium.length, available: availableByType.premium.length, occupied: occupiedByType.premium },
        suite: { total: roomsByType.suite.length, available: availableByType.suite.length, occupied: occupiedByType.suite }
      },
      availableRoomsList: availableRooms,
      occupiedReservations
    };
  };

  const handleAvailabilityClick = (date: Date) => {
    const availabilityData = calculateDayAvailability(date);
    onAvailabilityClick?.(date, availabilityData);
  };

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
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Hotel Porec - {rooms.length} Rooms
          </div>
          <Button
            variant={showFreeRooms ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFreeRooms(!showFreeRooms)}
            className="text-xs"
          >
            {showFreeRooms ? "Free Rooms" : "Occupied"}
          </Button>
        </div>
      </div>
      
      {/* Availability row - separate row for room availability indicators */}
      <div className="border-b border-gray-200 bg-gray-25">
        <div className="grid grid-cols-[180px_repeat(14,minmax(44px,1fr))] gap-0">
          <div className="p-2 bg-gray-50 border-r border-gray-200 font-medium text-gray-700 text-sm text-center">
            Available
          </div>
          {dates.map((date, index) => {
            const availability = calculateDayAvailability(date);
            
            return (
              <div 
                key={`availability-${index}`}
                className="p-2 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-all"
                title={`${format(date, 'EEEE, MMMM dd, yyyy')} - Click for detailed breakdown`}
                onClick={() => handleAvailabilityClick(date)}
              >
                <div className={`inline-flex items-center justify-center min-w-[30px] h-6 px-2 rounded-md text-xs font-bold shadow-sm ${
                  showFreeRooms 
                    ? availability.availableRooms === 0 
                      ? 'bg-red-500 text-white'
                      : availability.availableRooms <= 5 
                      ? 'bg-orange-500 text-white'
                      : 'bg-green-500 text-white'
                    : availability.occupiedRooms === 0
                    ? 'bg-gray-300 text-gray-700'
                    : 'bg-blue-500 text-white'
                }`}>
                  {showFreeRooms ? availability.availableRooms : availability.occupiedRooms}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date headers - Clean design with proper grid alignment */}
      <div className="border-b border-gray-200 relative z-20">
        {/* Single unified header row matching body grid exactly */}
        <div className="grid grid-cols-[180px_repeat(28,minmax(22px,1fr))] border-b border-gray-200">
          <div className="p-3 bg-gray-50 border-r border-gray-200 font-medium text-gray-700 text-sm">
            Rooms
          </div>
          {dates.map((date, index) => {
            const isToday = isSameDay(date, new Date());
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
                  {/* Subtle visual indicator for check-out zone */}
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
                  {/* Subtle visual indicator for check-in zone */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400 opacity-30"></div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Room Availability Details Modal
function RoomAvailabilityModal({ 
  isOpen, 
  onClose, 
  date, 
  availabilityData 
}: {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  availabilityData: DayAvailability | null;
}) {
  if (!isOpen || !date || !availabilityData) return null;

  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case 'standard': return 'Standard Rooms';
      case 'premium': return 'Premium Rooms';
      case 'suite': return 'Suites';
      default: return type;
    }
  };

  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'border-blue-200 bg-blue-50';
      case 'premium': return 'border-amber-200 bg-amber-50';
      case 'suite': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Room Availability
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {format(date, 'EEEE, MMMM dd, yyyy')}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-white/50">
              ×
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Overview Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{availabilityData.availableRooms}</div>
              <div className="text-sm text-green-600">Available</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{availabilityData.occupiedRooms}</div>
              <div className="text-sm text-red-600">Occupied</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{availabilityData.occupancyRate}%</div>
              <div className="text-sm text-blue-600">Occupancy</div>
            </div>
          </div>

          {/* Room Types Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">By Room Type</h3>
            
            {Object.entries(availabilityData.roomTypes).map(([type, data]) => (
              <div key={type} className={`p-4 rounded-lg border-2 ${getRoomTypeColor(type)}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">{getRoomTypeLabel(type)}</h4>
                  <Badge variant="outline" className="text-xs">
                    {data.total} Total
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-700">{data.available}</div>
                    <div className="text-xs text-gray-600">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-700">{data.occupied}</div>
                    <div className="text-xs text-gray-600">Occupied</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Occupancy</span>
                    <span>{data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${data.total > 0 ? (data.occupied / data.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Available Rooms List */}
          {availabilityData.availableRooms > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Rooms</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {availabilityData.availableRoomsList.map(room => (
                  <div 
                    key={room.id}
                    className={`p-2 text-center rounded-md border text-xs font-medium ${
                      room.isPremium 
                        ? 'bg-amber-50 border-amber-200 text-amber-700' 
                        : room.floor >= 4
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}
                  >
                    {room.number}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
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
  onMoveReservation,
  isFullscreen = false,
  onUpdateReservationStatus,
  onDeleteReservation,
  isExpansionMode = false,
  isMoveMode = false,
  onResizeReservation,
  onShowDrinksModal,
  calculateContextMenuPosition
}: {
  reservation: Reservation;
  guest: any;
  room: Room;
  startDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation?: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
  isFullscreen?: boolean;
  onUpdateReservationStatus?: (id: string, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: string) => Promise<void>;
  isExpansionMode?: boolean;
  isMoveMode?: boolean;
  onResizeReservation?: (reservationId: string, side: 'start' | 'end', newDate: Date) => void;
  onShowDrinksModal?: (reservation: Reservation) => void;
  calculateContextMenuPosition?: (e: React.MouseEvent, menuWidth?: number, menuHeight?: number) => { x: number; y: number };
}) {
  // Context menu state - simple implementation
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    reservation: Reservation | null;
  }>({
    show: false,
    x: 0,
    y: 0,
    reservation: null
  });

  // Flag to prevent click through when closing context menu
  const [isClosingContextMenu, setIsClosingContextMenu] = useState(false);

  // Debug: Log context menu state changes
  useEffect(() => {
    console.log('[CONTEXT MENU] State changed:', {
      show: contextMenu.show,
      x: contextMenu.x,
      y: contextMenu.y,
      reservationId: contextMenu.reservation?.id,
      currentReservationId: reservation.id
    });
  }, [contextMenu, reservation.id]);

  
  // Animation ref
  const blockRef = useRef<HTMLDivElement>(null);

  // Setup drag functionality - MUST be at the top level before any early returns
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: ItemTypes.RESERVATION,
    item: {
      reservationId: reservation.id,
      currentRoomId: room.id,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guestName: guest?.fullName || 'Guest',
      reservation
    },
    canDrag: () => {
      console.log('🔍 DRAG-DROP: Checking if can drag reservation:', {
        reservationId: reservation.id,
        isMoveMode,
        roomId: room.id
      });
      return isMoveMode; // Only allow dragging in move mode
    },
    end: (item: any, monitor: any) => {
      console.log('🏁 DRAG-DROP: Drag ended:', {
        reservationId: reservation.id,
        didDrop: monitor.didDrop(),
        dropResult: monitor.getDropResult()
      });
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [reservation, room, guest, isMoveMode]);

  // Refs for drag handle and card
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // HALF-DAY SYSTEM: Calculate precise positioning for check-in/check-out
  const checkInDate = startOfDay(reservation.checkIn);
  const checkOutDate = startOfDay(reservation.checkOut);
  const timelineStart = startOfDay(startDate);
  
  // Calculate day indices from timeline start (0-13)
  const startDayIndex = Math.floor((checkInDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
  const endDayIndex = Math.floor((checkOutDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
  
  // Debug logging for reservation positioning
  if (reservation.id === '8' || reservation.id === '9') {
    console.log(`Reservation ${reservation.id} positioning:`, {
      checkIn: checkInDate.toISOString().split('T')[0],
      checkOut: checkOutDate.toISOString().split('T')[0],
      timelineStart: timelineStart.toISOString().split('T')[0],
      startDayIndex,
      endDayIndex,
      visible: startDayIndex >= 0 && startDayIndex < 14
    });
  }
  
  // HALF-DAY POSITIONING:
  // Check-in always starts in second half of day (PM)
  // Check-out always ends in first half of day (AM)
  const startHalfDayIndex = startDayIndex * 2 + 1; // Second half (PM) = day * 2 + 1
  const endHalfDayIndex = endDayIndex * 2;         // First half (AM) = day * 2
  
  // Clamp to visible range (need these for useEffect dependencies)
  const visibleStartHalfDay = Math.max(0, startHalfDayIndex);
  const visibleEndHalfDay = Math.min(27, endHalfDayIndex); // Include the AM square (don't subtract 1)
  
  // CSS Grid positioning for half-day system
  // Grid columns: 1=rooms, 2=day0_AM, 3=day0_PM, 4=day1_AM, 5=day1_PM, ..., 29=day13_PM
  const gridColumnStart = visibleStartHalfDay + 2; // day 0 PM = column 3
  const gridColumnEnd = visibleEndHalfDay + 3;     // +3 because CSS grid end is exclusive, so +1 to include AM square
  
  const statusColors = RESERVATION_STATUS_COLORS[reservation.status as ReservationStatus] || RESERVATION_STATUS_COLORS.confirmed;
  const flag = getCountryFlag(guest?.nationality || '');
  
  // Calculate reservation length for adaptive UI
  const reservationDays = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000));
  const isShortReservation = reservationDays <= 2; // 1-2 day reservations
  
  // Animation effects - MUST be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (blockRef.current && !isDragging) {
      // Smooth animation when position updates after drop OR resize
      gsap.fromTo(blockRef.current, 
        { 
          scale: 0.95,
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
          y: -2
        },
        { 
          scale: 1,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          y: 0,
          duration: 0.4,
          ease: 'back.out(1.2)'
        }
      );
    }
  }, [gridColumnStart, gridColumnEnd, isDragging, reservation.checkIn.getTime(), reservation.checkOut.getTime()]);

  // Initial entrance animation - MUST be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (blockRef.current) {
      gsap.fromTo(blockRef.current,
        { 
          opacity: 0,
          scale: 0.8,
          y: 10
        },
        { 
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        }
      );
    }
  }, []);

  // Don't render if completely outside visible timeline
  if (startDayIndex >= 14 || endDayIndex <= 0) {
    return null;
  }
  
  // Skip if no width
  if (visibleEndHalfDay < visibleStartHalfDay) {
    return null;
  }

  return (
    <div
      ref={(el) => {
        dragPreview(el); // Set drag preview to entire card
        blockRef.current = el;
        cardRef.current = el;
      }}
      className={`rounded cursor-pointer hover:shadow-md border flex items-center px-2 py-0.5 text-xs font-medium ${
        isExpansionMode ? 'overflow-visible' : 'overflow-hidden'
      } group z-10 pointer-events-auto ${
        isDragging ? 'opacity-50 ring-2 ring-blue-400' : ''
      }`}
      style={{
        gridColumnStart: gridColumnStart,
        gridColumnEnd: gridColumnEnd,
        gridRowStart: 1,
        gridRowEnd: 1,
        height: 'calc(100% - 2px)', // Fill row height minus margins
        margin: '1px 0',
        backgroundColor: statusColors.backgroundColor,
        borderColor: statusColors.borderColor,
        color: statusColors.textColor,
        zIndex: isDragging ? 50 : 5 // Higher z-index when dragging
      }}
      onClick={(e) => {
        // Prevent click-to-view if dragging or closing context menu
        if (!isDragging && !isClosingContextMenu) {
          onReservationClick(reservation);
        }
      }}
      onContextMenu={(e) => {
        console.log('[CONTEXT MENU] Right-click detected!', {
          reservationId: reservation.id,
          guestName: guest?.fullName,
          clientX: e.clientX,
          clientY: e.clientY,
          target: e.target
        });
        
        e.preventDefault();
        e.stopPropagation();
        
        // Show context menu at smart position
        const position = calculateContextMenuPosition 
          ? calculateContextMenuPosition(e) 
          : { x: e.clientX, y: e.clientY }; // fallback to original positioning
        const newContextMenu = {
          show: true,
          x: position.x,
          y: position.y,
          reservation: reservation
        };
        
        console.log('[CONTEXT MENU] Setting context menu state:', newContextMenu);
        setContextMenu(newContextMenu);
        
        console.log('[CONTEXT MENU] State set complete');
      }}
      title={`${guest?.fullName || 'Guest'} - ${reservation.numberOfGuests} guests ${isDragging ? '(Dragging...)' : '(Click for details)'}`}
    >
      {/* Main content with proper spacing for drag handle */}
      <div className={`flex items-center space-x-2 min-w-0 flex-1 ${
        isShortReservation ? 'pt-2' : ''
      }`}>
        {/* Country flag */}
        <span className="text-xs flex-shrink-0">{flag}</span>
        
        {/* Guest info - name with guest count */}
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate font-medium text-xs">
              {guest?.fullName || 'Guest'}
            </span>
            
            {/* Days left display */}
            {(() => {
              const daysLeft = Math.ceil((reservation.checkOut.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
              return (
                <span className="text-xs text-blue-600 font-medium">
                  {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Checking out today' : 'Checked out'}
                </span>
              );
            })()}
          </div>
          
          {/* Guest count icons next to name */}
          <div className="flex items-center space-x-0.5 flex-shrink-0">
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
            
            {guest?.hasPets && (
              <Dog className="h-3 w-3 text-amber-600" />
            )}
          </div>
        </div>
        
        {/* Drag handle for longer reservations - show based on move mode */}
        {!isShortReservation && isMoveMode && (
          <div
            ref={(el) => {
              drag(el); // Only the drag handle is draggable
              dragHandleRef.current = el;
            }}
            className="bg-white/95 backdrop-blur-sm border border-gray-200/60 rounded-md p-1 hover:bg-white hover:border-gray-300 cursor-move transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md"
            title="⋮⋮ Drag to move reservation"
          >
            <Move className="h-3 w-3 text-gray-500 hover:text-gray-700" />
          </div>
        )}
      </div>
      
      {/* Top drag handle for short reservations - show based on move mode */}
      {isShortReservation && isMoveMode && (
        <div
          ref={(el) => {
            drag(el); // Top drag handle for short reservations
            dragHandleRef.current = el;
          }}
          className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white/70 backdrop-blur-sm border border-gray-200/40 rounded-full flex items-center justify-center cursor-move transition-all duration-200 shadow-sm hover:shadow-md hover:bg-white/90 hover:border-gray-300/60 z-10"
          title="+ Drag to move reservation"
        >
          <Plus className="h-3 w-3 text-gray-400/70 hover:text-gray-600" />
        </div>
      )}
      


      


      
      {/* Move Mode Controls - inline move buttons */}
      {isMoveMode && (
        <div className="flex items-center space-x-1 ml-2">
          <button
            className="w-4 h-4 bg-blue-500 hover:bg-blue-600 text-white rounded-sm flex items-center justify-center text-xs transition-all duration-200 shadow-sm hover:shadow-md"
            title="Move left (previous day)"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onMoveReservation && startDayIndex > 0) {
                const newCheckIn = addDays(reservation.checkIn, -1);
                const newCheckOut = addDays(reservation.checkOut, -1);
                onMoveReservation(reservation.id, room.id, newCheckIn, newCheckOut);
              }
            }}
          >
            ←
          </button>
          
          <button
            className="w-4 h-4 bg-blue-500 hover:bg-blue-600 text-white rounded-sm flex items-center justify-center text-xs transition-all duration-200 shadow-sm hover:shadow-md"
            title="Move right (next day)"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onMoveReservation && endDayIndex < 13) {
                const newCheckIn = addDays(reservation.checkIn, 1);
                const newCheckOut = addDays(reservation.checkOut, 1);
                onMoveReservation(reservation.id, room.id, newCheckIn, newCheckOut);
              }
            }}
          >
            →
          </button>
        </div>
      )}

      {/* Hover tooltip */}
      <div className="absolute top-full left-0 mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-20 whitespace-nowrap">
        {guest?.fullName} • {reservation.numberOfGuests} guests • {format(reservation.checkIn, 'MMM dd')} - {format(reservation.checkOut, 'MMM dd')}
      </div>

      {/* Simple Context Menu */}
      {contextMenu.show && contextMenu.reservation?.id === reservation.id && (
        (isFullscreen ? createPortal(
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => {
                console.log('[CONTEXT MENU] Backdrop clicked - closing menu');
                setIsClosingContextMenu(true);
                setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                // Reset flag after a short delay
                setTimeout(() => setIsClosingContextMenu(false), 100);
              }}
            />
            
            {/* Context Menu */}
            <div 
              className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px] z-[9999]"
              style={{ 
                left: contextMenu.x, 
                top: contextMenu.y
              }}
              onClick={() => console.log('[CONTEXT MENU] Menu clicked')}
            >
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={async () => {
                  console.log('Fast Check-in clicked for:', contextMenu.reservation?.id);
                  if (contextMenu.reservation && onUpdateReservationStatus) {
                    try {
                      await onUpdateReservationStatus(contextMenu.reservation.id, 'checked-in');
                      console.log('✅ Guest checked in successfully');
                    } catch (error) {
                      console.error('❌ Failed to check in guest:', error);
                    }
                  }
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-green-600">✓</span>
                <span>Fast Check-in</span>
              </button>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={async () => {
                  console.log('Fast Check-out clicked for:', contextMenu.reservation?.id);
                  if (contextMenu.reservation && onUpdateReservationStatus) {
                    try {
                      await onUpdateReservationStatus(contextMenu.reservation.id, 'checked-out');
                      console.log('✅ Guest checked out successfully');
                    } catch (error) {
                      console.error('❌ Failed to check out guest:', error);
                    }
                  }
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-blue-600">↗</span>
                <span>Fast Check-out</span>
              </button>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={() => {
                  if (onShowDrinksModal && contextMenu.reservation) {
                    onShowDrinksModal(contextMenu.reservation);
                  }
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-green-600">🛎️</span>
                <span>Add Room Service to Bill</span>
              </button>

              <div className="border-t border-gray-100 my-1"></div>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={() => {
                  console.log('📄 Create Invoice clicked for:', contextMenu.reservation?.id);
                  alert('Invoice creation feature coming soon!');
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-purple-600">📄</span>
                <span>Create Invoice</span>
              </button>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={() => {
                  console.log('💰 Mark as Paid clicked for:', contextMenu.reservation?.id);
                  alert('Payment tracking feature coming soon!');
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-yellow-600">💰</span>
                <span>Mark as Paid</span>
              </button>

              <div className="border-t border-gray-100 my-1"></div>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center space-x-3"
                onClick={async () => {
                  console.log('Delete clicked for:', contextMenu.reservation?.id);
                  if (contextMenu.reservation && onDeleteReservation) {
                    if (window.confirm(`Are you sure you want to delete the reservation for ${contextMenu.reservation.guestId}?`)) {
                      try {
                        await onDeleteReservation(contextMenu.reservation.id);
                        console.log('✅ Reservation deleted successfully');
                      } catch (error) {
                        console.error('❌ Failed to delete reservation:', error);
                      }
                    }
                  }
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-red-600">×</span>
                <span>Delete Reservation</span>
              </button>
            </div>
          </>, document.body
        ) : (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => {
                console.log('[CONTEXT MENU] Backdrop clicked - closing menu');
                setIsClosingContextMenu(true);
                setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                // Reset flag after a short delay
                setTimeout(() => setIsClosingContextMenu(false), 100);
              }}
            />
            
            {/* Context Menu */}
            <div 
              className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px] z-[9999]"
              style={{ 
                left: contextMenu.x, 
                top: contextMenu.y
              }}
              onClick={() => console.log('[CONTEXT MENU] Menu clicked')}
            >
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={async () => {
                  console.log('Fast Check-in clicked for:', contextMenu.reservation?.id);
                  if (contextMenu.reservation && onUpdateReservationStatus) {
                    try {
                      await onUpdateReservationStatus(contextMenu.reservation.id, 'checked-in');
                      console.log('✅ Guest checked in successfully');
                    } catch (error) {
                      console.error('❌ Failed to check in guest:', error);
                    }
                  }
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-green-600">✓</span>
                <span>Fast Check-in</span>
              </button>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={async () => {
                  console.log('Fast Check-out clicked for:', contextMenu.reservation?.id);
                  if (contextMenu.reservation && onUpdateReservationStatus) {
                    try {
                      await onUpdateReservationStatus(contextMenu.reservation.id, 'checked-out');
                      console.log('✅ Guest checked out successfully');
                    } catch (error) {
                      console.error('❌ Failed to check out guest:', error);
                    }
                  }
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-blue-600">↗</span>
                <span>Fast Check-out</span>
              </button>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={() => {
                  if (onShowDrinksModal && contextMenu.reservation) {
                    onShowDrinksModal(contextMenu.reservation);
                  }
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-green-600">🛎️</span>
                <span>Add Room Service to Bill</span>
              </button>

              <div className="border-t border-gray-100 my-1"></div>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={() => {
                  console.log('📄 Create Invoice clicked for:', contextMenu.reservation?.id);
                  alert('Invoice creation feature coming soon!');
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-purple-600">📄</span>
                <span>Create Invoice</span>
              </button>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
                onClick={() => {
                  console.log('💰 Mark as Paid clicked for:', contextMenu.reservation?.id);
                  alert('Payment tracking feature coming soon!');
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-yellow-600">💰</span>
                <span>Mark as Paid</span>
              </button>

              <div className="border-t border-gray-100 my-1"></div>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center space-x-3"
                onClick={async () => {
                  console.log('Delete clicked for:', contextMenu.reservation?.id);
                  if (contextMenu.reservation && onDeleteReservation) {
                    if (window.confirm(`Are you sure you want to delete the reservation for ${contextMenu.reservation.guestId}?`)) {
                      try {
                        await onDeleteReservation(contextMenu.reservation.id);
                        console.log('✅ Reservation deleted successfully');
                      } catch (error) {
                        console.error('❌ Failed to delete reservation:', error);
                      }
                    }
                  }
                  setContextMenu({ show: false, x: 0, y: 0, reservation: null });
                }}
              >
                <span className="text-red-600">×</span>
                <span>Delete Reservation</span>
              </button>
            </div>
          </>
        ))
      )}

      {/* Expansion Mode Controls */}
      {isExpansionMode && (
        <>
          {/* Left side controls (check-in adjustment) */}
          <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-center space-y-1 z-50">
            {/* Expand left button (extend to previous day PM) */}
            <button
              className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-110"
              title="Expand to previous day (PM)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && startDayIndex > 0) {
                  const newCheckIn = addDays(reservation.checkIn, -1);
                  newCheckIn.setHours(15, 0, 0, 0); // 3 PM
                  onResizeReservation(reservation.id, 'start', newCheckIn);
                  
                  // Visual feedback - pulse effect
                  if (blockRef.current) {
                    gsap.fromTo(blockRef.current, 
                      { scale: 1 },
                      { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
                    );
                  }
                }
              }}
              disabled={startDayIndex <= 0}
            >
              ←
            </button>
            
            {/* Contract left button (remove one day from start) */}
            <button
              className="w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-110"
              title="Contract from left (remove one day)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && reservationDays > 1) {
                  const newCheckIn = addDays(reservation.checkIn, 1);
                  newCheckIn.setHours(15, 0, 0, 0); // 3 PM
                  onResizeReservation(reservation.id, 'start', newCheckIn);
                  
                  // Visual feedback - pulse effect
                  if (blockRef.current) {
                    gsap.fromTo(blockRef.current, 
                      { scale: 1 },
                      { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
                    );
                  }
                }
              }}
              disabled={reservationDays <= 1}
            >
              →
            </button>
          </div>
          
          {/* Right side controls (check-out adjustment) */}
          <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center space-y-1 z-50">
            {/* Expand right button (extend to next day AM) */}
            <button
              className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-110"
              title="Expand to next day (AM)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && endDayIndex < 13) {
                  const newCheckOut = addDays(reservation.checkOut, 1);
                  newCheckOut.setHours(11, 0, 0, 0); // 11 AM
                  onResizeReservation(reservation.id, 'end', newCheckOut);
                  
                  // Visual feedback - pulse effect
                  if (blockRef.current) {
                    gsap.fromTo(blockRef.current, 
                      { scale: 1 },
                      { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
                    );
                  }
                }
              }}
              disabled={endDayIndex >= 13}
            >
              →
            </button>
            
            {/* Contract right button (remove one day from end) */}
            <button
              className="w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-110"
              title="Contract from right (remove one day)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && reservationDays > 1) {
                  const newCheckOut = addDays(reservation.checkOut, -1);
                  newCheckOut.setHours(11, 0, 0, 0); // 11 AM
                  onResizeReservation(reservation.id, 'end', newCheckOut);
                  
                  // Visual feedback - pulse effect
                  if (blockRef.current) {
                    gsap.fromTo(blockRef.current, 
                      { scale: 1 },
                      { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
                    );
                  }
                }
              }}
              disabled={reservationDays <= 1}
            >
              ←
            </button>
          </div>
        </>
      )}

    </div>
  );
}

// Enhanced date cell with drag-to-create functionality - Updated for half-day system
function DroppableDateCell({ 
  room, 
  dayIndex, 
  halfDayIndex,
  isSecondHalf,
  date, 
  onMoveReservation,
  existingReservations = [],
  // New props for drag-to-create
  isDragCreateMode,
  isDragCreating,
  dragCreateStart,
  dragCreateEnd,
  dragCreatePreview,
  onDragCreateStart,
  onDragCreateMove,
  onDragCreateEnd,
  onCellClick,
  // Simple drag-create visual feedback
  shouldHighlightCell,
  dragCreate
}: {
  room: Room;
  dayIndex: number;
  halfDayIndex: number;
  isSecondHalf: boolean;
  date: Date;
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
  existingReservations?: Reservation[];
  // New props for drag-to-create
  isDragCreateMode?: boolean;
  isDragCreating?: boolean;
  dragCreateStart?: {roomId: string, dayIndex: number} | null;
  dragCreateEnd?: {roomId: string, dayIndex: number} | null;
  dragCreatePreview?: {roomId: string, startDay: number, endDay: number} | null;
  onDragCreateStart?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateMove?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateEnd?: (roomId: string, halfDayIndex: number) => void;
  // Simple drag-create handler
  onCellClick?: (roomId: string, date: Date, isAM: boolean) => void;
  // Simple drag-create visual feedback
  shouldHighlightCell?: (roomId: string, date: Date, isAM: boolean) => 'selectable' | 'preview' | 'hover-preview' | 'none';
  dragCreate?: any; // Drag create hook object
}) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Check if this half-day slot already has a reservation for this room
  const hasExistingReservation = existingReservations.some(res => {
    const resCheckInDate = startOfDay(res.checkIn);
    const resCheckOutDate = startOfDay(res.checkOut);
    const resStartDay = Math.floor((resCheckInDate.getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000));
    const resEndDay = Math.floor((resCheckOutDate.getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000));
    
    // For same room, check if this half-day slot conflicts
    if (res.roomId === room.id && resStartDay <= dayIndex && resEndDay > dayIndex) {
      // If it's the start day and second half, or end day and first half, or any day in between
      if (dayIndex === resStartDay && isSecondHalf) return true;
      if (dayIndex === resEndDay && !isSecondHalf) return true;
      if (dayIndex > resStartDay && dayIndex < resEndDay) return true;
    }
    return false;
  });

  // Check if this cell is part of the drag preview (updated for half-day system)
  const isInDragPreview = dragCreatePreview && 
    dragCreatePreview.roomId === room.id && 
    isDragCreating && (
      // For the start day, only include PM half (since we start from PM)
      (dayIndex === dragCreatePreview.startDay && isSecondHalf) ||
      // For middle days, include both halves
      (dayIndex > dragCreatePreview.startDay && dayIndex < dragCreatePreview.endDay) ||
      // For the end day, only include AM half (since we end on AM)
      (dayIndex === dragCreatePreview.endDay && !isSecondHalf)
    );

  // OLD drag create availability check - DISABLED (using new shouldHighlightCell system)
  const isAvailableForDragCreate = false;

  // Drop zone for half-day positioning with CONSTRAINTS
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.RESERVATION,
    drop: (item: any) => {
      console.log('🚀 DROP TRIGGERED:', {
        reservationId: item.reservationId,
        fromRoom: item.currentRoomId,
        toRoom: room.id,
        date: date.toLocaleDateString(),
        isSecondHalf,
        originalCheckIn: item.checkIn,
        originalCheckOut: item.checkOut
      });
      
      const originalDuration = Math.ceil((item.checkOut.getTime() - item.checkIn.getTime()) / (24 * 60 * 60 * 1000));
      
      if (isSecondHalf) {
        // CONSTRAINT: PM cells only accept check-in (left edge of reservation)
        const newCheckIn = new Date(date);
        newCheckIn.setHours(15, 0, 0, 0); // 3:00 PM check-in
        
        const newCheckOut = addDays(newCheckIn, originalDuration);
        newCheckOut.setHours(11, 0, 0, 0); // 11:00 AM check-out
        
        console.log('📞 CALLING onMoveReservation (PM):', {
          reservationId: item.reservationId,
          roomId: room.id,
          newCheckIn,
          newCheckOut,
          functionName: onMoveReservation.name || 'anonymous'
        });
        
        onMoveReservation(item.reservationId, room.id, newCheckIn, newCheckOut);
      } else {
        // CONSTRAINT: AM cells only accept check-out (right edge of reservation)
        const newCheckOut = new Date(date);
        newCheckOut.setHours(11, 0, 0, 0); // 11:00 AM check-out
        
        const newCheckIn = addDays(newCheckOut, -originalDuration);
        newCheckIn.setHours(15, 0, 0, 0); // 3:00 PM check-in (duration days before)
        
        console.log('📞 CALLING onMoveReservation (AM):', {
          reservationId: item.reservationId,
          roomId: room.id,
          newCheckIn,
          newCheckOut,
          functionName: onMoveReservation.name || 'anonymous'
        });
        
        onMoveReservation(item.reservationId, room.id, newCheckIn, newCheckOut);
      }
    },
    canDrop: (item: any) => {
      // ENHANCED CONSTRAINTS:
      // 1. No existing reservation conflicts
      // 2. Not same position
      // 3. ENFORCE: PM slots only for check-in moves, AM slots only for check-out moves
      
      const isSamePosition = item.currentRoomId === room.id && 
                            isSameDay(item.checkIn, date) && 
                            ((isSecondHalf && item.checkIn.getHours() >= 12) || 
                             (!isSecondHalf && item.checkIn.getHours() < 12));
      
      // Only allow drops that make logical sense:
      // - PM cells: for moving check-in time (left edge)
      // - AM cells: for moving check-out time (right edge)
      const isValidDropZone = true; // For now, allow both - we'll handle logic in drop
      
      const canDropHere = !hasExistingReservation && !isSamePosition && isValidDropZone;
      
      console.log('🎯 CAN DROP CHECK:', {
        reservationId: item.reservationId,
        room: room.number,
        date: date.toLocaleDateString(),
        isSecondHalf,
        hasExistingReservation,
        isSamePosition,
        isValidDropZone,
        canDropHere,
        existingReservationsCount: existingReservations.length
      });
      
      return canDropHere;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [room, dayIndex, halfDayIndex, isSecondHalf, date, onMoveReservation, hasExistingReservation]);

  // Handle two-click drag-to-create system (using new shouldHighlightCell system)
  const handleClick = (e: React.MouseEvent) => {
    if (hasExistingReservation) return;
    
    // Only handle click if the new system says this cell should be highlighted
    if (shouldHighlightCell && shouldHighlightCell(room.id, date, !isSecondHalf) !== 'none') {
      e.preventDefault();
      console.log('🔥 SIMPLE CELL CLICK:', { roomId: room.id, date: date.toLocaleDateString(), isAM: !isSecondHalf });
      
      // Call the simple drag-create handler directly
      if (onCellClick) {
        onCellClick(room.id, date, !isSecondHalf);
      }
    }
  };

  // OLD right-click handler - DISABLED (using new drag-create system)
  const handleRightClick = (e: React.MouseEvent) => {
    // Disabled - new system handles cancellation
  };

  // Get modern drag-create highlight style - improved for better UX
  const getSimpleDragCreateStyle = () => {
    if (!shouldHighlightCell) return '';
    
    const highlightType = shouldHighlightCell(room.id, date, !isSecondHalf);
    
    switch (highlightType) {
      case 'selectable':
        return !isSecondHalf 
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-400 cursor-pointer hover:from-emerald-100 hover:to-emerald-200 hover:shadow-lg hover:shadow-emerald-200/50 transition-all duration-200' // AM - check-out selectable (no pulse)
          : 'bg-gradient-to-br from-sky-50 to-sky-100 border-2 border-sky-400 cursor-pointer hover:from-sky-100 hover:to-sky-200 hover:shadow-lg hover:shadow-sky-200/50 transition-all duration-200';   // PM - check-in selectable
      case 'hover-preview':
        return ''; // Now handled by overlay system - no individual cell styling needed
      case 'preview':
        return 'bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 border border-blue-300 opacity-80'; // Subtle preview (no pulse, no distracting animation)
      default:
        return '';
    }
  };

  const handleMouseEnter = () => {
    // Show growing reservation box during selection
    if (dragCreate?.actions?.setHoverPreview && dragCreate?.state?.isSelecting) {
      console.log('🖱️  Mouse enter cell:', { roomId: room.id, date: date.toLocaleDateString(), isAM: !isSecondHalf });
      dragCreate.actions.setHoverPreview(room.id, date, !isSecondHalf);
    }
  };
  
  const handleMouseLeave = () => {
    // Clear hover preview when mouse leaves
    if (dragCreate?.actions?.clearHoverPreview && dragCreate?.state?.isSelecting) {
      dragCreate.actions.clearHoverPreview();
    }
  };

  return (
    <div 
      ref={drop as any}
      className={`h-12 border-r border-gray-200 transition-all duration-200 relative ${
        // Priority 1: Simple drag-create highlighting (new system)
        getSimpleDragCreateStyle() ||
        // Priority 2: Old drag system preview
        (isInDragPreview
          ? 'bg-blue-200 border-2 border-blue-400'
          : // Priority 3: Drop feedback
          isOver && canDrop 
          ? 'bg-green-100 border-2 border-green-400' 
          : isOver && !canDrop 
          ? 'bg-red-100 border-2 border-red-400' 
          : // Priority 4: Old drag-create availability
          isAvailableForDragCreate
          ? 'bg-blue-50/50 hover:bg-blue-100/70 cursor-crosshair'
          : // Priority 5: Default styling
          isWeekend
          ? 'bg-orange-50/20'
          : isSecondHalf 
          ? 'bg-green-50/20 hover:bg-green-50/40' // Check-in zone (PM)
          : 'bg-red-50/20 hover:bg-red-50/40'     // Check-out zone (AM)
        )
      }`}
      title={
        canDrop 
          ? `Drop here to ${isSecondHalf ? 'move check-in to' : 'move check-out to'} ${format(date, 'MMM dd')} ${isSecondHalf ? '3:00 PM' : '11:00 AM'}` 
          : isSecondHalf 
          ? 'Check-in zone (PM) - Drop to move reservation start'
          : 'Check-out zone (AM) - Drop to move reservation end'
      }
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Enhanced drop zone visual feedback */}
      {isOver && canDrop && (
        <div className={`absolute inset-0 ${
          isSecondHalf 
            ? 'bg-green-200 border-2 border-green-400' 
            : 'bg-red-200 border-2 border-red-400'
        } border-dashed flex items-center justify-center`}>
          <span className={`text-xs font-bold ${
            isSecondHalf ? 'text-green-700' : 'text-red-700'
          }`}>
            {isSecondHalf ? '→ IN' : 'OUT ←'}
          </span>
        </div>
      )}
      
      {/* Invalid drop indicator */}
      {isOver && !canDrop && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-dashed border-red-500 rounded-full bg-red-100/50">
            <div className="w-full h-full flex items-center justify-center text-red-500 text-xs">×</div>
          </div>
        </div>
      )}
      
      {/* Old hover preview content removed - now handled by overlay system */}

      {/* Half-day visual indicator */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
        isSecondHalf ? 'bg-green-400' : 'bg-red-400'
      } opacity-60`}></div>
      
      {/* Small time indicator in corner */}
      <div className={`absolute top-0 right-0 text-xs px-1 text-gray-500 ${
        isSecondHalf ? 'text-green-600' : 'text-red-600'
      }`}>
        {isSecondHalf ? 'PM' : 'AM'}
      </div>
    </div>
  );
}

// Room row component
function RoomRow({ 
  room, 
  reservations, 
  guests,
  startDate,
  onReservationClick,
  onMoveReservation,
  isFullscreen = false,
  onUpdateReservationStatus,
  onDeleteReservation,
  // New props for drag-to-create
  isDragCreateMode,
  isDragCreating,
  dragCreateStart,
  dragCreateEnd,
  dragCreatePreview,
  onDragCreateStart,
  onDragCreateMove,
  onDragCreateEnd,
  // New props for expansion mode
  isExpansionMode,
  onResizeReservation,
  onShowDrinksModal,
  calculateContextMenuPosition,
  // New props for move mode
  isMoveMode,
  // Simple drag-create handler
  onCellClick,
  // Simple drag-create visual feedback
  shouldHighlightCell,
  dragCreate
}: {
  room: Room;
  reservations: Reservation[];
  guests: Guest[];
  startDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
  isFullscreen?: boolean;
  onUpdateReservationStatus?: (id: string, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: string) => Promise<void>;
  // New props for drag-to-create
  isDragCreateMode?: boolean;
  isDragCreating?: boolean;
  dragCreateStart?: {roomId: string, dayIndex: number} | null;
  dragCreateEnd?: {roomId: string, dayIndex: number} | null;
  dragCreatePreview?: {roomId: string, startDay: number, endDay: number} | null;
  onDragCreateStart?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateMove?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateEnd?: (roomId: string, halfDayIndex: number) => void;
  // New props for expansion mode
  isExpansionMode?: boolean;
  onResizeReservation?: (reservationId: string, side: 'start' | 'end', newDate: Date) => void;
  onShowDrinksModal?: (reservation: Reservation) => void;
  calculateContextMenuPosition?: (e: React.MouseEvent, menuWidth?: number, menuHeight?: number) => { x: number; y: number };
  // New props for move mode
  isMoveMode?: boolean;
  // Simple drag-create handler
  onCellClick?: (roomId: string, date: Date, isAM: boolean) => void;
  // Simple drag-create visual feedback
  shouldHighlightCell?: (roomId: string, date: Date, isAM: boolean) => 'selectable' | 'preview' | 'hover-preview' | 'none';
  dragCreate?: any; // Drag create hook object
}) {
  // Find reservations for this room
  const roomReservations = reservations.filter(r => r.roomId === room.id);
  
  return (
    <div className="relative border-b border-gray-100 hover:bg-gray-50">
      {/* Background grid for drop zones - Updated for half-day system */}
      <div className="grid grid-cols-[180px_repeat(28,minmax(22px,1fr))]">
        {/* Room info */}
        <div className="p-2 border-r border-gray-200 flex items-center justify-between h-12">
          <div>
            <div className="font-medium text-gray-900 text-sm">
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
        
        {/* Date cells - Updated for half-day system */}
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
              isDragCreateMode={isDragCreateMode}
              isDragCreating={isDragCreating}
              dragCreateStart={dragCreateStart}
              dragCreateEnd={dragCreateEnd}
              dragCreatePreview={dragCreatePreview}
              onDragCreateStart={onDragCreateStart}
              onDragCreateMove={onDragCreateMove}
              onDragCreateEnd={onDragCreateEnd}
              onCellClick={onCellClick}
              shouldHighlightCell={shouldHighlightCell}
              dragCreate={dragCreate}
            />
          );
        })}
      </div>
      
      {/* Reservation blocks overlaid on the same grid - Updated for half-day system */}
      <div className={`absolute inset-0 grid grid-cols-[180px_repeat(28,minmax(22px,1fr))] pointer-events-none ${
        isExpansionMode ? 'overflow-visible' : 'overflow-hidden'
      }`}>
        {roomReservations.map(reservation => {
          const guest = guests.find(g => g.id === reservation.guestId);
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
              isExpansionMode={isExpansionMode}
              isMoveMode={isMoveMode}
              onResizeReservation={onResizeReservation}
              onShowDrinksModal={onShowDrinksModal}
              calculateContextMenuPosition={calculateContextMenuPosition}
            />
          );
        })}
        
        {/* Hover preview overlay - seamless like real reservations */}
        {dragCreate?.state?.isSelecting && dragCreate.state.hoverPreview && 
         dragCreate.state.hoverPreview.roomId === room.id && dragCreate.state.currentSelection && (
          (() => {
            const timelineStart = startOfDay(startDate);
            const checkInDate = startOfDay(dragCreate.state.currentSelection.checkInDate);
            const hoverDate = startOfDay(dragCreate.state.hoverPreview.hoverDate);
            
            // Calculate grid positions (PM check-in to hovered position)
            const startDayIndex = Math.floor((checkInDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
            const endDayIndex = Math.floor((hoverDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
            
            // Convert to half-day grid positions (PM check-in to hovered position)  
            const startHalfDayIndex = startDayIndex * 2 + 1; // PM cell (check-in)
            
            // End at exact hovered cell (AM or PM)
            const endHalfDayIndex = dragCreate.state.hoverPreview.isAM 
              ? endDayIndex * 2      // AM cell of hovered day
              : endDayIndex * 2 + 1; // PM cell of hovered day
            
            // Grid column positions (1-based for CSS grid, +1 for room name column)
            const gridColumnStart = startHalfDayIndex + 2;
            const gridColumnEnd = endHalfDayIndex + 2;
            
            if (startHalfDayIndex >= 28 || endHalfDayIndex <= 0 || gridColumnEnd <= gridColumnStart) {
              return null;
            }
            
            return (
              <div
                className="h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded border border-orange-600 shadow-md flex flex-col items-center justify-center text-white text-xs font-medium pointer-events-none z-10"
                style={{
                  gridColumn: `${gridColumnStart} / ${gridColumnEnd + 1}`,
                  gridRow: '1'
                }}
              >
                <span className="font-bold truncate">New Booking</span>
                <span className="opacity-90 truncate">Preview</span>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

// Floor section component
function FloorSection({ 
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
  // New props for drag-to-create
  isDragCreateMode,
  isDragCreating,
  dragCreateStart,
  dragCreateEnd,
  dragCreatePreview,
  onDragCreateStart,
  onDragCreateMove,
  onDragCreateEnd,
  // New props for expansion mode
  isExpansionMode,
  onResizeReservation,
  onShowDrinksModal,
  calculateContextMenuPosition,
  // New props for move mode
  isMoveMode,
  // New drag-create system props
  shouldHighlightCell,
  onCellClick,
  dragCreate
}: {
  floor: number;
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
  startDate: Date;
  isExpanded: boolean;
  onToggle: () => void;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
  isFullscreen?: boolean;
  onUpdateReservationStatus?: (id: string, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: string) => Promise<void>;
  // New props for drag-to-create
  isDragCreateMode?: boolean;
  isDragCreating?: boolean;
  dragCreateStart?: {roomId: string, dayIndex: number} | null;
  dragCreateEnd?: {roomId: string, dayIndex: number} | null;
  dragCreatePreview?: {roomId: string, startDay: number, endDay: number} | null;
  onDragCreateStart?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateMove?: (roomId: string, halfDayIndex: number) => void;
  onDragCreateEnd?: (roomId: string, halfDayIndex: number) => void;
  // New props for expansion mode
  isExpansionMode?: boolean;
  onResizeReservation?: (reservationId: string, side: 'start' | 'end', newDate: Date) => void;
  onShowDrinksModal?: (reservation: Reservation) => void;
  calculateContextMenuPosition?: (e: React.MouseEvent, menuWidth?: number, menuHeight?: number) => { x: number; y: number };
  // New props for move mode
  isMoveMode?: boolean;
  // New drag-create system props
  shouldHighlightCell?: (roomId: string, date: Date, isAM: boolean) => 'selectable' | 'preview' | 'hover-preview' | 'none';
  onCellClick?: (roomId: string, date: Date, isAM: boolean) => void;
  dragCreate?: any; // Drag create hook object
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
  guests,
  isExpanded, 
  onToggle,
  occupancyData,
  onRoomClick,
  onUpdateReservationStatus,
  onDeleteReservation,
  onShowDrinksModal
}: {
  floor: number;
  rooms: Room[];
  guests: Guest[];
  isExpanded: boolean;
  onToggle: () => void;
  occupancyData: Record<string, any>;
  onRoomClick: (room: Room, reservation?: any) => void;
  onUpdateReservationStatus?: (id: string, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: string) => Promise<void>;
  onShowDrinksModal?: (reservation: Reservation) => void;
}) {
  const floorName = floor === 4 ? 'Rooftop Premium' : `Floor ${floor}`;
  const occupiedRooms = rooms.filter(room => occupancyData[room.id]);
  const occupancyRate = rooms.length > 0 ? (occupiedRooms.length / rooms.length) * 100 : 0;
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    reservation: Reservation | null;
  }>({
    show: false,
    x: 0,
    y: 0,
    reservation: null
  });
  
  // Flag to prevent click through when closing context menu (room overview section)
  const [isClosingContextMenuRoomOverview, setIsClosingContextMenuRoomOverview] = useState(false);
  
  // Context menu positioning function (same as in main timeline)
  const calculateContextMenuPosition = (e: React.MouseEvent, menuWidth = 180, menuHeight = 300) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Check if menu would go off-screen horizontally
    if (x + menuWidth > viewportWidth) {
      x = e.clientX - menuWidth; // Position to the left of cursor
    }
    
    // Check if menu would go off-screen vertically
    if (y + menuHeight > viewportHeight) {
      y = e.clientY - menuHeight; // Position above cursor
    }
    
    // Ensure menu doesn't go above viewport top
    if (y < 0) {
      y = 10; // Small margin from top
    }
    
    // Ensure menu doesn't go left of viewport
    if (x < 0) {
      x = 10; // Small margin from left
    }
    
    return { x, y };
  };
  
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
              
              // Create lighter background colors for room cards
              const getStatusCardColors = (status: string) => {
                switch (status) {
                  case 'confirmed': return 'bg-orange-200 border-orange-600';
                  case 'checked-in': return 'bg-green-200 border-green-600';
                  case 'checked-out': return 'bg-gray-200 border-gray-600';
                  case 'room-closure': return 'bg-red-200 border-red-600';
                  case 'unallocated': return 'bg-blue-200 border-blue-600';
                  case 'incomplete-payment': return 'bg-red-200 border-red-600';
                  case 'available': return 'bg-white border-gray-200';
                  default: return 'bg-white border-gray-200';
                }
              };
              const guest = reservation ? guests.find(g => g.id === reservation.guestId) : null;
              
              // Calculate days left if occupied
              const daysLeft = reservation ? Math.ceil((reservation.checkOut.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : 0;
              
              return (
                <div
                  key={room.id}
                  className={`
                    relative p-3 rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md
                    ${isOccupied && status
                      ? `border-2 ${getStatusCardColors(status)}`
                      : 'border border-gray-200 hover:border-blue-300 hover:bg-blue-50 bg-white'
                    }
                    ${room.isPremium && !isOccupied ? 'bg-gradient-to-br from-yellow-50 to-amber-50' : ''}
                  `}
                  onClick={(e) => {
                    if (!isClosingContextMenuRoomOverview) {
                      onRoomClick(room, reservation);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (isOccupied && reservation) {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const position = calculateContextMenuPosition(e);
                      setContextMenu({
                        show: true,
                        x: position.x,
                        y: position.y,
                        reservation: reservation
                      });
                    }
                  }}
                  title={isOccupied 
                    ? `View reservation details for ${guest?.fullName || 'Guest'} (Right-click for options)`
                    : `Create new booking for ${formatRoomNumber(room)}`
                  }
                >
                  {/* Price in top right corner */}
                  {isOccupied && reservation && (
                    <div className="absolute top-2 right-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      €{reservation.totalAmount}
                    </div>
                  )}
                  
                  {/* Payment status icon */}
                  {isOccupied && reservation && (
                    <div className={`absolute top-8 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                      reservation.status === 'checked-out' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`} title={reservation.status === 'checked-out' ? 'Payment Complete' : 'Payment Pending'}>
                      <DollarSign className="h-3 w-3" />
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
                          {guest.fullName}
                        </div>
                        
                        {/* Guest composition with icons */}
                        <div className="flex items-center space-x-2 text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Users className="h-2.5 w-2.5" />
                            <span>{reservation.adults}</span>
                          </div>
                          {reservation.children.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Baby className="h-2.5 w-2.5" />
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
      
      {/* Context Menu for Room Overview */}
      {contextMenu.show && contextMenu.reservation && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setIsClosingContextMenuRoomOverview(true);
              setContextMenu({ show: false, x: 0, y: 0, reservation: null });
              // Reset flag after a short delay
              setTimeout(() => setIsClosingContextMenuRoomOverview(false), 100);
            }}
          />
          
          {/* Context Menu */}
          <div 
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px] z-[9999]"
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y
            }}
          >
            <button 
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
              onClick={async () => {
                if (contextMenu.reservation && onUpdateReservationStatus) {
                  try {
                    await onUpdateReservationStatus(contextMenu.reservation.id, 'checked-in');
                  } catch (error) {
                    console.error('Failed to check in guest:', error);
                  }
                }
                setContextMenu({ show: false, x: 0, y: 0, reservation: null });
              }}
            >
              <span className="text-green-600">✓</span>
              <span>Fast Check-in</span>
            </button>
            
            <button 
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
              onClick={async () => {
                if (contextMenu.reservation && onUpdateReservationStatus) {
                  try {
                    await onUpdateReservationStatus(contextMenu.reservation.id, 'checked-out');
                  } catch (error) {
                    console.error('Failed to check out guest:', error);
                  }
                }
                setContextMenu({ show: false, x: 0, y: 0, reservation: null });
              }}
            >
              <span className="text-blue-600">↗</span>
              <span>Fast Check-out</span>
            </button>

            <div className="border-t border-gray-100 my-1"></div>
            
            <button 
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
              onClick={() => {
                alert('Invoice creation feature coming soon!');
                setContextMenu({ show: false, x: 0, y: 0, reservation: null });
              }}
            >
              <span className="text-purple-600">📄</span>
              <span>Create Invoice</span>
            </button>
            
            <button 
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
              onClick={() => {
                alert('Payment tracking feature coming soon!');
                setContextMenu({ show: false, x: 0, y: 0, reservation: null });
              }}
            >
              <span className="text-yellow-600">💰</span>
              <span>Mark as Paid</span>
            </button>
            
            <button 
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3"
              onClick={() => {
                if (contextMenu.reservation && onShowDrinksModal) {
                  onShowDrinksModal(contextMenu.reservation);
                }
                setContextMenu({ show: false, x: 0, y: 0, reservation: null });
              }}
            >
              <span className="text-orange-600">🍷</span>
              <span>Add Room Service to Bill</span>
            </button>

            <div className="border-t border-gray-100 my-1"></div>
            
            <button 
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center space-x-3"
              onClick={async () => {
                if (contextMenu.reservation && onDeleteReservation) {
                  if (window.confirm(`Are you sure you want to delete the reservation for ${contextMenu.reservation.guestId}?`)) {
                    try {
                      await onDeleteReservation(contextMenu.reservation.id);
                    } catch (error) {
                      console.error('Failed to delete reservation:', error);
                    }
                  }
                }
                setContextMenu({ show: false, x: 0, y: 0, reservation: null });
              }}
            >
              <span className="text-red-600">×</span>
              <span>Delete Reservation</span>
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

// Main timeline component
export default function HotelTimeline({ isFullscreen = false, onToggleFullscreen }: HotelTimelineProps) {
  const { reservations, rooms, guests, isUpdating, createReservation, createGuest, updateReservation, updateReservationStatus, deleteReservation } = useHotel();
  
  // Simple drag-create functionality
  const dragCreate = useSimpleDragCreate();
  
  // State to bridge drag-create dates to modal
  const [dragCreatePreSelectedDates, setDragCreatePreSelectedDates] = useState<{checkIn: Date, checkOut: Date} | null>(null);
  
  // Create local state for immediate optimistic updates
  const [localReservations, setLocalReservations] = useState<Reservation[]>([]);
  
  // Sync local state with context state
  useEffect(() => {
    setLocalReservations(reservations);
  }, [reservations]);
  
  // Function to immediately update local state for optimistic updates
  const updateReservationInState = useCallback((id: string, updates: Partial<Reservation>) => {
    setLocalReservations(prev => 
      prev.map(r => r.id === id ? { ...r, ...updates } : r)
    );
  }, []);
  
  // Use consolidated timeline state management - cleaned up unused variables
  const {
    // State
    currentDate,
    overviewDate,
    expandedFloors,
    expandedOverviewFloors,
    selectedReservation,
    showReservationPopup,
    selectedRoom,
    showCreateBooking,
    roomChangeDialog,
    dragCreateDates, // Keep for fallback compatibility
    isExpansionMode,
    isMoveMode,
    roomsByFloor,
    currentOccupancy,
    
    // Actions
    handleNavigate,
    handleOverviewNavigate,
    toggleFloor,
    toggleOverviewFloor,
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
    clearDragCreate,
    positionContextMenu
  } = useHotelTimelineState();
  
  // Additional local state not in main hook (hotel orders modal)
  const [showHotelOrdersModal, setShowHotelOrdersModal] = useState(false);
  const [hotelOrdersReservation, setHotelOrdersReservation] = useState<Reservation | null>(null);

  // Room availability modal state
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState<Date | null>(null);
  const [selectedAvailabilityData, setSelectedAvailabilityData] = useState<DayAvailability | null>(null);
  
  // Note: Removed global mouse event listener since we're using two-click system instead of drag

  // Smart context menu positioning (now using service)
  const calculateContextMenuPosition = (e: React.MouseEvent, menuWidth = 180, menuHeight = 300) => {
    return positionContextMenu(e.clientX, e.clientY);
  };

  // Escape key listener to cancel drag-to-create
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragCreate.state.isSelecting) {
        dragCreate.actions.cancel();
      }
    };

    if (dragCreate.state.isSelecting) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [dragCreate.state.isSelecting]);

  // Keyboard shortcuts integration
  useEffect(() => {
    const initKeyboardShortcuts = async () => {
      const { KeyboardShortcutService } = await import('../../../lib/hotel/services/KeyboardShortcutService');
      const shortcutService = KeyboardShortcutService.getInstance();
      
      // Update context with current state
      shortcutService.updateContext({
        isModalOpen: showReservationPopup || showCreateBooking || roomChangeDialog.show,
        selectedReservations: selectedReservation ? [selectedReservation.id] : [],
        activeMode: dragCreate.state.isEnabled ? 'drag_create' : isExpansionMode ? 'expand' : isMoveMode ? 'move' : 'normal',
        currentDate: currentDate
      });

      // Listen for shortcut actions
      const handleShortcut = (event: CustomEvent) => {
        const { action } = event.detail;
        
        switch (action) {
          case 'navigate_prev_day':
            handleNavigate('PREV');
            break;
          case 'navigate_next_day':
            handleNavigate('NEXT');
            break;
          case 'navigate_today':
            handleNavigate('TODAY');
            break;
          case 'toggle_drag_create':
            dragCreate.state.isEnabled ? dragCreate.actions.disable() : dragCreate.actions.enable();
            break;
          case 'toggle_expansion':
            toggleExpansionMode();
            break;
          case 'toggle_move':
            toggleMoveMode();
            break;
          case 'escape':
            exitAllModes();
            if (showReservationPopup) closeReservationPopup();
            if (showCreateBooking) closeCreateBooking();
            if (roomChangeDialog.show) closeRoomChangeDialog();
            break;
          case 'move_reservation_left':
            handleMoveReservationArrow('left');
            break;
          case 'move_reservation_right':
            handleMoveReservationArrow('right');
            break;
        }
      };

      document.addEventListener('hotel-timeline-shortcut', handleShortcut as EventListener);
      
      return () => {
        document.removeEventListener('hotel-timeline-shortcut', handleShortcut as EventListener);
      };
    };

    initKeyboardShortcuts();
  }, [dragCreate.state.isEnabled, isExpansionMode, isMoveMode, showReservationPopup, showCreateBooking, roomChangeDialog.show, currentDate]);
  
  // Group rooms by floor
  // roomsByFloor and currentOccupancy now provided by useHotelTimelineState hook
  
  // toggleFloor, toggleOverviewFloor, handleNavigate, handleOverviewNavigate, 
  // and handleReservationClick now provided by useHotelTimelineState hook
  
  // handleRoomClick wrapper to handle room clicks with reservations
  const handleRoomClickWrapper = (room: Room, reservation?: any) => {
    if (reservation) {
      // Occupied room - show reservation details
      handleReservationClick(reservation);
    } else {
      // Empty room - show create booking modal
      console.log('Creating new booking for room:', room.number);
      handleRoomClick(room);
    }
  };

  // OPTIMIZED: Lightning-fast local conflict detection
  const basicRoomAvailabilityCheck = (excludeReservationId: string, roomId: string, checkIn: Date, checkOut: Date) => {
    // Use synchronous operations for instant feedback
    const roomReservations = localReservations.filter(r => 
      r.roomId === roomId && r.id !== excludeReservationId
    );
    
    const conflicts: any[] = [];
    const checkInTime = checkIn.getTime();
    const checkOutTime = checkOut.getTime();
    
    // Optimized overlap detection using timestamps
    for (const reservation of roomReservations) {
      const existingCheckIn = new Date(reservation.checkIn).getTime();
      const existingCheckOut = new Date(reservation.checkOut).getTime();
      
      // Check for date overlap using faster timestamp comparison
      if (!(checkOutTime <= existingCheckIn || checkInTime >= existingCheckOut)) {
        const guest = guests.find(g => g.id === reservation.guestId);
        conflicts.push({
          type: 'overlapping_reservation',
          severity: 'error',
          message: `Room ${roomId} is already booked by ${guest?.fullName || 'Guest'} from ${new Date(existingCheckIn).toLocaleDateString()} to ${new Date(existingCheckOut).toLocaleDateString()}`
        });
      }
    }
    
    return Promise.resolve({
      hasConflict: conflicts.length > 0,
      conflicts,
      warnings: [],
      suggestions: []
    });
  };
  
  const handleMoveReservation = async (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => {
    console.log('🎯 DRAG-DROP DEBUG: handleMoveReservation called with:', {
      reservationId,
      newRoomId,
      newCheckIn: newCheckIn.toISOString(),
      newCheckOut: newCheckOut.toISOString()
    });
    
    try {
      const reservation = localReservations.find(r => r.id === reservationId);
      if (!reservation) {
        console.error('❌ DRAG-DROP ERROR: Reservation not found:', { reservationId, availableIds: localReservations.map(r => r.id) });
        throw new Error('Reservation not found');
      }
      
      console.log('✅ DRAG-DROP: Found reservation:', {
        id: reservation.id,
        currentRoom: reservation.roomId,
        newRoom: newRoomId,
        guestId: reservation.guestId
      });

      // FAST conflict detection using local data (no database calls)
      console.log('⚡ DRAG-DROP: Using instant local conflict detection...');
      const conflictResult = await basicRoomAvailabilityCheck(reservationId, newRoomId, newCheckIn, newCheckOut);
      
      if (conflictResult.hasConflict) {
        const errorMessages = conflictResult.conflicts.map((c: any) => c.message).join('\n');
        hotelNotification.error('Move Blocked!', errorMessages, 5);
        
        // Show alternatives if available
        const firstConflict = conflictResult.conflicts[0];
        if (firstConflict?.suggestedAlternatives && firstConflict.suggestedAlternatives.length > 0) {
          const alternatives = firstConflict.suggestedAlternatives;
          const alternativeMessage = `Try these available rooms: ${alternatives.map((r: any) => `Room ${r.number}`).join(', ')}`;
          hotelNotification.info('Alternative Rooms', alternativeMessage, 7);
        }
        return;
      }
      
      // Show warnings
      if (conflictResult.warnings.length > 0) {
        const warningMessages = conflictResult.warnings.map((w: any) => w.message).join('\n');
        hotelNotification.warning('Move Warnings', warningMessages, 4);
      }

      console.log('📍 DRAG-DROP: Past conflict detection, proceeding with move...');

      const guest = guests.find(g => g.id === reservation.guestId);
      const newRoom = rooms.find(r => r.id === newRoomId);
      const oldRoom = rooms.find(r => r.id === reservation.roomId);

      if (!newRoom || !oldRoom) {
        throw new Error('Room not found');
      }

      // Check if room type is changing
      const isRoomTypeChange = oldRoom.type !== newRoom.type;
      
      const updatedReservationData: any = {
        roomId: newRoomId,
        checkIn: newCheckIn,
        checkOut: newCheckOut
      };

      if (isRoomTypeChange) {
        // Show custom room change dialog instead of proceeding immediately
        showRoomChangeDialog(reservationId, reservation.roomId, newRoomId);
        return; // Exit early, dialog handlers will complete the move
      }

      // If no room type change, proceed with optimistic updates for instant visual feedback
      console.log('🔄 DRAG-DROP: Starting optimistic update with data:', updatedReservationData);
      
      const { OptimisticUpdateService } = await import('../../../lib/hotel/services/OptimisticUpdateService');
      const optimisticService = OptimisticUpdateService.getInstance();
      
      console.log('🚀 DRAG-DROP: Calling optimisticMoveReservation...');
      const result = await optimisticService.optimisticMoveReservation(
        reservationId,
        reservation,
        newRoomId,
        newCheckIn,
        newCheckOut,
        updateReservationInState,
        async () => {
          console.log('📡 DRAG-DROP: About to call updateReservation with:', { reservationId, updatedReservationData });
          const updateResult = await updateReservation(reservationId, updatedReservationData);
          console.log('✅ DRAG-DROP: updateReservation completed:', updateResult);
          return updateResult;
        }
      );
      
      console.log('📊 DRAG-DROP: OptimisticUpdateService result:', result);

      if (!result.success) {
        console.error('❌ DRAG-DROP: OptimisticUpdateService failed:', result.error);
        hotelNotification.error(
          'Move Failed',
          result.error || 'Failed to move reservation. Please try again.',
          4
        );
        return;
      }

      const successMessage = `${guest?.fullName || 'Guest'} moved from ${formatRoomNumber(oldRoom)} to ${formatRoomNumber(newRoom)} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`;

      console.log('🎉 DRAG-DROP: Move successful! Showing notification:', successMessage);
      
      // Show success notification
      hotelNotification.success(
        'Reservation Moved Successfully!',
        successMessage,
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

  // Arrow key reservation movement handler
  const handleMoveReservationArrow = async (direction: 'left' | 'right') => {
    if (!selectedReservation) {
      hotelNotification.info('No Selection', 'Please select a reservation first to move it with arrow keys.', 3);
      return;
    }

    const reservation = localReservations.find(r => r.id === selectedReservation.id);
    if (!reservation) {
      hotelNotification.error('Reservation Not Found', 'Selected reservation could not be found.', 3);
      return;
    }

    // Calculate new dates (move 1 day left or right)
    const daysToMove = direction === 'left' ? -1 : 1;
    const newCheckIn = addDays(reservation.checkIn, daysToMove);
    const newCheckOut = addDays(reservation.checkOut, daysToMove);

    console.log(`🔄 Arrow key move ${direction}:`, {
      reservationId: reservation.id,
      currentCheckIn: reservation.checkIn,
      currentCheckOut: reservation.checkOut,
      newCheckIn,
      newCheckOut,
      roomId: reservation.roomId
    });

    // Use existing move function with same room, new dates
    await handleMoveReservation(reservation.id, reservation.roomId, newCheckIn, newCheckOut);
  };

  // Room change dialog handlers
  const handleConfirmRoomChange = async () => {
    if (!roomChangeDialog.show || !roomChangeDialog.reservationId) return;
    
    // Get reservation and room data from current state
    const reservation = localReservations.find(r => r.id === roomChangeDialog.reservationId);
    const targetRoom = rooms.find(r => r.id === roomChangeDialog.toRoomId);
    const currentRoom = rooms.find(r => r.id === roomChangeDialog.fromRoomId);
    
    if (!reservation || !targetRoom || !currentRoom) return;
    
    try {
      const { calculatePricing } = await import('../../../lib/hotel/pricingCalculator');
      
      const newPricing = calculatePricing(
        targetRoom.id,
        reservation.checkIn,
        reservation.checkOut,
        reservation.adults,
        reservation.children,
        {
          hasPets: reservation.petFee > 0,
          needsParking: reservation.parkingFee > 0,
          additionalCharges: reservation.additionalCharges
        },
        rooms
      );

      const updatedReservationData = {
        roomId: targetRoom.id,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        totalAmount: newPricing.total,
        subtotal: newPricing.subtotal,
        ...newPricing.fees
      };

      // Use optimistic updates for smooth UX
      const { OptimisticUpdateService } = await import('../../../lib/hotel/services/OptimisticUpdateService');
      const optimisticService = OptimisticUpdateService.getInstance();
      
      const result = await optimisticService.optimisticUpdateReservation(
        roomChangeDialog.reservationId,
        reservation,
        updatedReservationData,
        updateReservationInState,
        async () => {
          await updateReservation(roomChangeDialog.reservationId, updatedReservationData);
        }
      );

      if (result.success) {
        const guest = guests.find(g => g.id === reservation.guestId);
        const successMessage = `${guest?.fullName || 'Guest'} moved from ${formatRoomNumber(currentRoom)} to ${formatRoomNumber(targetRoom)} with updated pricing`;
        hotelNotification.success('Room Change Successful!', successMessage, 5);
      } else {
        hotelNotification.error('Move Failed!', result.error || 'Failed to move reservation', 5);
        return;
      }
      
      closeRoomChangeDialog();
    } catch (error) {
      console.error('Error confirming room change:', error);
      hotelNotification.error('Failed to Change Room', 'Unable to complete the room change. Please try again.', 5);
    }
  };

  const handleFreeUpgrade = async () => {
    if (!roomChangeDialog.show || !roomChangeDialog.reservationId) return;
    
    // Get reservation and room data from current state
    const reservation = localReservations.find(r => r.id === roomChangeDialog.reservationId);
    const targetRoom = rooms.find(r => r.id === roomChangeDialog.toRoomId);
    const currentRoom = rooms.find(r => r.id === roomChangeDialog.fromRoomId);
    
    if (!reservation || !targetRoom || !currentRoom) return;
    
    try {
      // Move to new room WITHOUT changing price (free upgrade)
      const updatedReservationData = {
        roomId: targetRoom.id,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        // Keep original pricing - it's a free upgrade!
        totalAmount: reservation.totalAmount
      };

      // Use optimistic updates for instant visual feedback
      const { OptimisticUpdateService } = await import('../../../lib/hotel/services/OptimisticUpdateService');
      const optimisticService = OptimisticUpdateService.getInstance();
      
      const result = await optimisticService.optimisticUpdateReservation(
        roomChangeDialog.reservationId,
        reservation,
        updatedReservationData,
        updateReservationInState,
        async () => {
          await updateReservation(roomChangeDialog.reservationId, updatedReservationData);
        }
      );

      if (result.success) {
        const guest = guests.find(g => g.id === reservation.guestId);
        const successMessage = `${guest?.fullName || 'Guest'} received a FREE UPGRADE from ${formatRoomNumber(currentRoom)} to ${formatRoomNumber(targetRoom)}!`;

        hotelNotification.success('Free Upgrade Applied!', successMessage, 7);
      } else {
        hotelNotification.error('Upgrade Failed!', result.error || 'Failed to apply free upgrade', 5);
        return;
      }
      
      closeRoomChangeDialog();
    } catch (error) {
      console.error('Error applying free upgrade:', error);
      hotelNotification.error('Failed to Apply Upgrade', 'Unable to complete the free upgrade. Please try again.', 5);
    }
  };

  // Old drag-create wrappers - REMOVED (using new useSimpleDragCreate system instead)

  // Handle reservation resize in expansion mode
  const handleResizeReservation = async (reservationId: string, side: 'start' | 'end', newDate: Date) => {
    try {
      console.log('Resize reservation:', { reservationId, side, newDate });
      
      const reservation = localReservations.find(r => r.id === reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      const room = rooms.find(r => r.id === reservation.roomId);
      const guest = guests.find(g => g.id === reservation.guestId);
      
      // Calculate new dates
      const newCheckIn = side === 'start' ? newDate : reservation.checkIn;
      const newCheckOut = side === 'end' ? newDate : reservation.checkOut;
      
      // Validate minimum stay (1 day)
      const daysDiff = Math.ceil((newCheckOut.getTime() - newCheckIn.getTime()) / (24 * 60 * 60 * 1000));
      if (daysDiff < 1) {
        hotelNotification.error(
          'Invalid Reservation Length',
          'Minimum stay is 1 day',
          3
        );
        return;
      }

      // Check for conflicts with other reservations in the same room
      const hasConflict = localReservations.some(r => 
        r.id !== reservationId && 
        r.roomId === reservation.roomId &&
        (
          (newCheckIn >= r.checkIn && newCheckIn < r.checkOut) ||
          (newCheckOut > r.checkIn && newCheckOut <= r.checkOut) ||
          (newCheckIn <= r.checkIn && newCheckOut >= r.checkOut)
        )
      );

      if (hasConflict) {
        hotelNotification.error(
          'Booking Conflict',
          'Another reservation conflicts with these dates',
          4
        );
        return;
      }

      // Calculate new pricing
      const { calculatePricing } = await import('../../../lib/hotel/pricingCalculator');
      const newPricing = calculatePricing(
        reservation.roomId,
        newCheckIn,
        newCheckOut,
        reservation.adults,
        reservation.children,
        {
          hasPets: reservation.petFee > 0,
          needsParking: reservation.parkingFee > 0,
          additionalCharges: reservation.additionalCharges
        },
        rooms
      );

      // Update reservation with optimistic updates for instant visual feedback
      const updatedData = {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        numberOfNights: newPricing.numberOfNights,
        subtotal: newPricing.subtotal,
        totalAmount: newPricing.total,
        ...newPricing.fees
      };

      // Use OptimisticUpdateService for instant UI feedback
      const { OptimisticUpdateService } = await import('../../../lib/hotel/services/OptimisticUpdateService');
      const optimisticService = OptimisticUpdateService.getInstance();
      
      const result = await optimisticService.optimisticUpdateReservation(
        reservationId,
        reservation,
        updatedData,
        updateReservationInState,
        async () => {
          // This is the actual server update
          await updateReservation(reservationId, updatedData);
        }
      );

      if (result.success) {
        // Show success notification with pricing info
        const oldTotal = reservation.totalAmount;
        const newTotal = newPricing.total;
        const priceDiff = newTotal - oldTotal;
        const priceChange = priceDiff > 0 ? `+€${priceDiff.toFixed(2)}` : `€${priceDiff.toFixed(2)}`;

        hotelNotification.success(
          'Reservation Updated!',
          `${guest?.fullName || 'Guest'} • ${room ? formatRoomNumber(room) : 'Room'} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()} • ${priceChange} (€${newTotal.toFixed(2)} total)`,
          6
        );
      } else {
        hotelNotification.error(
          'Update Failed',
          result.error || 'Failed to update reservation. Please try again.',
          4
        );
      }

    } catch (error) {
      console.error('Error resizing reservation:', error);
      hotelNotification.error(
        'Failed to Update Reservation',
        'Unable to change reservation dates. Please try again.',
        4
      );
    }
  };;

  // Old handleCreateBooking function removed - modal now handles its own booking creation
  
  // Convert reservation to CalendarEvent format for the popup
  const selectedEvent: CalendarEvent | null = useMemo(() => {
    if (!selectedReservation) return null;
    
    const room = rooms.find(r => r.id === selectedReservation.roomId);
    const guest = guests.find(g => g.id === selectedReservation.guestId);
    
    return {
      id: `event-${selectedReservation.id}`,
      reservationId: selectedReservation.id,
      roomId: selectedReservation.roomId,
      title: guest?.fullName || 'Guest',
      start: selectedReservation.checkIn,
      end: selectedReservation.checkOut,
      resource: {
        status: selectedReservation.status,
        guestName: guest?.fullName || 'Guest',
        roomNumber: room?.number || 'Unknown',
        numberOfGuests: selectedReservation.numberOfGuests,
        hasPets: guest?.hasPets || false
      }
    };
  }, [selectedReservation]);

  // Handle showing hotel orders modal (wrapper for local state management)
  const handleShowDrinksModalWrapper = (reservation: Reservation) => {
    setHotelOrdersReservation(reservation);
    setShowHotelOrdersModal(true);
    // Also update the hook state if needed
    handleShowDrinksModal(reservation.id);
  };

  // Handle showing room availability details modal
  const handleAvailabilityClick = (date: Date, availabilityData: DayAvailability) => {
    setSelectedAvailabilityDate(date);
    setSelectedAvailabilityData(availabilityData);
    setShowAvailabilityModal(true);
  };

  const handleCloseAvailabilityModal = () => {
    setShowAvailabilityModal(false);
    setSelectedAvailabilityDate(null);
    setSelectedAvailabilityData(null);
  };

  // Modern drag-create cell click handler
  const handleDragCreateCellClick = useCallback((roomId: string, date: Date, isAM: boolean) => {
    if (!dragCreate.state.isEnabled) return;
    
    console.log('🖱️ Cell clicked:', { roomId, date: date.toLocaleDateString(), isAM });
    
    if (!dragCreate.state.isSelecting && !isAM) {
      // First click: PM cell - start selection (check-in)
      console.log('🟢 Starting check-in selection');
      dragCreate.actions.startSelection(roomId, date);
    } else if (dragCreate.state.isSelecting && dragCreate.state.currentSelection && isAM) {
      // Second click: AM cell - complete selection (check-out)
      console.log('🔵 Completing check-out selection');
      const completedSelection = dragCreate.actions.completeSelection(date);
      
      if (completedSelection) {
        // Store the drag-create dates for the modal
        const dragDates = {
          checkIn: completedSelection.checkInDate,
          checkOut: completedSelection.checkOutDate!
        };
        setDragCreatePreSelectedDates(dragDates);
        console.log('📅 Drag-create dates stored:', dragDates);
        
        // Open booking modal with the selected dates
        const room = rooms.find(r => r.id === roomId);
        if (room) {
          console.log('🚀 Opening booking modal with drag-create dates');
          handleRoomClick(room);
          // Note: Reset drag-create state after modal closes
        }
      }
    }
  }, [dragCreate, rooms, handleRoomClick]);

  // Handle hotel orders completion
  const handleDrinksOrderComplete = async (orderItems: OrderItem[], totalAmount: number) => {
    if (!hotelOrdersReservation) return;

    try {
      // Add order charges to reservation bill
      const guest = guests.find(g => g.id === hotelOrdersReservation.guestId);
      const room = rooms.find(r => r.id === hotelOrdersReservation.roomId);
      
      // Convert OrderItems to RoomServiceItems
      const roomServiceItems = orderItems.map(item => ({
        id: `rs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.totalPrice,
        orderedAt: new Date()
      }));
      
      // Update the reservation with room service items
      const existingRoomServiceItems = hotelOrdersReservation.roomServiceItems || [];
      const updatedReservation = {
        ...hotelOrdersReservation,
        totalAmount: hotelOrdersReservation.totalAmount + totalAmount,
        roomServiceItems: [...existingRoomServiceItems, ...roomServiceItems],
        notes: hotelOrdersReservation.notes + 
          `
Room Service ordered (${new Date().toLocaleDateString()}): ${orderItems.map(item => 
            `${item.quantity}x ${item.itemName}`
          ).join(', ')} - Total: €${totalAmount.toFixed(2)}`
      };

      await updateReservation(hotelOrdersReservation.id, updatedReservation);

      // Show success notification
      hotelNotification.success(
        'Room Service Added to Bill',
        `€${totalAmount.toFixed(2)} in charges added to Room ${room ? formatRoomNumber(room) : hotelOrdersReservation.roomId} bill`,
        4
      );

      setShowHotelOrdersModal(false);
      setHotelOrdersReservation(null);
    } catch (error) {
      console.error('Failed to add room service to bill:', error);
      hotelNotification.error(
        'Failed to Add Room Service',
        'Unable to add room service to room bill. Please try again.',
        5
      );
    }
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      <div className="h-full flex flex-col">
        {/* Mode Status Indicator */}
        {(dragCreate.state.isEnabled || isExpansionMode || isMoveMode) && (
          <div className={`px-4 py-2 text-sm font-medium text-white ${
            dragCreate.state.isEnabled ? 'bg-blue-600' : 
            isExpansionMode ? 'bg-green-600' : 
            'bg-purple-600'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              {dragCreate.state.isEnabled && (
                <>
                  <MousePointer2 className="h-4 w-4" />
                  <span>Drag Create Mode: Click PM slots to start, AM slots to finish creating reservations</span>
                </>
              )}
              {isExpansionMode && (
                <>
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>Expansion Mode: Use resize controls (← →) on reservations to extend or shorten stays</span>
                </>
              )}
              {isMoveMode && (
                <>
                  <Move className="h-4 w-4" />
                  <span>Move Mode: Drag reservations or use arrow controls to move between rooms and dates</span>
                </>
              )}
            </div>
          </div>
        )}

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
            <SimpleDragCreateButton
              state={dragCreate.state}
              onToggle={() => dragCreate.state.isEnabled ? dragCreate.actions.disable() : dragCreate.actions.enable()}
            />
            
            <Button 
              variant={isExpansionMode ? "default" : "outline"} 
              onClick={toggleExpansionMode}
              className={`transition-all duration-200 ${isExpansionMode ? "bg-green-600 hover:bg-green-700 text-white shadow-lg" : "hover:bg-green-50"}`}
              title={isExpansionMode ? 'Click to exit expand mode' : 'Show resize controls on reservations to extend/shorten stays'}
            >
              {isExpansionMode ? <Square className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
              {isExpansionMode ? 'Exit Expand Mode' : 'Expand Reservations'}
            </Button>
            
            <Button 
              variant={isMoveMode ? "default" : "outline"} 
              onClick={toggleMoveMode}
              className={`transition-all duration-200 ${isMoveMode ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg" : "hover:bg-purple-50"}`}
              title={isMoveMode ? 'Click to exit move mode' : 'Show drag handles and move controls on reservations'}
            >
              {isMoveMode ? <Square className="h-4 w-4" /> : <Move className="h-4 w-4" />}
              {isMoveMode ? 'Exit Move Mode' : 'Move Reservations'}
            </Button>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5" />
                <span>Room Status Overview - {format(overviewDate, 'MMMM dd, yyyy')}</span>
              </h3>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOverviewNavigate('PREV')}
                  title="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOverviewNavigate('TODAY')}
                  title="Today"
                >
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOverviewNavigate('NEXT')}
                  title="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {Object.entries(roomsByFloor).map(([floor, rooms]) => (
                <RoomOverviewFloorSection
                  key={`overview-${floor}`}
                  floor={parseInt(floor)}
                  rooms={rooms}
                  guests={guests}
                  isExpanded={expandedOverviewFloors[parseInt(floor)]}
                  onToggle={() => toggleOverviewFloor(parseInt(floor))}
                  occupancyData={currentOccupancy}
                  onRoomClick={handleRoomClickWrapper}
                  onUpdateReservationStatus={updateReservationStatus}
                  onDeleteReservation={deleteReservation}
                  onShowDrinksModal={handleShowDrinksModalWrapper}
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
            rooms={rooms}
            reservations={localReservations}
            onAvailabilityClick={handleAvailabilityClick}
          />
          
          {/* Floor sections */}
          <div>
            {Object.entries(roomsByFloor).map(([floor, rooms]) => (
              <FloorSection
                key={floor}
                floor={parseInt(floor)}
                rooms={rooms}
                reservations={localReservations}
                guests={guests}
                startDate={currentDate}
                isExpanded={expandedFloors[parseInt(floor)]}
                onToggle={() => toggleFloor(parseInt(floor))}
                onReservationClick={handleReservationClick}
                onMoveReservation={handleMoveReservation}
                isFullscreen={isFullscreen}
                onUpdateReservationStatus={updateReservationStatus}
                onDeleteReservation={deleteReservation}
                isDragCreateMode={dragCreate.state.isEnabled}
                isDragCreating={dragCreate.state.isSelecting}
                isExpansionMode={isExpansionMode}
                isMoveMode={isMoveMode}
                onResizeReservation={handleResizeReservation}
                onShowDrinksModal={handleShowDrinksModalWrapper}
                calculateContextMenuPosition={calculateContextMenuPosition}
                onCellClick={handleDragCreateCellClick}
                shouldHighlightCell={dragCreate.shouldHighlightCell}
                dragCreate={dragCreate}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Reservation Popup */}
      <ReservationPopup
        isOpen={showReservationPopup}
        onClose={closeReservationPopup}
        event={selectedEvent}
        onStatusChange={(reservationId, newStatus) => {
          console.log(`Status change: ${reservationId} -> ${newStatus}`);
          // TODO: Update reservation status in state
          closeReservationPopup();
        }}
      />

      {/* Create Booking Modal */}
      {selectedRoom && (
        <NewCreateBookingModal
          isOpen={showCreateBooking}
          onClose={() => {
            closeCreateBooking();
            // Clear both old and new drag create systems
            clearDragCreate(); 
            setDragCreatePreSelectedDates(null);
            dragCreate.actions.disable();
            console.log('🧹 Cleared all drag-create states on modal close');
          }}
          room={selectedRoom}
          currentDate={currentDate}
          preSelectedDates={dragCreatePreSelectedDates || dragCreateDates} // Use new system first, fallback to old
        />
      )}

      {/* Room Change Confirmation Dialog */}
      {roomChangeDialog.show && (() => {
        const reservation = localReservations.find(r => r.id === roomChangeDialog.reservationId);
        const currentRoom = rooms.find(r => r.id === roomChangeDialog.fromRoomId);
        const targetRoom = rooms.find(r => r.id === roomChangeDialog.toRoomId);
        const guest = reservation ? guests.find(g => g.id === reservation.guestId) || null : null;
        
        if (!reservation || !currentRoom || !targetRoom) return null;
        
        return (
          <RoomChangeConfirmDialog
            isOpen={roomChangeDialog.show}
            onClose={closeRoomChangeDialog}
            currentRoom={currentRoom}
            targetRoom={targetRoom}
            reservation={reservation}
            guest={guest}
            onConfirmChange={handleConfirmRoomChange}
            onFreeUpgrade={handleFreeUpgrade}
          />
        );
      })()}

      {/* Hotel Orders Modal - Reuses OrdersPage functionality */}
      {showHotelOrdersModal && hotelOrdersReservation && (
        <HotelOrdersModal
          reservation={hotelOrdersReservation}
          isOpen={showHotelOrdersModal}
          onClose={() => {
            setShowHotelOrdersModal(false);
            setHotelOrdersReservation(null);
          }}
          onOrderComplete={handleDrinksOrderComplete}
        />
      )}

      {/* Room Availability Details Modal */}
      <RoomAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={handleCloseAvailabilityModal}
        date={selectedAvailabilityDate}
        availabilityData={selectedAvailabilityData}
      />

      {/* Simple drag-create is active when enabled */}
      </div>
    </DndProvider>
  );
}