// HotelTimelineService - Business logic for hotel timeline operations
// Handles date navigation, room status calculations, drag operations, and reservation management

import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { CalendarEvent, Reservation, Room, Guest, ReservationStatus } from '../types';
import { SAMPLE_GUESTS } from '../sampleData';
import { RESERVATION_STATUS_COLORS } from '../calendarUtils';

export interface TimelineContextMenu {
  show: boolean;
  x: number;
  y: number;
  reservationId: string;
}

export interface DragCreateState {
  roomId: string;
  dayIndex: number;
}

export interface DragCreatePreview {
  roomId: string;
  startDay: number;
  endDay: number;
}

export interface RoomChangeDialog {
  show: boolean;
  reservationId: string;
  fromRoomId: string;
  toRoomId: string;
}

export interface DrinkModalState {
  show: boolean;
  reservationId: string;
}

export interface OccupancyData {
  [roomId: string]: {
    status: ReservationStatus | 'available';
    guest?: Guest;
    reservation?: Reservation;
    checkInTime?: string;
    checkOutTime?: string;
  };
}

export interface TimelineDateRange {
  startDate: Date;
  endDate: Date;
  dates: Date[];
}

export class HotelTimelineService {
  private static instance: HotelTimelineService;
  
  private constructor() {}
  
  public static getInstance(): HotelTimelineService {
    if (!HotelTimelineService.instance) {
      HotelTimelineService.instance = new HotelTimelineService();
    }
    return HotelTimelineService.instance;
  }

  /**
   * Calculate timeline date range (14-day view)
   */
  getTimelineDateRange(currentDate: Date): TimelineDateRange {
    const startDate = startOfDay(currentDate);
    const endDate = addDays(startDate, 13);
    const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
    
    return {
      startDate,
      endDate,
      dates
    };
  }

  /**
   * Navigate timeline dates
   */
  navigateTimeline(currentDate: Date, action: 'PREV' | 'NEXT' | 'TODAY'): Date {
    switch (action) {
      case 'PREV':
        return addDays(currentDate, -14);
      case 'NEXT':
        return addDays(currentDate, 14);
      case 'TODAY':
        return new Date();
      default:
        return currentDate;
    }
  }

  /**
   * Navigate overview date (single day navigation)
   */
  navigateOverview(overviewDate: Date, action: 'PREV' | 'NEXT' | 'TODAY'): Date {
    switch (action) {
      case 'PREV':
        return addDays(overviewDate, -1);
      case 'NEXT':
        return addDays(overviewDate, 1);
      case 'TODAY':
        return new Date();
      default:
        return overviewDate;
    }
  }

  /**
   * Generate calendar events from reservations for timeline display
   */
  generateCalendarEvents(
    reservations: Reservation[], 
    startDate: Date,
    rooms: Room[]
  ): CalendarEvent[] {
    const timelineStart = startOfDay(startDate);
    const timelineEnd = addDays(timelineStart, 14);
    
    return reservations
      .filter(reservation => {
        const checkIn = startOfDay(reservation.checkIn);
        const checkOut = startOfDay(reservation.checkOut);
        
        // Show reservation if it overlaps with timeline period
        return checkIn < timelineEnd && checkOut > timelineStart;
      })
      .map(reservation => {
        const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
        const room = rooms.find(r => r.id === reservation.roomId);
        
        return {
          id: `${reservation.id}-${reservation.roomId}`,
          reservationId: reservation.id,
          roomId: reservation.roomId,
          start: reservation.checkIn,
          end: reservation.checkOut,
          title: this.getReservationTitle(reservation),
          resource: {
            status: reservation.status,
            guestName: guest ? guest.fullName : 'Unknown Guest',
            roomNumber: room ? room.number : 'Unknown Room',
            numberOfGuests: reservation.adults + reservation.children.length,
            hasPets: reservation.petFee > 0
          }
        };
      });
  }

  /**
   * Generate reservation title for display
   */
  private getReservationTitle(reservation: Reservation): string {
    const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
    return guest ? guest.fullName : 'Unknown Guest';
  }

