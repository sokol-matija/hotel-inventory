// Hotel Calendar Utilities - Convert hotel data to calendar events
import { CalendarEvent, Reservation, ReservationStatus } from './types';
import { HOTEL_POREC_ROOMS } from './hotelData';
import { SAMPLE_GUESTS } from './sampleData';
import { addDays, isSameDay, isWithinInterval } from 'date-fns';

// Status color mapping for reservation blocks
export const RESERVATION_STATUS_COLORS = {
  'confirmed': {
    backgroundColor: '#fb923c', // Orange
    borderColor: '#ea580c',
    textColor: '#ffffff',
    label: 'Confirmed'
  },
  'checked-in': {
    backgroundColor: '#22c55e', // Green
    borderColor: '#16a34a',
    textColor: '#ffffff', 
    label: 'Checked In'
  },
  'checked-out': {
    backgroundColor: '#6b7280', // Gray
    borderColor: '#4b5563',
    textColor: '#ffffff',
    label: 'Checked Out'
  },
  'room-closure': {
    backgroundColor: '#ef4444', // Red
    borderColor: '#dc2626',
    textColor: '#ffffff',
    label: 'Room Closure'
  },
  'unallocated': {
    backgroundColor: '#3b82f6', // Blue
    borderColor: '#2563eb',
    textColor: '#ffffff',
    label: 'Unallocated'
  },
  'incomplete-payment': {
    backgroundColor: '#f8fafc', // Light gray/white
    borderColor: '#ef4444',
    textColor: '#dc2626',
    label: 'Payment Pending'
  }
} as const;

// Convert reservation to calendar event
export function reservationToCalendarEvent(reservation: Reservation): CalendarEvent | null {
  // Safety checks for required data
  if (!reservation || !reservation.id || !reservation.checkIn || !reservation.checkOut) {
    console.warn('Invalid reservation data:', reservation);
    return null;
  }

  const room = HOTEL_POREC_ROOMS.find(r => r.id === reservation.roomId);
  const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
  
  const roomNumber = room?.number || 'Unknown';
  const guestName = guest?.name || reservation.guestId || 'Unknown Guest';
  
  // Create title based on status
  let title = '';
  if (reservation.status === 'room-closure') {
    title = `🔧 Maintenance`;
  } else {
    title = `${guestName}`;
    if (reservation.numberOfGuests && reservation.numberOfGuests > 1) {
      title += ` (+${reservation.numberOfGuests - 1})`;
    }
  }
  
  // Ensure title is never empty
  if (!title) {
    title = 'Reservation';
  }
  
  return {
    id: `event-${reservation.id}`,
    reservationId: reservation.id,
    roomId: reservation.roomId || '',
    title,
    start: reservation.checkIn,
    end: reservation.checkOut,
    resource: {
      status: reservation.status || 'confirmed',
      guestName,
      roomNumber,
      numberOfGuests: reservation.numberOfGuests || 1,
      hasPets: guest?.hasPets || false
    }
  };
}

// Convert multiple reservations to calendar events
export function reservationsToCalendarEvents(reservations: Reservation[]): CalendarEvent[] {
  if (!Array.isArray(reservations)) {
    console.warn('Invalid reservations array:', reservations);
    return [];
  }
  
  return reservations
    .map(reservationToCalendarEvent)
    .filter((event): event is CalendarEvent => event !== null);
}

// Get reservations for a specific date range
export function getReservationsForDateRange(
  reservations: Reservation[],
  startDate: Date,
  endDate: Date
): Reservation[] {
  return reservations.filter(reservation => {
    // Check if reservation overlaps with the date range
    return isWithinInterval(reservation.checkIn, { start: startDate, end: endDate }) ||
           isWithinInterval(reservation.checkOut, { start: startDate, end: endDate }) ||
           (reservation.checkIn <= startDate && reservation.checkOut >= endDate);
  });
}

// Get reservations for a specific room and date range
export function getReservationsForRoom(
  reservations: Reservation[],
  roomId: string,
  startDate: Date,
  endDate: Date
): Reservation[] {
  return getReservationsForDateRange(reservations, startDate, endDate)
    .filter(reservation => reservation.roomId === roomId);
}

// Check if a room is available for a date range
export function isRoomAvailable(
  reservations: Reservation[],
  roomId: string,
  checkIn: Date,
  checkOut: Date
): boolean {
  const conflictingReservations = reservations.filter(reservation => {
    if (reservation.roomId !== roomId) return false;
    if (reservation.status === 'checked-out') return false; // Past reservations don't block
    
    // Check for date overlap
    const hasOverlap = (
      (checkIn >= reservation.checkIn && checkIn < reservation.checkOut) ||
      (checkOut > reservation.checkIn && checkOut <= reservation.checkOut) ||
      (checkIn <= reservation.checkIn && checkOut >= reservation.checkOut)
    );
    
    return hasOverlap;
  });
  
  return conflictingReservations.length === 0;
}

// Get room occupancy for a specific date
export function getRoomOccupancyForDate(
  reservations: Reservation[],
  date: Date
): Record<string, { reservation: Reservation; status: ReservationStatus }> {
  const occupancy: Record<string, { reservation: Reservation; status: ReservationStatus }> = {};
  
  for (const reservation of reservations) {
    // Check if reservation is active on this date
    if (date >= reservation.checkIn && date < reservation.checkOut) {
      occupancy[reservation.roomId] = {
        reservation,
        status: reservation.status
      };
    }
  }
  
  return occupancy;
}

// Get calendar statistics for dashboard
export function getCalendarStatistics(
  reservations: Reservation[],
  startDate: Date,
  endDate: Date
): {
  totalReservations: number;
  occupancyRate: number;
  statusBreakdown: Record<ReservationStatus, number>;
  revenueProjection: number;
} {
  const reservationsInRange = getReservationsForDateRange(reservations, startDate, endDate);
  
  const statusBreakdown = reservationsInRange.reduce((acc, reservation) => {
    acc[reservation.status] = (acc[reservation.status] || 0) + 1;
    return acc;
  }, {} as Record<ReservationStatus, number>);
  
  const totalRoomNights = HOTEL_POREC_ROOMS.length * 
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const occupiedRoomNights = reservationsInRange.reduce((acc, reservation) => {
    const nights = Math.ceil((reservation.checkOut.getTime() - reservation.checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return acc + nights;
  }, 0);
  
  const occupancyRate = totalRoomNights > 0 ? (occupiedRoomNights / totalRoomNights) * 100 : 0;
  
  const revenueProjection = reservationsInRange.reduce((acc, reservation) => {
    return acc + reservation.totalAmount;
  }, 0);
  
  return {
    totalReservations: reservationsInRange.length,
    occupancyRate,
    statusBreakdown,
    revenueProjection
  };
}

// Generate date range for calendar views
export function generateDateRange(startDate: Date, days: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
}

// Format room number for display
export function formatRoomNumber(room: { number: string; isPremium: boolean }): string {
  return room.isPremium ? `⭐ ${room.number}` : room.number;
}

// Get room type display name
export function getRoomTypeDisplay(room: { type: string; nameCroatian: string; nameEnglish: string }): string {
  return room.nameEnglish;
}

// Custom event style function for React Big Calendar
export function eventStyleGetter(event: CalendarEvent) {
  const statusColors = RESERVATION_STATUS_COLORS[event.resource.status];
  
  return {
    style: {
      backgroundColor: statusColors.backgroundColor,
      borderColor: statusColors.borderColor,
      color: statusColors.textColor,
      border: `2px solid ${statusColors.borderColor}`,
      borderRadius: '6px',
      padding: '2px 6px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease'
    }
  };
}