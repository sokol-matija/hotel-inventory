import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { addDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Users,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { HOTEL_POREC_ROOMS, getRoomsByFloor } from '../../../lib/hotel/hotelData';
import { SAMPLE_GUESTS } from '../../../lib/hotel/sampleData';
import { useHotel } from '../../../lib/hotel/state/HotelContext';
import { 
  reservationsToCalendarEvents,
  eventStyleGetter,
  RESERVATION_STATUS_COLORS,
  formatRoomNumber,
  getRoomTypeDisplay
} from '../../../lib/hotel/calendarUtils';
import { CalendarEvent, ReservationStatus } from '../../../lib/hotel/types';
import ReservationPopup from './Reservations/ReservationPopup';

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

// Custom toolbar for calendar navigation
function CustomToolbar({ 
  date, 
  onNavigate, 
  onView, 
  view,
  views,
  localizer: toolbarLocalizer 
}: any) {
  const goToBack = () => onNavigate('PREV');
  const goToNext = () => onNavigate('NEXT');
  const goToToday = () => onNavigate('TODAY');
  
  const viewOptions = [
    { key: 'week', label: '7 Days', days: 7 },
    { key: 'twoWeeks', label: '14 Days', days: 14 },
    { key: 'month', label: '30 Days', days: 30 }
  ];
  
  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-lg font-semibold text-gray-900">
          {toolbarLocalizer.format(date, 'MMMM YYYY')}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {viewOptions.map((option) => (
          <Button
            key={option.key}
            variant={view === option.key ? "default" : "outline"}
            size="sm"
            onClick={() => onView(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Status legend component
function StatusLegend() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {Object.entries(RESERVATION_STATUS_COLORS).map(([status, colors]) => (
        <div key={status} className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded border-2"
            style={{ 
              backgroundColor: colors.backgroundColor,
              borderColor: colors.borderColor 
            }}
          />
          <span className="text-sm text-gray-600">{colors.label}</span>
        </div>
      ))}
    </div>
  );
}

// Floor section component with collapsible rooms
function FloorSection({ 
  floor, 
  rooms, 
  isExpanded, 
  onToggle,
  occupancyData 
}: {
  floor: number;
  rooms: any[];
  isExpanded: boolean;
  onToggle: () => void;
  occupancyData: Record<string, any>;
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
            <Badge variant={occupancyRate > 80 ? "destructive" : occupancyRate > 50 ? "default" : "secondary"}>
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
              
              return (
                <div
                  key={room.id}
                  className={`
                    p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md
                    ${isOccupied 
                      ? 'border-2' 
                      : 'border border-gray-200 hover:border-blue-300'
                    }
                    ${room.isPremium ? 'bg-gradient-to-br from-yellow-50 to-amber-50' : 'bg-white'}
                  `}
                  style={isOccupied && statusColors ? {
                    borderColor: statusColors.borderColor,
                    backgroundColor: `${statusColors.backgroundColor}10`
                  } : {}}
                >
                  <div className="flex flex-col space-y-1">
                    <div className="font-semibold text-sm">
                      {formatRoomNumber(room)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getRoomTypeDisplay(room)}
                    </div>
                    {isOccupied && reservation && (
                      <div className="text-xs mt-2">
                        <div className="font-medium">
                          {SAMPLE_GUESTS.find(g => g.id === reservation.guestId)?.name || 'Guest'}
                        </div>
                        <div className="flex items-center space-x-1 text-gray-500">
                          <Users className="h-3 w-3" />
                          <span>{reservation.numberOfGuests}</span>
                        </div>
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

// Main calendar view component
export default function CalendarView() {
  const { reservations, isUpdating } = useHotel();
  
  // Debug logging
  React.useEffect(() => {
    console.log('=== CALENDAR DEBUG INFO ===');
    console.log('HOTEL_POREC_ROOMS:', HOTEL_POREC_ROOMS);
    console.log('HOTEL_POREC_ROOMS length:', HOTEL_POREC_ROOMS?.length);
    console.log('First room:', HOTEL_POREC_ROOMS?.[0]);
    console.log('reservations:', reservations);
    console.log('reservations length:', reservations?.length);
    console.log('=== END DEBUG INFO ===');
  }, [reservations]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<string>('twoWeeks');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>({
    1: true,
    2: true, 
    3: true,
    4: true
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showReservationPopup, setShowReservationPopup] = useState(false);
  
  // Convert reservations to calendar events
  const calendarEvents = useMemo(() => {
    try {
      if (!reservations || !Array.isArray(reservations)) {
        console.warn('Invalid reservations data:', reservations);
        return [];
      }
      return reservationsToCalendarEvents(reservations);
    } catch (error) {
      console.error('Error converting reservations to calendar events:', error);
      return [];
    }
  }, [reservations]);
  
  // Get current occupancy data
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
  
  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    return {
      1: getRoomsByFloor(1),
      2: getRoomsByFloor(2),
      3: getRoomsByFloor(3),
      4: getRoomsByFloor(4)
    };
  }, []);
  
  const toggleFloor = (floor: number) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floor]: !prev[floor]
    }));
  };
  
  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event);
    setSelectedEvent(event);
    setShowReservationPopup(true);
  };
  
  const handleSelectSlot = ({ start, end, resource }: { start: Date; end: Date; resource?: any }) => {
    console.log('Slot selected:', { start, end, resource });
    // TODO: Open new reservation modal
  };

  const handleEventDrop = ({ event, start, end, resourceId }: any) => {
    console.log('Event dropped:', { event, start, end, resourceId });
    
    // Find the reservation being moved
    const reservationId = event.reservationId;
    const newRoomId = resourceId || event.roomId;
    
    // TODO: Update reservation with new dates and room
    // This would typically make an API call to update the database
    console.log(`Moving reservation ${reservationId} to room ${newRoomId} from ${start} to ${end}`);
    
    // For now, show a success message
    alert(`Reservation moved to ${HOTEL_POREC_ROOMS.find(r => r.id === newRoomId)?.number || 'Unknown Room'}\nNew dates: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
  };

  const handleEventResize = ({ event, start, end }: any) => {
    console.log('Event resized:', { event, start, end });
    
    // Find the reservation being resized
    const reservationId = event.reservationId;
    
    // TODO: Update reservation with new dates
    console.log(`Resizing reservation ${reservationId} to ${start} - ${end}`);
    
    // For now, show a success message
    alert(`Reservation dates updated:\nNew dates: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
  };
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">Front Desk Calendar</h2>
              {isUpdating && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-600">Updating...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600">Hotel Porec - 46 Rooms</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          </div>
        </div>
        
        {/* Status Legend */}
        <StatusLegend />
        
        {/* Room Overview by Floor */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Room Status Overview</span>
          </h3>
          
          {Object.entries(roomsByFloor).map(([floor, rooms]) => (
            <FloorSection
              key={floor}
              floor={parseInt(floor)}
              rooms={rooms}
              isExpanded={expandedFloors[parseInt(floor)]}
              onToggle={() => toggleFloor(parseInt(floor))}
              occupancyData={currentOccupancy}
            />
          ))}
        </div>
        
        {/* Interactive Calendar Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Hotel Porec Booking Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-full">
              {/* Custom toolbar */}
              <CustomToolbar
                date={currentDate}
                onNavigate={(action: 'PREV' | 'NEXT' | 'TODAY') => {
                  if (action === 'PREV') {
                    setCurrentDate(prev => {
                      const days = currentView === 'week' ? 7 : currentView === 'twoWeeks' ? 14 : 30;
                      return addDays(prev, -days);
                    });
                  } else if (action === 'NEXT') {
                    setCurrentDate(prev => {
                      const days = currentView === 'week' ? 7 : currentView === 'twoWeeks' ? 14 : 30;
                      return addDays(prev, days);
                    });
                  } else if (action === 'TODAY') {
                    setCurrentDate(new Date());
                  }
                }}
                onView={(view: string) => setCurrentView(view)}
                view={currentView}
                views={['week', 'twoWeeks', 'month']}
                localizer={localizer}
              />
              
              {/* React Big Calendar with Drag & Drop */}
              <div className="h-[600px] border rounded-lg bg-white">
                {/* @ts-ignore */}
                <DragAndDropCalendar
                  localizer={localizer}
                  events={calendarEvents.filter(event => event && event.title)}
                  startAccessor="start"
                  endAccessor="end"
                  titleAccessor="title"
                  allDayAccessor={() => true}
                  step={30}
                  showMultiDayTimes={false}
                  defaultView="week"
                  view={currentView as View}
                  views={['week', 'twoWeeks' as any, 'month']}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  onView={setCurrentView as any}
                  eventPropGetter={eventStyleGetter as any}
                  onSelectEvent={handleEventClick as any}
                  onSelectSlot={handleSelectSlot}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                  selectable={true}
                  resizable={true}
                  popup={true}
                  popupOffset={30}
                  resources={(() => {
                    try {
                      if (!HOTEL_POREC_ROOMS || !Array.isArray(HOTEL_POREC_ROOMS)) {
                        console.error('HOTEL_POREC_ROOMS is not a valid array:', HOTEL_POREC_ROOMS);
                        return [{ id: 'fallback-room', title: 'Room 101 - Fallback', floor: 1 }];
                      }
                      
                      if (HOTEL_POREC_ROOMS.length === 0) {
                        console.error('HOTEL_POREC_ROOMS is empty');
                        return [{ id: 'fallback-room', title: 'Room 101 - Fallback', floor: 1 }];
                      }
                      
                      const processedRooms = HOTEL_POREC_ROOMS
                        .filter(room => room && room.id && room.number) // Filter out invalid rooms
                        .map(room => {
                          try {
                            const roomNumber = formatRoomNumber(room) || room.number || 'Unknown';
                            const roomType = getRoomTypeDisplay(room) || room.nameEnglish || 'Room';
                            const title = `${roomNumber} - ${roomType}`;
                            console.log('Processing room:', room.id, title);
                            return {
                              id: room.id,
                              title,
                              floor: room.floor || 1
                            };
                          } catch (error) {
                            console.error('Error formatting room:', room, error);
                            return {
                              id: room.id || `room-${Math.random()}`,
                              title: `Room ${room.number || 'Unknown'}`,
                              floor: room.floor || 1
                            };
                          }
                        })
                        .filter(resource => resource && resource.title && resource.title.length > 0); // Ensure all resources have valid titles
                      
                      console.log('Final processed rooms:', processedRooms);
                      
                      if (processedRooms.length === 0) {
                        console.error('No valid rooms after processing');
                        return [{ id: 'fallback-room', title: 'Room 101 - Fallback', floor: 1 }];
                      }
                      
                      return processedRooms;
                    } catch (error) {
                      console.error('Error processing hotel rooms:', error);
                      return [{ id: 'fallback-room', title: 'Room 101 - Fallback', floor: 1 }];
                    }
                  })()}
                  resourceIdAccessor="id"
                  resourceTitleAccessor="title"
                  components={{
                    toolbar: () => null, // Hide default toolbar since we have custom one
                    event: ({ event }: any) => (
                      <div className="px-2 py-1 text-xs font-medium truncate">
                        <div className="flex items-center space-x-1">
                          {event?.resource?.hasPets && <span>🐕</span>}
                          <span>{event?.title || 'Event'}</span>
                        </div>
                        <div className="text-xs opacity-80">
                          {event?.resource?.numberOfGuests || 1} guests
                        </div>
                      </div>
                    ),
                    month: {
                      dateHeader: ({ date }) => (
                        <div className="text-sm font-medium text-gray-700">
                          {moment(date).format('D')}
                        </div>
                      )
                    }
                  }}
                  formats={{
                    dayFormat: (date, culture, localizer) => 
                      localizer?.format(date, 'ddd DD/MM', culture) || '',
                    dayHeaderFormat: (date, culture, localizer) =>
                      localizer?.format(date, 'dddd DD/MM/YYYY', culture) || '',
                    dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                      `${localizer?.format(start, 'DD/MM/YYYY', culture)} - ${localizer?.format(end, 'DD/MM/YYYY', culture)}`,
                    monthHeaderFormat: (date, culture, localizer) =>
                      localizer?.format(date, 'MMMM YYYY', culture) || '',
                    weekdayFormat: (date, culture, localizer) =>
                      localizer?.format(date, 'ddd', culture) || ''
                  }}
                  messages={{
                    today: 'Today',
                    previous: 'Previous',
                    next: 'Next',
                    month: 'Month',
                    week: 'Week',
                    work_week: 'Work Week',
                    day: 'Day',
                    agenda: 'Agenda',
                    date: 'Date',
                    time: 'Time',
                    event: 'Reservation',
                    noEventsInRange: 'No reservations in this date range',
                    showMore: (total: number) => `+${total} more`
                  }}
                />
              </div>
              
              {/* Calendar legend and statistics */}
              <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    {calendarEvents.length} reservations shown
                  </span>
                  {' • '}
                  <span>
                    Drag reservations to move between rooms/dates
                  </span>
                  {' • '}
                  <span>
                    Resize to extend/shorten stays
                  </span>
                  {' • '}
                  <span>
                    Click empty slots to create booking
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {format(currentDate, 'MMMM yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>
                      {calendarEvents.reduce((sum, event) => sum + event.resource.numberOfGuests, 0)} guests
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
    </div>
  );
}