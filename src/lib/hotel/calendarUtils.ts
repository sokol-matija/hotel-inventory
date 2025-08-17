// Hotel Calendar Utilities - Convert hotel data to calendar events
import { CalendarEvent, Reservation, ReservationStatus, Room } from './types';
import { SAMPLE_GUESTS } from './sampleData';
import { addDays, isSameDay, isWithinInterval, startOfDay } from 'date-fns';

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
export function reservationToCalendarEvent(reservation: Reservation, rooms: Room[] = []): CalendarEvent | null {
  // Safety checks for required data
  if (!reservation || !reservation.id || !reservation.checkIn || !reservation.checkOut) {
    console.warn('Invalid reservation data:', reservation);
    return null;
  }

  const room = rooms.find(r => r.id === reservation.roomId);
  const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
  
  const roomNumber = room?.number || 'Unknown';
  const guestName = guest?.fullName || reservation.guestId || 'Unknown Guest';
  
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
export function reservationsToCalendarEvents(reservations: Reservation[], rooms: Room[] = []): CalendarEvent[] {
  if (!Array.isArray(reservations)) {
    console.warn('Invalid reservations array:', reservations);
    return [];
  }
  
  return reservations
    .map(reservation => reservationToCalendarEvent(reservation, rooms))
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

/**
 * Get all occupied dates for a specific room within a date range
 * Returns array of Date objects representing days that are occupied
 */
export function getRoomOccupiedDates(
  reservations: Reservation[],
  roomId: string,
  startDate: Date,
  endDate: Date
): Date[] {
  const occupiedDates: Date[] = [];
  
  // Get reservations for this room in the date range
  const roomReservations = reservations.filter(reservation => {
    if (reservation.roomId !== roomId) return false;
    if (reservation.status === 'checked-out') return false; // Past reservations don't block
    
    // Check if reservation overlaps with our date range
    const reservationStart = startOfDay(reservation.checkIn);
    const reservationEnd = startOfDay(reservation.checkOut);
    const rangeStart = startOfDay(startDate);
    const rangeEnd = startOfDay(endDate);
    
    return (
      (reservationStart >= rangeStart && reservationStart <= rangeEnd) ||
      (reservationEnd >= rangeStart && reservationEnd <= rangeEnd) ||
      (reservationStart <= rangeStart && reservationEnd >= rangeEnd)
    );
  });
  
  // For each reservation, add all occupied dates
  roomReservations.forEach(reservation => {
    const checkIn = startOfDay(reservation.checkIn);
    const checkOut = startOfDay(reservation.checkOut);
    
    // Add all dates from check-in to check-out (exclusive of check-out date)
    let currentDate = new Date(checkIn);
    while (currentDate < checkOut) {
      // Only add dates within our search range
      if (currentDate >= startOfDay(startDate) && currentDate <= startOfDay(endDate)) {
        occupiedDates.push(new Date(currentDate));
      }
      currentDate = addDays(currentDate, 1);
    }
  });
  
  // Remove duplicates and sort
  const uniqueDates = Array.from(new Set(occupiedDates.map(date => date.getTime())))
    .map(time => new Date(time))
    .sort((a, b) => a.getTime() - b.getTime());
  
  return uniqueDates;
}

/**
 * Get the maximum available check-out date for a room given a check-in date
 * Returns null if no restriction (room is available for extended periods)
 */
export function getMaxCheckoutDate(
  reservations: Reservation[],
  roomId: string,
  checkInDate: Date
): Date | null {
  const checkIn = startOfDay(checkInDate);
  
  // Find the next reservation that starts after our check-in date
  const futureReservations = reservations
    .filter(reservation => {
      if (reservation.roomId !== roomId) return false;
      if (reservation.status === 'checked-out') return false;
      
      const reservationStart = startOfDay(reservation.checkIn);
      return reservationStart > checkIn;
    })
    .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
  
  // If there's a future reservation, the max checkout is the day before it starts
  if (futureReservations.length > 0) {
    const nextReservationStart = startOfDay(futureReservations[0].checkIn);
    return nextReservationStart;
  }
  
  // No future reservations found - no restriction
  return null;
}

/**
 * Check if a specific date is available for a room
 * Useful for individual date checking in date pickers
 */
export function isDateAvailableForRoom(
  reservations: Reservation[],
  roomId: string,
  date: Date
): boolean {
  const targetDate = startOfDay(date);
  
  return !reservations.some(reservation => {
    if (reservation.roomId !== roomId) return false;
    if (reservation.status === 'checked-out') return false;
    
    const checkIn = startOfDay(reservation.checkIn);
    const checkOut = startOfDay(reservation.checkOut);
    
    // Date is occupied if it's between check-in (inclusive) and check-out (exclusive)
    return targetDate >= checkIn && targetDate < checkOut;
  });
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
  rooms: Room[],
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
  
  const totalRoomNights = rooms.length * 
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

// Hotel-specific time utilities for half-day booking logic
export const HOTEL_TIMES = {
  CHECK_IN_HOUR: 15, // 3:00 PM
  CHECK_IN_MINUTE: 0,
  CHECK_OUT_HOUR: 11, // 11:00 AM
  CHECK_OUT_MINUTE: 0
} as const;

// Create a proper check-in date with hotel-specific time
export function createCheckInDate(date: Date): Date {
  const checkInDate = new Date(date);
  checkInDate.setHours(HOTEL_TIMES.CHECK_IN_HOUR, HOTEL_TIMES.CHECK_IN_MINUTE, 0, 0);
  return checkInDate;
}

// Create a proper check-out date with hotel-specific time
export function createCheckOutDate(date: Date): Date {
  const checkOutDate = new Date(date);
  checkOutDate.setHours(HOTEL_TIMES.CHECK_OUT_HOUR, HOTEL_TIMES.CHECK_OUT_MINUTE, 0, 0);
  return checkOutDate;
}

// Calculate visual position offset for half-day display
export function getVisualStartOffset(): number {
  // Check-in at 3PM means visual start at 62.5% of the day (15/24 = 0.625)
  return 0.5; // Simplified to 50% for clean visual representation
}

// Calculate visual end offset for half-day display  
export function getVisualEndOffset(): number {
  // Check-out at 11AM means visual end at 45.8% of the day (11/24 = 0.458)
  return 0.5; // Simplified to 50% for clean visual representation
}

// Update existing reservation date logic to use proper times
export function normalizeReservationDates(checkIn: Date, checkOut: Date): { checkIn: Date; checkOut: Date } {
  return {
    checkIn: createCheckInDate(checkIn),
    checkOut: createCheckOutDate(checkOut)
  };
}
