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
  Square
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
      <div className="grid grid-cols-[180px_repeat(14,minmax(45px,1fr))] border-b border-gray-200 relative z-20">
        <div className="p-2 bg-gray-50 border-r border-gray-200 font-medium text-gray-700 text-sm">
          Rooms
        </div>
        {dates.map((date, index) => {
          const isToday = isSameDay(date, new Date());
          const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday = 0, Saturday = 6
          
          return (
            <div 
              key={index}
              className={`p-2 text-center border-r border-gray-200 ${
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
  onMoveReservation,
  isFullscreen = false,
  onUpdateReservationStatus,
  onDeleteReservation
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

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<'left' | 'right' | null>(null);
  
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

  // BULLETPROOF: Direct day index calculation
  const checkInDate = startOfDay(reservation.checkIn);
  const checkOutDate = startOfDay(reservation.checkOut);
  const timelineStart = startOfDay(startDate);
  
  // Calculate day indices from timeline start (0-13)
  const startDayIndex = Math.floor((checkInDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
  const endDayIndex = Math.floor((checkOutDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
  
  // Clamp to visible range (need these for useEffect dependencies)
  const visibleStartDay = Math.max(0, startDayIndex);
  const visibleEndDay = Math.min(13, endDayIndex - 1); // End day is exclusive for checkout
  
  // BULLETPROOF: CSS Grid positioning (need these for useEffect dependencies)
  // Grid columns: 1=rooms, 2=day0, 3=day1, ..., 15=day13
  const gridColumnStart = visibleStartDay + 2; // day 0 = column 2
  const gridColumnEnd = visibleEndDay + 3;     // day 1 = column 3 (end is exclusive)
  
  const statusColors = RESERVATION_STATUS_COLORS[reservation.status as ReservationStatus] || RESERVATION_STATUS_COLORS.confirmed;
  const flag = getCountryFlag(guest?.nationality || '');
  
  // Calculate reservation length for adaptive UI
  const reservationDays = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000));
  const isShortReservation = reservationDays <= 2; // 1-2 day reservations
  
  // Animation effects - MUST be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (blockRef.current && !isDragging && !isResizing) {
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
  }, [gridColumnStart, gridColumnEnd, isDragging, isResizing]);

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
  if (visibleEndDay < visibleStartDay) {
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
        isDragging ? 'opacity-50 ring-2 ring-blue-400' : isResizing ? 'ring-2 ring-purple-400' : ''
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
        // Prevent click-to-view if dragging, resizing, clicking resize handles, or closing context menu
        const target = e.target as HTMLElement;
        const isResizeHandle = target.closest('[title*="Resize:"]') || 
                              target.classList.contains('cursor-ew-resize');
        
        if (!isDragging && !isResizing && !isResizeHandle && !isClosingContextMenu) {
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
      
      {/* Always visible resize handles for better UX */}
      <div className={`absolute inset-y-0 left-0 w-2 cursor-ew-resize transition-all duration-200 pointer-events-auto ${
        isResizing && resizeType === 'left' 
          ? 'bg-purple-500 border-purple-700 w-3' 
          : 'bg-blue-300/60 hover:bg-blue-400/90 border-r border-blue-400/40'
      }`}
           title="⟷ Resize: Drag to change check-in date"
           onMouseEnter={(e) => {
             if (!isResizing) {
               gsap.to(e.currentTarget, { 
                 scale: 1.2, 
                 duration: 0.2, 
                 ease: 'power2.out' 
               });
             }
           }}
           onMouseLeave={(e) => {
             if (!isResizing) {
               gsap.to(e.currentTarget, { 
                 scale: 1, 
                 duration: 0.2, 
                 ease: 'power2.out' 
               });
             }
           }}
           onMouseDown={(e) => {
             e.stopPropagation(); // Prevent main drag
             setIsResizing(true);
             setResizeType('left');
             
             const handleResize = (moveEvent: MouseEvent) => {
               const timelineElement = document.querySelector('.grid[class*="grid-cols-"][class*="180px"]');
              if (!timelineElement) return;
              
              const rect = timelineElement.getBoundingClientRect();
              const columnWidth = (rect.width - 180) / 14; // Subtract room column width
               const mouseX = moveEvent.clientX - rect.left - 180; // Relative to first date column
               const newDayIndex = Math.floor(mouseX / columnWidth);
               const clampedDayIndex = Math.max(0, Math.min(13, newDayIndex));
               
               const newCheckIn = addDays(startDate, clampedDayIndex);
               newCheckIn.setHours(15, 0, 0, 0); // 3 PM check-in
               
               if (newCheckIn < reservation.checkOut && onMoveReservation) {
                 onMoveReservation(reservation.id, room.id, newCheckIn, reservation.checkOut);
               }
             };
             
             const handleMouseUp = () => {
               setIsResizing(false);
               setResizeType(null);
               document.removeEventListener('mousemove', handleResize);
               document.removeEventListener('mouseup', handleMouseUp);
             };
             
             document.addEventListener('mousemove', handleResize);
             document.addEventListener('mouseup', handleMouseUp);
           }}
      ></div>
      
      <div className={`absolute inset-y-0 right-0 w-2 cursor-ew-resize transition-all duration-200 pointer-events-auto ${
        isResizing && resizeType === 'right' 
          ? 'bg-purple-500 border-purple-700 w-3' 
          : 'bg-blue-300/60 hover:bg-blue-400/90 border-l border-blue-400/40'
      }`}
           title="⟷ Resize: Drag to change check-out date"
           onMouseEnter={(e) => {
             if (!isResizing) {
               gsap.to(e.currentTarget, { 
                 scale: 1.2, 
                 duration: 0.2, 
                 ease: 'power2.out' 
               });
             }
           }}
           onMouseLeave={(e) => {
             if (!isResizing) {
               gsap.to(e.currentTarget, { 
                 scale: 1, 
                 duration: 0.2, 
                 ease: 'power2.out' 
               });
             }
           }}
           onMouseDown={(e) => {
             e.stopPropagation(); // Prevent main drag
             setIsResizing(true);
             setResizeType('right');
             
             const handleResize = (moveEvent: MouseEvent) => {
               const timelineElement = document.querySelector('.grid[class*="grid-cols-"][class*="180px"]');
              if (!timelineElement) return;
              
              const rect = timelineElement.getBoundingClientRect();
              const columnWidth = (rect.width - 180) / 14; // Subtract room column width
               const mouseX = moveEvent.clientX - rect.left - 180; // Relative to first date column
               const newDayIndex = Math.floor(mouseX / columnWidth) + 1; // +1 because checkout is next day
               const clampedDayIndex = Math.max(1, Math.min(14, newDayIndex));
               
               const newCheckOut = addDays(startDate, clampedDayIndex);
               newCheckOut.setHours(11, 0, 0, 0); // 11 AM check-out
               
               if (newCheckOut > reservation.checkIn && onMoveReservation) {
                 onMoveReservation(reservation.id, room.id, reservation.checkIn, newCheckOut);
               }
             };
             
             const handleMouseUp = () => {
               setIsResizing(false);
               setResizeType(null);
               document.removeEventListener('mousemove', handleResize);
               document.removeEventListener('mouseup', handleMouseUp);
             };
             
             document.addEventListener('mousemove', handleResize);
             document.addEventListener('mouseup', handleMouseUp);
           }}
      ></div>
      
      {/* Hover tooltip */}
      <div className="absolute top-full left-0 mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-20 whitespace-nowrap">
        {guest?.name} • {reservation.numberOfGuests} guests • {format(reservation.checkIn, 'MMM dd')} - {format(reservation.checkOut, 'MMM dd')}
      </div>

      {/* Simple Context Menu */}
      {contextMenu.show && contextMenu.reservation?.id === reservation.id && (
        (console.log('[CONTEXT MENU] Rendering context menu!', {
          show: contextMenu.show,
          x: contextMenu.x,
          y: contextMenu.y,
          reservationId: contextMenu.reservation?.id,
          currentReservationId: reservation.id,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          isFullscreen: isFullscreen
        }), true) &&
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

    </div>
  );
}

// Enhanced date cell with drag-to-create functionality
function DroppableDateCell({ 
  room, 
  dayIndex, 
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
  date: Date;
  onMoveReservation: (reservationId: string, newRoomId: string, newCheckIn: Date, newCheckOut: Date) => void;
  existingReservations?: Reservation[];
  // New props for drag-to-create
  isDragCreateMode?: boolean;
  isDragCreating?: boolean;
  dragCreateStart?: {roomId: string, dayIndex: number} | null;
  dragCreateEnd?: {roomId: string, dayIndex: number} | null;
  dragCreatePreview?: {roomId: string, startDay: number, endDay: number} | null;
  onDragCreateStart?: (roomId: string, dayIndex: number) => void;
  onDragCreateMove?: (roomId: string, dayIndex: number) => void;
  onDragCreateEnd?: (roomId: string, dayIndex: number) => void;
}) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Check if this date already has a reservation for this room
  const hasExistingReservation = existingReservations.some(res => 
    res.roomId === room.id && 
    isSameDay(startOfDay(res.checkIn), date)
  );

  // Check if this cell is part of the drag preview
  const isInDragPreview = dragCreatePreview && 
    dragCreatePreview.roomId === room.id && 
    dayIndex >= dragCreatePreview.startDay && 
    dayIndex <= dragCreatePreview.endDay;

  // Check if this cell is available for drag creation
  const isAvailableForDragCreate = isDragCreateMode && !hasExistingReservation;

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

  // Handle drag-to-create mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDragCreateMode && isAvailableForDragCreate && onDragCreateStart) {
      e.preventDefault();
      onDragCreateStart(room.id, dayIndex);
    }
  };

  const handleMouseEnter = () => {
    if (isDragCreating && isAvailableForDragCreate && onDragCreateMove) {
      onDragCreateMove(room.id, dayIndex);
    }
  };

  const handleMouseUp = () => {
    if (isDragCreating && isAvailableForDragCreate && onDragCreateEnd) {
      onDragCreateEnd(room.id, dayIndex);
    }
  };

  return (
    <div 
      ref={dropLeft as any}
      className={`h-12 border-r border-gray-200 transition-all duration-200 relative ${
        isInDragPreview
          ? 'bg-blue-200 border-2 border-blue-400'
          : isOverLeft && canDropLeft 
          ? 'bg-green-100 border-2 border-green-400' 
          : isOverLeft && !canDropLeft 
          ? 'bg-red-100 border-2 border-red-400' 
          : isAvailableForDragCreate
          ? 'bg-blue-50/50 hover:bg-blue-100/70 cursor-crosshair'
          : isWeekend
          ? 'bg-orange-50/20'
          : 'bg-white hover:bg-blue-50/30'
      }`}
      title={
        isAvailableForDragCreate 
          ? `Drag to create reservation starting ${format(date, 'MMM dd')}`
          : canDropLeft 
          ? `Drop here for check-in on ${format(date, 'MMM dd')}` 
          : 'Cannot drop here'
      }
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
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
  onDragCreateEnd
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
  onDragCreateStart?: (roomId: string, dayIndex: number) => void;
  onDragCreateMove?: (roomId: string, dayIndex: number) => void;
  onDragCreateEnd?: (roomId: string, dayIndex: number) => void;
}) {
  // Find reservations for this room
  const roomReservations = reservations.filter(r => r.roomId === room.id);
  
  return (
    <div className="relative border-b border-gray-100 hover:bg-gray-50">
      {/* Background grid for drop zones */}
      <div className="grid grid-cols-[180px_repeat(14,minmax(45px,1fr))]">
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
      
      {/* Reservation blocks overlaid on the same grid */}
      <div className="absolute inset-0 grid grid-cols-[180px_repeat(14,minmax(45px,1fr))] pointer-events-none">
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
  onDragCreateEnd
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
  onDragCreateStart?: (roomId: string, dayIndex: number) => void;
  onDragCreateMove?: (roomId: string, dayIndex: number) => void;
  onDragCreateEnd?: (roomId: string, dayIndex: number) => void;
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
  
  // Drag-to-create reservation states
  const [isDragCreateMode, setIsDragCreateMode] = useState(false);
  const [isDragCreating, setIsDragCreating] = useState(false);
  const [dragCreateStart, setDragCreateStart] = useState<{roomId: string, dayIndex: number} | null>(null);
  const [dragCreateEnd, setDragCreateEnd] = useState<{roomId: string, dayIndex: number} | null>(null);
  const [dragCreatePreview, setDragCreatePreview] = useState<{roomId: string, startDay: number, endDay: number} | null>(null);
  const [dragCreateDates, setDragCreateDates] = useState<{checkIn: Date, checkOut: Date} | null>(null);
  
  // Global mouse event listener for drag-to-create
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragCreating) {
        setIsDragCreating(false);
        setDragCreateStart(null);
        setDragCreateEnd(null);
        setDragCreatePreview(null);
      }
    };

    if (isDragCreating) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
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
      
      let shouldProceed = true;
      let updatedReservationData: any = {
        roomId: newRoomId,
        checkIn: newCheckIn,
        checkOut: newCheckOut
      };

      if (isRoomTypeChange) {
        // Calculate new pricing for the different room type
        const { calculatePricing } = await import('../../../lib/hotel/pricingCalculator');
        
        try {
          const newPricing = calculatePricing(
            newRoomId,
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

          const oldPricing = reservation.totalAmount;
          const priceDifference = newPricing.total - oldPricing;
          const isMoreExpensive = priceDifference > 0;

          // Show confirmation dialog with pricing information
          const confirmMessage = isMoreExpensive
            ? `Moving from ${oldRoom.nameEnglish} to ${newRoom.nameEnglish} will increase the price by €${priceDifference.toFixed(2)}.\n\nOld total: €${oldPricing.toFixed(2)}\nNew total: €${newPricing.total.toFixed(2)}\n\nDo you want to proceed with this room change?`
            : `Moving from ${oldRoom.nameEnglish} to ${newRoom.nameEnglish} will decrease the price by €${Math.abs(priceDifference).toFixed(2)}.\n\nOld total: €${oldPricing.toFixed(2)}\nNew total: €${newPricing.total.toFixed(2)}\n\nDo you want to proceed with this room change?`;

          shouldProceed = window.confirm(confirmMessage);

          if (shouldProceed) {
            // Update reservation data with new pricing
            updatedReservationData = {
              ...updatedReservationData,
              totalAmount: newPricing.total,
              subtotal: newPricing.subtotal,
              fees: newPricing.fees
            };
          }
        } catch (pricingError) {
          console.error('Failed to calculate new pricing:', pricingError);
          // Still ask for confirmation even if pricing calculation fails
          shouldProceed = window.confirm(
            `Moving from ${oldRoom.nameEnglish} to ${newRoom.nameEnglish} will change the room type and may affect pricing.\n\nDo you want to proceed with this room change?`
          );
        }
      }

      if (shouldProceed) {
        await updateReservation(reservationId, updatedReservationData);

        const successMessage = isRoomTypeChange 
          ? `${guest?.name || 'Guest'} moved from ${formatRoomNumber(oldRoom)} to ${formatRoomNumber(newRoom)} with updated pricing • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`
          : `${guest?.name || 'Guest'} moved from ${formatRoomNumber(oldRoom)} to ${formatRoomNumber(newRoom)} • ${newCheckIn.toLocaleDateString()} - ${newCheckOut.toLocaleDateString()}`;

        // Show success notification
        hotelNotification.success(
          'Reservation Moved Successfully!',
          successMessage,
          5
        );
      }

    } catch (error) {
      console.error('Error moving reservation:', error);
      hotelNotification.error(
        'Failed to Move Reservation',
        'Unable to move the reservation. Please try again.',
        5
      );
    }
  };

  // Drag-to-create handlers
  const handleDragCreateStart = (roomId: string, dayIndex: number) => {
    setIsDragCreating(true);
    setDragCreateStart({ roomId, dayIndex });
    setDragCreateEnd({ roomId, dayIndex });
    setDragCreatePreview({ roomId, startDay: dayIndex, endDay: dayIndex });
  };

  const handleDragCreateMove = (roomId: string, dayIndex: number) => {
    if (isDragCreating && dragCreateStart && dragCreateStart.roomId === roomId) {
      setDragCreateEnd({ roomId, dayIndex });
      const startDay = Math.min(dragCreateStart.dayIndex, dayIndex);
      const endDay = Math.max(dragCreateStart.dayIndex, dayIndex);
      setDragCreatePreview({ roomId, startDay, endDay });
    }
  };

  const handleDragCreateEnd = (roomId: string, dayIndex: number) => {
    if (isDragCreating && dragCreateStart && dragCreatePreview) {
      setIsDragCreating(false);
      
      // Calculate the dates
      const startDay = dragCreatePreview.startDay;
      const endDay = dragCreatePreview.endDay;
      const checkInDate = addDays(currentDate, startDay);
      const checkOutDate = addDays(currentDate, endDay + 1); // +1 because checkout is next day
      
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
              }}
              className={isDragCreateMode ? "bg-blue-600 text-white" : ""}
            >
              {isDragCreateMode ? <Square className="h-4 w-4" /> : <MousePointer2 className="h-4 w-4" />}
              {isDragCreateMode ? 'Exit Drag Mode' : 'Drag to Create'}
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
      </div>
    </DndProvider>
  );
}