  /**
   * Calculate reservation positioning in grid
   */
  calculateReservationPosition(
    reservation: Reservation,
    startDate: Date
  ): {
    gridColumnStart: number;
    gridColumnEnd: number;
    visibleStartHalfDay: number;
    visibleEndHalfDay: number;
    reservationDays: number;
  } {
    const checkInDate = startOfDay(reservation.checkIn);
    const checkOutDate = startOfDay(reservation.checkOut);
    const timelineStart = startOfDay(startDate);

    const startDayIndex = Math.floor((checkInDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));
    const endDayIndex = Math.floor((checkOutDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000));

    const startHalfDayIndex = startDayIndex * 2 + 1; // Second half (PM) = day * 2 + 1
    const endHalfDayIndex = endDayIndex * 2;         // First half (AM) = day * 2

    // Clamp to visible range
    const visibleStartHalfDay = Math.max(0, startHalfDayIndex);
    const visibleEndHalfDay = Math.min(27, endHalfDayIndex);

    const gridColumnStart = visibleStartHalfDay + 2; // day 0 PM = column 3
    const gridColumnEnd = visibleEndHalfDay + 3;     // +3 because CSS grid end is exclusive

    const reservationDays = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000));

    return {
      gridColumnStart,
      gridColumnEnd,
      visibleStartHalfDay,
      visibleEndHalfDay,
      reservationDays
    };
  }

  /**
   * Calculate occupancy data for room status overview
   */
  calculateOccupancyData(
    reservations: Reservation[],
    date: Date,
    rooms: Room[]
  ): OccupancyData {
    const targetDate = startOfDay(date);
    const occupancy: OccupancyData = {};

    // Initialize all rooms as available
    rooms.forEach(room => {
      occupancy[room.id] = { status: 'available' };
    });

    // Process reservations for the target date
    reservations.forEach(reservation => {
      const checkInDate = startOfDay(reservation.checkIn);
      const checkOutDate = startOfDay(reservation.checkOut);

      // Check if reservation covers the target date
      if (checkInDate <= targetDate && checkOutDate > targetDate) {
        const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);

        occupancy[reservation.roomId] = {
          status: reservation.status, // Use the actual reservation status for color coding
          guest,
          reservation,
          checkInTime: isSameDay(checkInDate, targetDate) ? '15:00' : undefined,
          checkOutTime: isSameDay(checkOutDate, targetDate) ? '11:00' : undefined
        };
      }
    });

    return occupancy;
  }

  /**
   * Calculate occupancy data filtered by AM/PM period
   *
   * AM: Show reservations checking OUT today OR middle-day stays
   * PM: Show reservations checking IN today OR middle-day stays
   */
  calculateOccupancyDataByPeriod(
    reservations: Reservation[],
    date: Date,
    rooms: Room[],
    period: 'AM' | 'PM'
  ): OccupancyData {
    const targetDate = startOfDay(date);
    const occupancy: OccupancyData = {};

    // Initialize all rooms as available
    rooms.forEach(room => {
      occupancy[room.id] = { status: 'available' };
    });

    // Process each reservation
    reservations.forEach(reservation => {
      const checkInDate = startOfDay(reservation.checkIn);
      const checkOutDate = startOfDay(reservation.checkOut);

      // Must occupy this date (>= because room is occupied until 11 AM on checkout day)
      if (!(checkInDate <= targetDate && checkOutDate >= targetDate)) {
        return;
      }

      const isCheckingOutToday = isSameDay(checkOutDate, targetDate);
      const isCheckingInToday = isSameDay(checkInDate, targetDate);
      const isMiddleDay = !isCheckingOutToday && !isCheckingInToday;

      const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
      let shouldInclude = false;

      if (period === 'AM') {
        // Show: checking out today OR middle day
        shouldInclude = isCheckingOutToday || isMiddleDay;
      } else if (period === 'PM') {
        // Show: checking in today OR middle day
        shouldInclude = isCheckingInToday || isMiddleDay;
      }

      if (shouldInclude) {
        occupancy[reservation.roomId] = {
          status: reservation.status,
          guest,
          reservation,
          checkInTime: isCheckingInToday ? '15:00' : undefined,
          checkOutTime: isCheckingOutToday ? '11:00' : undefined
        };
      }
    });

    return occupancy;
  }

  /**
   * Get rooms grouped by floor
   */
  getRoomsByFloor(rooms: Room[]): Record<number, Room[]> {
    const roomsByFloor: Record<number, Room[]> = {};
    
    rooms.forEach(room => {
      if (!roomsByFloor[room.floor]) {
        roomsByFloor[room.floor] = [];
      }
      roomsByFloor[room.floor].push(room);
    });
    
    return roomsByFloor;
  }

  /**
   * Calculate drag create preview
   */
  calculateDragCreatePreview(
    start: DragCreateState | null,
    end: DragCreateState | null
  ): DragCreatePreview | null {
    if (!start || !end || start.roomId !== end.roomId) return null;
    
    const startDay = Math.min(start.dayIndex, end.dayIndex);
    const endDay = Math.max(start.dayIndex, end.dayIndex);
    
    return {
      roomId: start.roomId,
      startDay,
      endDay
    };
  }

  /**
   * Convert day index to dates for drag create
   */
  convertDayIndexToDates(
    startDay: number,
    endDay: number,
    currentDate: Date
  ): { checkIn: Date; checkOut: Date } {
    const baseDate = startOfDay(currentDate);
    const checkIn = addDays(baseDate, startDay);
    const checkOut = addDays(baseDate, endDay + 1); // +1 because end day is inclusive
    
    return { checkIn, checkOut };
  }

  /**
   * Position context menu to stay within screen bounds
   */
  positionContextMenu(
    x: number,
    y: number,
    menuWidth: number = 200,
    menuHeight: number = 300
  ): { x: number; y: number } {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Adjust X position if menu would go off-screen
    let adjustedX = x;
    if (x + menuWidth > screenWidth) {
      adjustedX = screenWidth - menuWidth - 10; // 10px padding from edge
    }
    
    // Adjust Y position if menu would go off-screen
    let adjustedY = y;
    if (y + menuHeight > screenHeight) {
      adjustedY = screenHeight - menuHeight - 10; // 10px padding from edge
    }
    
    return { x: Math.max(10, adjustedX), y: Math.max(10, adjustedY) };
  }

  /**
   * Validate drag and drop move operation
   */
  validateReservationMove(
    reservation: Reservation,
    targetRoomId: string,
    existingReservations: Reservation[],
    rooms: Room[]
  ): { valid: boolean; error?: string } {
    // Check if target room exists
    const targetRoom = rooms.find(r => r.id === targetRoomId);
    if (!targetRoom) {
      return { valid: false, error: 'Target room not found' };
    }
    
    // Check for conflicts with existing reservations in target room
    const conflicts = existingReservations.filter(r => 
      r.id !== reservation.id && 
      r.roomId === targetRoomId &&
      r.checkIn < reservation.checkOut &&
      r.checkOut > reservation.checkIn
    );
    
    if (conflicts.length > 0) {
      return { 
        valid: false, 
        error: `Room ${targetRoom.number} has conflicting reservations during this period` 
      };
    }
    
    return { valid: true };
  }

  /**
   * Get reservation status colors
   */
  getReservationStatusColors(status: ReservationStatus) {
    return RESERVATION_STATUS_COLORS[status] || RESERVATION_STATUS_COLORS.confirmed;
  }

  /**
   * Format date range for display
   */
  formatDateRange(startDate: Date, endDate: Date): string {
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  }

  /**
   * Check if date is today
   */
  isToday(date: Date): boolean {
    return isSameDay(date, new Date());
  }

  /**
   * Check if date is weekend
   */
  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Get timeline statistics
   */
  getTimelineStats(reservations: Reservation[], startDate: Date, rooms: Room[]): {
    totalReservations: number;
    occupiedRooms: number;
    availableRooms: number;
    checkInsToday: number;
    checkOutsToday: number;
  } {
    const today = startOfDay(new Date());
    const timelineReservations = reservations.filter(r => {
      const checkIn = startOfDay(r.checkIn);
      const checkOut = startOfDay(r.checkOut);
      const timelineEnd = addDays(startDate, 14);
      return checkIn < timelineEnd && checkOut > startDate;
    });
    
    const occupiedRooms = new Set(
      timelineReservations
        .filter(r => r.status === 'checked-in' || r.status === 'confirmed')
        .map(r => r.roomId)
    ).size;
    
    const checkInsToday = reservations.filter(r => 
      isSameDay(r.checkIn, today) && (r.status === 'confirmed' || r.status === 'checked-in')
    ).length;
    
    const checkOutsToday = reservations.filter(r => 
      isSameDay(r.checkOut, today) && r.status === 'checked-in'
    ).length;
    
    return {
      totalReservations: timelineReservations.length,
      occupiedRooms,
      availableRooms: rooms.length - occupiedRooms,
      checkInsToday,
      checkOutsToday
    };
  }
}