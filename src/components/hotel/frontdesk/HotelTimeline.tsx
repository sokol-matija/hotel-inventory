import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { HOTEL_POREC_ROOMS, getRoomsByFloor } from '../../../lib/hotel/hotelData';
import { SAMPLE_GUESTS } from '../../../lib/hotel/sampleData';
import { useHotel } from '../../../lib/hotel/state/HotelContext';
import { RESERVATION_STATUS_COLORS, formatRoomNumber, getRoomTypeDisplay } from '../../../lib/hotel/calendarUtils';
import { getCountryFlag } from '../../../lib/hotel/countryFlags';
import { CalendarEvent, ReservationStatus, Reservation, Room } from '../../../lib/hotel/types';
import ReservationPopup from './Reservations/ReservationPopup';
import CreateBookingModal from './CreateBookingModal';
import RoomChangeConfirmDialog from './RoomChangeConfirmDialog';
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
  onResizeReservation
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
  onResizeReservation?: (reservationId: string, side: 'start' | 'end', newDate: Date) => void;
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
      guestName: guest?.name || 'Guest',
      reservation
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [reservation, room, guest]);

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
      // Smooth animation when position updates after drop
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
  }, [gridColumnStart, gridColumnEnd, isDragging]);

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
      className={`rounded cursor-pointer hover:shadow-md border flex items-center px-2 py-0.5 text-xs font-medium overflow-hidden group z-10 pointer-events-auto ${
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
          guestName: guest?.name,
          clientX: e.clientX,
          clientY: e.clientY,
          target: e.target
        });
        
        e.preventDefault();
        e.stopPropagation();
        
        // Show context menu at cursor position
        const newContextMenu = {
          show: true,
          x: e.clientX,
          y: e.clientY,
          reservation: reservation
        };
        
        console.log('[CONTEXT MENU] Setting context menu state:', newContextMenu);
        setContextMenu(newContextMenu);
        
        console.log('[CONTEXT MENU] State set complete');
      }}
      title={`${guest?.name || 'Guest'} - ${reservation.numberOfGuests} guests ${isDragging ? '(Dragging...)' : '(Click for details)'}`}
    >
      {/* Main content with proper spacing for drag handle */}
      <div className={`flex items-center space-x-2 min-w-0 flex-1 ${
        isShortReservation ? 'pt-2' : ''
      }`}>
        {/* Country flag */}
        <span className="text-xs flex-shrink-0">{flag}</span>
        
        {/* Guest info - name with guest count */}
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          <span className="truncate font-medium text-xs">
            {guest?.name || 'Guest'}
          </span>
          
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
        
        {/* Drag handle for longer reservations only */}
        {!isShortReservation && (
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
      
      {/* Top drag handle for short reservations - small circle with plus */}
      {isShortReservation && (
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
      


      


      
      {/* Hover tooltip */}
      <div className="absolute top-full left-0 mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-20 whitespace-nowrap">
        {guest?.name} • {reservation.numberOfGuests} guests • {format(reservation.checkIn, 'MMM dd')} - {format(reservation.checkOut, 'MMM dd')}
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
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center space-y-1 -ml-6">
            {/* Expand left button (extend to previous day PM) */}
            <button
              className="w-5 h-5 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-sm hover:shadow-md"
              title="Expand to previous day (PM)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && startDayIndex > 0) {
                  const newCheckIn = addDays(reservation.checkIn, -1);
                  newCheckIn.setHours(15, 0, 0, 0); // 3 PM
                  onResizeReservation(reservation.id, 'start', newCheckIn);
                }
              }}
              disabled={startDayIndex <= 0}
            >
              ←
            </button>
            
            {/* Contract left button (remove one day from start) */}
            <button
              className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-sm hover:shadow-md"
              title="Contract from left (remove one day)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && reservationDays > 1) {
                  const newCheckIn = addDays(reservation.checkIn, 1);
                  newCheckIn.setHours(15, 0, 0, 0); // 3 PM
                  onResizeReservation(reservation.id, 'start', newCheckIn);
                }
              }}
              disabled={reservationDays <= 1}
            >
              +
            </button>
          </div>
          
          {/* Right side controls (check-out adjustment) */}
          <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center space-y-1 -mr-6">
            {/* Expand right button (extend to next day AM) */}
            <button
              className="w-5 h-5 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-sm hover:shadow-md"
              title="Expand to next day (AM)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && endDayIndex < 13) {
                  const newCheckOut = addDays(reservation.checkOut, 1);
                  newCheckOut.setHours(11, 0, 0, 0); // 11 AM
                  onResizeReservation(reservation.id, 'end', newCheckOut);
                }
              }}
              disabled={endDayIndex >= 13}
            >
              →
            </button>
            
            {/* Contract right button (remove one day from end) */}
            <button
              className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-sm hover:shadow-md"
              title="Contract from right (remove one day)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeReservation && reservationDays > 1) {
                  const newCheckOut = addDays(reservation.checkOut, -1);
                  newCheckOut.setHours(11, 0, 0, 0); // 11 AM
                  onResizeReservation(reservation.id, 'end', newCheckOut);
                }
              }}
              disabled={reservationDays <= 1}
            >
              -
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
  onDragCreateEnd
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

  // Check if this cell is available for drag creation
  // CONSTRAINT: Only PM cells can start drag-to-create, only AM cells can end drag-to-create
  const isAvailableForDragCreate = isDragCreateMode && !hasExistingReservation && (
    !isDragCreating ? isSecondHalf : // Can only start dragging from PM cells
    true // During dragging, allow moving through any available cell
  );

  // Drop zone for half-day positioning with CONSTRAINTS
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.RESERVATION,
    drop: (item: any) => {
      const originalDuration = Math.ceil((item.checkOut.getTime() - item.checkIn.getTime()) / (24 * 60 * 60 * 1000));
      
      if (isSecondHalf) {
        // CONSTRAINT: PM cells only accept check-in (left edge of reservation)
        const newCheckIn = new Date(date);
        newCheckIn.setHours(15, 0, 0, 0); // 3:00 PM check-in
        
        const newCheckOut = addDays(newCheckIn, originalDuration);
        newCheckOut.setHours(11, 0, 0, 0); // 11:00 AM check-out
        
        onMoveReservation(item.reservationId, room.id, newCheckIn, newCheckOut);
      } else {
        // CONSTRAINT: AM cells only accept check-out (right edge of reservation)
        const newCheckOut = new Date(date);
        newCheckOut.setHours(11, 0, 0, 0); // 11:00 AM check-out
        
        const newCheckIn = addDays(newCheckOut, -originalDuration);
        newCheckIn.setHours(15, 0, 0, 0); // 3:00 PM check-in (duration days before)
        
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
      
      return !hasExistingReservation && !isSamePosition && isValidDropZone;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [room, dayIndex, halfDayIndex, isSecondHalf, date, onMoveReservation, hasExistingReservation]);

  // Handle two-click drag-to-create system
  const handleClick = (e: React.MouseEvent) => {
    if (!isDragCreateMode || !isAvailableForDragCreate) return;
    
    e.preventDefault();
    
    if (!isDragCreating) {
      // FIRST CLICK: Start selection (only on PM cells)
      if (isSecondHalf && onDragCreateStart) {
        onDragCreateStart(room.id, halfDayIndex);
      }
    } else {
      // SECOND CLICK: End selection (only on AM cells)
      if (!isSecondHalf && onDragCreateEnd) {
        onDragCreateEnd(room.id, halfDayIndex);
      }
    }
  };

  // Handle right-click to cancel selection
  const handleRightClick = (e: React.MouseEvent) => {
    if (isDragCreateMode && isDragCreating) {
      e.preventDefault();
      // Cancel the current selection - will be handled by parent component
    }
  };

  const handleMouseEnter = () => {
    // Show hover preview during selection
    if (isDragCreating && isAvailableForDragCreate && onDragCreateMove) {
      onDragCreateMove(room.id, halfDayIndex);
    }
  };

  return (
    <div 
      ref={drop as any}
      className={`h-12 border-r border-gray-200 transition-all duration-200 relative ${
        isInDragPreview
          ? 'bg-blue-200 border-2 border-blue-400'
          : isOver && canDrop 
          ? 'bg-green-100 border-2 border-green-400' 
          : isOver && !canDrop 
          ? 'bg-red-100 border-2 border-red-400' 
          : isAvailableForDragCreate
          ? 'bg-blue-50/50 hover:bg-blue-100/70 cursor-crosshair'
          : isWeekend
          ? 'bg-orange-50/20'
          : isSecondHalf 
          ? 'bg-green-50/20 hover:bg-green-50/40' // Check-in zone (PM)
          : 'bg-red-50/20 hover:bg-red-50/40'     // Check-out zone (AM)
      }`}
      title={
        isDragCreateMode && isAvailableForDragCreate 
          ? (!isDragCreating 
            ? `Click to ${isSecondHalf ? 'start reservation on' : 'select'} ${format(date, 'MMM dd')} ${isSecondHalf ? 'PM (Check-in)' : 'AM'}`
            : `Click to ${!isSecondHalf ? 'end reservation on' : 'continue to'} ${format(date, 'MMM dd')} ${!isSecondHalf ? 'AM (Check-out)' : 'PM'}`
          )
          : canDrop 
          ? `Drop here to ${isSecondHalf ? 'move check-in to' : 'move check-out to'} ${format(date, 'MMM dd')} ${isSecondHalf ? '3:00 PM' : '11:00 AM'}` 
          : isSecondHalf 
          ? 'Check-in zone (PM) - Drop to move reservation start'
          : 'Check-out zone (AM) - Drop to move reservation end'
      }
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onMouseEnter={handleMouseEnter}
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
      
      {/* Two-click create visual feedback */}
      {isDragCreateMode && isAvailableForDragCreate && !isDragCreating && (
        <div className={`absolute inset-0 ${
          isSecondHalf 
            ? 'bg-green-100 border-2 border-green-300 border-dashed' 
            : 'bg-gray-100 opacity-50'
        } flex items-center justify-center`}>
          {isSecondHalf && (
            <span className="text-xs font-bold text-green-700">CLICK</span>
          )}
        </div>
      )}
      
      {/* Active selection highlighting (after first click) */}
      {isDragCreating && isAvailableForDragCreate && !isInDragPreview && (
        <div className={`absolute inset-0 ${
          !isSecondHalf 
            ? 'bg-red-100 border-2 border-red-300 border-dashed' 
            : 'bg-blue-100 border border-blue-200'
        } flex items-center justify-center`}>
          {!isSecondHalf && (
            <span className="text-xs font-bold text-red-700">CLICK</span>
          )}
        </div>
      )}

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
  onResizeReservation
}: {
  room: Room;
  reservations: Reservation[];
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
            />
          );
        })}
      </div>
      
      {/* Reservation blocks overlaid on the same grid - Updated for half-day system */}
      <div className="absolute inset-0 grid grid-cols-[180px_repeat(28,minmax(22px,1fr))] pointer-events-none">
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
              isFullscreen={isFullscreen}
              onUpdateReservationStatus={onUpdateReservationStatus}
              onDeleteReservation={onDeleteReservation}
              isExpansionMode={isExpansionMode}
              onResizeReservation={onResizeReservation}
            />
          );
        })}
      </div>
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
  onResizeReservation
}: {
  floor: number;
  rooms: Room[];
  reservations: Reservation[];
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
              onResizeReservation={onResizeReservation}
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
  onRoomClick,
  onUpdateReservationStatus,
  onDeleteReservation
}: {
  floor: number;
  rooms: Room[];
  isExpanded: boolean;
  onToggle: () => void;
  occupancyData: Record<string, any>;
  onRoomClick: (room: Room, reservation?: any) => void;
  onUpdateReservationStatus?: (id: string, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: string) => Promise<void>;
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
  
  // Flag to prevent click through when closing context menu
  const [isClosingContextMenu, setIsClosingContextMenu] = useState(false);
  
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
                  onClick={(e) => {
                    if (!isClosingContextMenu) {
                      onRoomClick(room, reservation);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (isOccupied && reservation) {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      setContextMenu({
                        show: true,
                        x: e.clientX,
                        y: e.clientY,
                        reservation: reservation
                      });
                    }
                  }}
                  title={isOccupied 
                    ? `View reservation details for ${guest?.name || 'Guest'} (Right-click for options)`
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
                          {guest.name}
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
  const { reservations, isUpdating, createReservation, createGuest, updateReservation, updateReservationStatus, deleteReservation } = useHotel();
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
  const [overviewDate, setOverviewDate] = useState(new Date());
  
  // Room change confirmation dialog state
  const [roomChangeDialog, setRoomChangeDialog] = useState<{
    show: boolean;
    reservationId: string;
    currentRoom: Room | null;
    targetRoom: Room | null;
    newCheckIn: Date | null;
    newCheckOut: Date | null;
    reservation: Reservation | null;
    guest: any;
  }>({
    show: false,
    reservationId: '',
    currentRoom: null,
    targetRoom: null,
    newCheckIn: null,
    newCheckOut: null,
    reservation: null,
    guest: null
  });
  
  // Drag-to-create reservation states
  const [isDragCreateMode, setIsDragCreateMode] = useState(false);
  const [isDragCreating, setIsDragCreating] = useState(false);
  const [dragCreateStart, setDragCreateStart] = useState<{roomId: string, dayIndex: number} | null>(null);
  const [dragCreateEnd, setDragCreateEnd] = useState<{roomId: string, dayIndex: number} | null>(null);
  const [dragCreatePreview, setDragCreatePreview] = useState<{roomId: string, startDay: number, endDay: number} | null>(null);
  const [dragCreateDates, setDragCreateDates] = useState<{checkIn: Date, checkOut: Date} | null>(null);
  
  // Expansion mode states
  const [isExpansionMode, setIsExpansionMode] = useState(false);
  
  // Note: Removed global mouse event listener since we're using two-click system instead of drag

  // Escape key listener to cancel drag-to-create
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragCreating) {
        handleCancelDragCreate();
      }
    };

    if (isDragCreating) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDragCreating]);
  
  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    return {
      1: getRoomsByFloor(1),
      2: getRoomsByFloor(2),
      3: getRoomsByFloor(3),
      4: getRoomsByFloor(4)
    };
  }, []);
  
  // Get current occupancy data for the overview date
  const currentOccupancy = useMemo(() => {
    const targetDate = startOfDay(overviewDate);
    const occupancy: Record<string, any> = {};
    
    reservations.forEach(reservation => {
      const checkInDate = startOfDay(reservation.checkIn);
      const checkOutDate = startOfDay(reservation.checkOut);
      
      if (targetDate >= checkInDate && targetDate < checkOutDate) {
        occupancy[reservation.roomId] = {
          reservation,
          status: reservation.status
        };
      }
    });
    
    return occupancy;
  }, [reservations, overviewDate]);
  
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

  const handleOverviewNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    if (action === 'PREV') {
      setOverviewDate(prev => addDays(prev, -1));
    } else if (action === 'NEXT') {
      setOverviewDate(prev => addDays(prev, 1));
    } else if (action === 'TODAY') {
      setOverviewDate(new Date());
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
        setRoomChangeDialog({
          show: true,
          reservationId,
          currentRoom: oldRoom,
          targetRoom: newRoom,
          newCheckIn,
          newCheckOut,
          reservation,
          guest
        });
        return; // Exit early, dialog handlers will complete the move
      }

      // If no room type change, proceed normally
      await updateReservation(reservationId, updatedReservationData);

      const successMessage = `${guest?.name || 'Guest'} moved from ${formatRoomNumber(oldRoom)} to ${formatRoomNumber(newRoom)} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`;

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

  // Room change dialog handlers
  const handleConfirmRoomChange = async () => {
    if (!roomChangeDialog.reservation || !roomChangeDialog.targetRoom || !roomChangeDialog.currentRoom) return;
    
    try {
      const { calculatePricing } = await import('../../../lib/hotel/pricingCalculator');
      
      const newPricing = calculatePricing(
        roomChangeDialog.targetRoom.id,
        roomChangeDialog.newCheckIn!,
        roomChangeDialog.newCheckOut!,
        roomChangeDialog.reservation.adults,
        roomChangeDialog.reservation.children,
        {
          hasPets: roomChangeDialog.reservation.petFee > 0,
          needsParking: roomChangeDialog.reservation.parkingFee > 0,
          additionalCharges: roomChangeDialog.reservation.additionalCharges
        }
      );

      const updatedReservationData = {
        roomId: roomChangeDialog.targetRoom.id,
        checkIn: roomChangeDialog.newCheckIn!,
        checkOut: roomChangeDialog.newCheckOut!,
        totalAmount: newPricing.total,
        subtotal: newPricing.subtotal,
        ...newPricing.fees
      };

      await updateReservation(roomChangeDialog.reservationId, updatedReservationData);

      const successMessage = `${roomChangeDialog.guest?.name || 'Guest'} moved from ${formatRoomNumber(roomChangeDialog.currentRoom)} to ${formatRoomNumber(roomChangeDialog.targetRoom)} with updated pricing`;

      hotelNotification.success('Room Change Successful!', successMessage, 5);
      
      setRoomChangeDialog({ show: false, reservationId: '', currentRoom: null, targetRoom: null, newCheckIn: null, newCheckOut: null, reservation: null, guest: null });
    } catch (error) {
      console.error('Error confirming room change:', error);
      hotelNotification.error('Failed to Change Room', 'Unable to complete the room change. Please try again.', 5);
    }
  };

  const handleFreeUpgrade = async () => {
    if (!roomChangeDialog.reservation || !roomChangeDialog.targetRoom || !roomChangeDialog.currentRoom) return;
    
    try {
      // Move to new room WITHOUT changing price (free upgrade)
      const updatedReservationData = {
        roomId: roomChangeDialog.targetRoom.id,
        checkIn: roomChangeDialog.newCheckIn!,
        checkOut: roomChangeDialog.newCheckOut!,
        // Keep original pricing - it's a free upgrade!
        totalAmount: roomChangeDialog.reservation.totalAmount
      };

      await updateReservation(roomChangeDialog.reservationId, updatedReservationData);

      const successMessage = `${roomChangeDialog.guest?.name || 'Guest'} received a FREE UPGRADE from ${formatRoomNumber(roomChangeDialog.currentRoom)} to ${formatRoomNumber(roomChangeDialog.targetRoom)}!`;

      hotelNotification.success('Free Upgrade Applied!', successMessage, 7);
      
      setRoomChangeDialog({ show: false, reservationId: '', currentRoom: null, targetRoom: null, newCheckIn: null, newCheckOut: null, reservation: null, guest: null });
    } catch (error) {
      console.error('Error applying free upgrade:', error);
      hotelNotification.error('Failed to Apply Upgrade', 'Unable to complete the free upgrade. Please try again.', 5);
    }
  };

  // Drag-to-create handlers (updated for half-day system)
  const handleDragCreateStart = (roomId: string, halfDayIndex: number) => {
    // Convert half-day index to day index (PM cell)
    const dayIndex = Math.floor(halfDayIndex / 2);
    setIsDragCreating(true);
    setDragCreateStart({ roomId, dayIndex });
    setDragCreateEnd({ roomId, dayIndex });
    setDragCreatePreview({ roomId, startDay: dayIndex, endDay: dayIndex });
  };

  const handleDragCreateMove = (roomId: string, halfDayIndex: number) => {
    if (isDragCreating && dragCreateStart && dragCreateStart.roomId === roomId) {
      // Convert half-day index to day index
      const dayIndex = Math.floor(halfDayIndex / 2);
      setDragCreateEnd({ roomId, dayIndex });
      const startDay = Math.min(dragCreateStart.dayIndex, dayIndex);
      const endDay = Math.max(dragCreateStart.dayIndex, dayIndex);
      setDragCreatePreview({ roomId, startDay, endDay });
    }
  };

  const handleDragCreateEnd = (roomId: string, halfDayIndex: number) => {
    if (isDragCreating && dragCreateStart && dragCreatePreview) {
      setIsDragCreating(false);
      
      // Calculate the dates
      const startDay = dragCreatePreview.startDay;
      const endDay = dragCreatePreview.endDay;
      const checkInDate = addDays(currentDate, startDay);
      const checkOutDate = addDays(currentDate, endDay); // No +1 needed - endDay is already the checkout day
      
      checkInDate.setHours(15, 0, 0, 0); // 3 PM check-in
      checkOutDate.setHours(11, 0, 0, 0); // 11 AM check-out
      
      // Find the room and open booking modal
      const room = HOTEL_POREC_ROOMS.find(r => r.id === roomId);
      if (room) {
        setSelectedRoom(room);
        // Store the dates to pre-populate the modal
        setDragCreateDates({ checkIn: checkInDate, checkOut: checkOutDate });
        setShowCreateBooking(true);
      }
      
      // Reset drag states
      setDragCreateStart(null);
      setDragCreateEnd(null);
      setDragCreatePreview(null);
    }
  };

  // Cancel drag-to-create selection (for right-click or escape)
  const handleCancelDragCreate = () => {
    setIsDragCreating(false);
    setDragCreateStart(null);
    setDragCreateEnd(null);
    setDragCreatePreview(null);
  };

  // Handle reservation resize in expansion mode
  const handleResizeReservation = async (reservationId: string, side: 'start' | 'end', newDate: Date) => {
    try {
      console.log('Resize reservation:', { reservationId, side, newDate });
      
      const reservation = reservations.find(r => r.id === reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      const room = HOTEL_POREC_ROOMS.find(r => r.id === reservation.roomId);
      const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
      
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
      const hasConflict = reservations.some(r => 
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
        }
      );

      // Update reservation
      const updatedData = {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        numberOfNights: newPricing.numberOfNights,
        subtotal: newPricing.subtotal,
        totalAmount: newPricing.total,
        ...newPricing.fees
      };

      await updateReservation(reservationId, updatedData);

      // Show success notification with pricing info
      const oldTotal = reservation.totalAmount;
      const newTotal = newPricing.total;
      const priceDiff = newTotal - oldTotal;
      const priceChange = priceDiff > 0 ? `+€${priceDiff.toFixed(2)}` : `€${priceDiff.toFixed(2)}`;

      hotelNotification.success(
        'Reservation Updated!',
        `${guest?.name || 'Guest'} • ${room ? formatRoomNumber(room) : 'Room'} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()} • ${priceChange} (€${newTotal.toFixed(2)} total)`,
        6
      );

    } catch (error) {
      console.error('Error resizing reservation:', error);
      hotelNotification.error(
        'Failed to Update Reservation',
        'Unable to change reservation dates. Please try again.',
        4
      );
    }
  };;

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
      setDragCreateDates(null); // Clear drag create dates
      
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
            <Button 
              variant={isDragCreateMode ? "default" : "outline"} 
              onClick={() => {
                setIsDragCreateMode(!isDragCreateMode);
                // Reset any active drag states when toggling
                setIsDragCreating(false);
                setDragCreateStart(null);
                setDragCreateEnd(null);
                setDragCreatePreview(null);
                // Also disable expansion mode when entering drag mode
                if (!isDragCreateMode) {
                  setIsExpansionMode(false);
                }
              }}
              className={isDragCreateMode ? "bg-blue-600 text-white" : ""}
            >
              {isDragCreateMode ? <Square className="h-4 w-4" /> : <MousePointer2 className="h-4 w-4" />}
              {isDragCreateMode ? 'Exit Drag Mode' : 'Drag to Create'}
            </Button>
            
            <Button 
              variant={isExpansionMode ? "default" : "outline"} 
              onClick={() => {
                setIsExpansionMode(!isExpansionMode);
                // Reset expansion mode state when toggling
                // Also disable drag mode when entering expansion mode
                if (!isExpansionMode) {
                  setIsDragCreateMode(false);
                  setIsDragCreating(false);
                  setDragCreateStart(null);
                  setDragCreateEnd(null);
                  setDragCreatePreview(null);
                }
              }}
              className={isExpansionMode ? "bg-green-600 text-white" : ""}
            >
              {isExpansionMode ? <Square className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
              {isExpansionMode ? 'Exit Expand Mode' : 'Expand Reservations'}
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
                  isExpanded={expandedOverviewFloors[parseInt(floor)]}
                  onToggle={() => toggleOverviewFloor(parseInt(floor))}
                  occupancyData={currentOccupancy}
                  onRoomClick={handleRoomClick}
                  onUpdateReservationStatus={updateReservationStatus}
                  onDeleteReservation={deleteReservation}
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
                isFullscreen={isFullscreen}
                onUpdateReservationStatus={updateReservationStatus}
                onDeleteReservation={deleteReservation}
                isDragCreateMode={isDragCreateMode}
                isDragCreating={isDragCreating}
                dragCreateStart={dragCreateStart}
                dragCreateEnd={dragCreateEnd}
                dragCreatePreview={dragCreatePreview}
                onDragCreateStart={handleDragCreateStart}
                onDragCreateMove={handleDragCreateMove}
                onDragCreateEnd={handleDragCreateEnd}
                isExpansionMode={isExpansionMode}
                onResizeReservation={handleResizeReservation}
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
            setDragCreateDates(null); // Clear drag create dates when closing
          }}
          room={selectedRoom}
          onCreateBooking={handleCreateBooking}
          preSelectedDates={dragCreateDates} // Pass pre-selected dates from drag
          existingReservations={reservations} // Pass existing reservations for conflict checking
        />
      )}

      {/* Room Change Confirmation Dialog */}
      {roomChangeDialog.show && roomChangeDialog.currentRoom && roomChangeDialog.targetRoom && roomChangeDialog.reservation && (
        <RoomChangeConfirmDialog
          isOpen={roomChangeDialog.show}
          onClose={() => setRoomChangeDialog({ show: false, reservationId: '', currentRoom: null, targetRoom: null, newCheckIn: null, newCheckOut: null, reservation: null, guest: null })}
          currentRoom={roomChangeDialog.currentRoom}
          targetRoom={roomChangeDialog.targetRoom}
          reservation={roomChangeDialog.reservation}
          guest={roomChangeDialog.guest}
          onConfirmChange={handleConfirmRoomChange}
          onFreeUpgrade={handleFreeUpgrade}
        />
      )}
      </div>
    </DndProvider>
  );
}