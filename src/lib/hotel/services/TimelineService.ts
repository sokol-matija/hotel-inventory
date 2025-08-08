// TimelineService - Business logic for hotel timeline operations
// Handles date calculations, room availability, and reservation operations

import { startOfDay, addDays, isSameDay, format } from 'date-fns';
import { Room, Reservation, Guest } from '../types';
import { HOTEL_POREC_ROOMS, getRoomsByFloor } from '../hotelData';
import { SAMPLE_GUESTS } from '../sampleData';

export interface TimelineDate {
  date: Date;
  dayIndex: number;
  isToday: boolean;
  isWeekend: boolean;
  formattedDate: string;
}

export interface RoomAvailability {
  roomId: string;
  date: Date;
  isAvailable: boolean;
  reservation?: Reservation;
  conflictLevel: 'none' | 'partial' | 'full';
}

export interface DragCreateOperation {
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  startDay: number;
  endDay: number;
  isValid: boolean;
  conflicts: Reservation[];
}

export interface RoomChangeOperation {
  reservationId: string;
  currentRoom: Room;
  targetRoom: Room;
  newCheckIn: Date;
  newCheckOut: Date;
  isValid: boolean;
  conflicts: Reservation[];
}

export class TimelineService {
  private static instance: TimelineService;
  
  private constructor() {}
  
  public static getInstance(): TimelineService {
    if (!TimelineService.instance) {
      TimelineService.instance = new TimelineService();
    }
    return TimelineService.instance;
  }

  /**
   * Generate timeline dates for the given start date
   */
  public getTimelineDates(startDate: Date, days: number = 14): TimelineDate[] {
    return Array.from({ length: days }, (_, i) => {
      const date = addDays(startDate, i);
      return {
        date,
        dayIndex: i,
        isToday: isSameDay(date, new Date()),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        formattedDate: format(date, 'MMM dd')
      };
    });
  }

  /**
   * Get room availability for a specific date range
   */
  public getRoomAvailability(
    roomId: string, 
    checkIn: Date, 
    checkOut: Date, 
    reservations: Reservation[],
    excludeReservationId?: string
  ): RoomAvailability[] {
    const results: RoomAvailability[] = [];
    let currentDate = startOfDay(checkIn);
    const endDate = startOfDay(checkOut);

    while (currentDate < endDate) {
      const dayReservations = reservations.filter(res => {
        if (excludeReservationId && res.id === excludeReservationId) return false;
        if (res.roomId !== roomId) return false;
        
        const resCheckIn = startOfDay(res.checkIn);
        const resCheckOut = startOfDay(res.checkOut);
        
        return currentDate >= resCheckIn && currentDate < resCheckOut;
      });

      results.push({
        roomId,
        date: currentDate,
        isAvailable: dayReservations.length === 0,
        reservation: dayReservations[0],
        conflictLevel: dayReservations.length > 1 ? 'full' : dayReservations.length === 1 ? 'partial' : 'none'
      });

      currentDate = addDays(currentDate, 1);
    }

    return results;
  }

  /**
   * Validate drag-to-create operation
   */
  public validateDragCreate(
    roomId: string,
    startDay: number,
    endDay: number,
    timelineStartDate: Date,
    reservations: Reservation[]
  ): DragCreateOperation {
    // Ensure correct order
    const actualStartDay = Math.min(startDay, endDay);
    const actualEndDay = Math.max(startDay, endDay);
    
    const checkIn = addDays(timelineStartDate, actualStartDay);
    const checkOut = addDays(timelineStartDate, actualEndDay + 1); // +1 for checkout next day
    
    // Check for conflicts
    const conflicts = this.getConflictingReservations(roomId, checkIn, checkOut, reservations);
    
    return {
      roomId,
      checkIn,
      checkOut,
      startDay: actualStartDay,
      endDay: actualEndDay,
      isValid: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Validate room change operation
   */
  public validateRoomChange(
    reservationId: string,
    targetRoomId: string,
    newCheckIn: Date,
    newCheckOut: Date,
    reservations: Reservation[]
  ): RoomChangeOperation {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const currentRoom = HOTEL_POREC_ROOMS.find(r => r.id === reservation.roomId);
    const targetRoom = HOTEL_POREC_ROOMS.find(r => r.id === targetRoomId);
    
    if (!currentRoom || !targetRoom) {
      throw new Error('Room not found');
    }

    // Check for conflicts (excluding the current reservation)
    const conflicts = this.getConflictingReservations(
      targetRoomId, 
      newCheckIn, 
      newCheckOut, 
      reservations,
      reservationId
    );
    
    return {
      reservationId,
      currentRoom,
      targetRoom,
      newCheckIn,
      newCheckOut,
      isValid: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Get conflicting reservations for a room and date range
   */
  private getConflictingReservations(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    reservations: Reservation[],
    excludeReservationId?: string
  ): Reservation[] {
    const checkInDay = startOfDay(checkIn);
    const checkOutDay = startOfDay(checkOut);
    
    return reservations.filter(res => {
      if (excludeReservationId && res.id === excludeReservationId) return false;
      if (res.roomId !== roomId) return false;
      
      const resCheckIn = startOfDay(res.checkIn);
      const resCheckOut = startOfDay(res.checkOut);
      
      // Check for date overlap
      return (
        (checkInDay >= resCheckIn && checkInDay < resCheckOut) ||
        (checkOutDay > resCheckIn && checkOutDay <= resCheckOut) ||
        (checkInDay <= resCheckIn && checkOutDay >= resCheckOut)
      );
    });
  }

  /**
   * Get room occupancy statistics for a date range
   */
  public getRoomOccupancyStats(
    startDate: Date,
    days: number,
    reservations: Reservation[]
  ): {
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number;
    availableRooms: Room[];
    occupiedRoomIds: string[];
  } {
    const totalRooms = HOTEL_POREC_ROOMS.length;
    const timelineDates = this.getTimelineDates(startDate, days);
    
    // Get unique occupied room IDs across the timeline
    const occupiedRoomIds = new Set<string>();
    
    timelineDates.forEach(({ date }) => {
      reservations.forEach(res => {
        const resCheckIn = startOfDay(res.checkIn);
        const resCheckOut = startOfDay(res.checkOut);
        const currentDay = startOfDay(date);
        
        if (currentDay >= resCheckIn && currentDay < resCheckOut) {
          occupiedRoomIds.add(res.roomId);
        }
      });
    });

    const occupiedRooms = occupiedRoomIds.size;
    const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
    
    const availableRooms = HOTEL_POREC_ROOMS.filter(
      room => !occupiedRoomIds.has(room.id)
    );

    return {
      totalRooms,
      occupiedRooms,
      occupancyRate,
      availableRooms,
      occupiedRoomIds: Array.from(occupiedRoomIds)
    };
  }

  /**
   * Get guest information for a reservation
   */
  public getGuestForReservation(reservation: Reservation): Guest | null {
    return SAMPLE_GUESTS.find(guest => guest.id === reservation.guestId) || null;
  }

  /**
   * Get rooms grouped by floor for timeline display
   */
  public getRoomsGroupedByFloor(): Record<number, Room[]> {
    const floors = [1, 2, 3, 4];
    const result: Record<number, Room[]> = {};
    
    floors.forEach(floor => {
      result[floor] = getRoomsByFloor(floor);
    });
    
    return result;
  }

  /**
   * Calculate context menu position to avoid screen overflow
   */
  public calculateContextMenuPosition(
    clientX: number,
    clientY: number,
    menuWidth: number = 180,
    menuHeight: number = 300
  ): { x: number; y: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = clientX;
    let y = clientY;
    
    // Check if menu would go off-screen horizontally
    if (x + menuWidth > viewportWidth) {
      x = clientX - menuWidth; // Position to the left of cursor
    }
    
    // Check if menu would go off-screen vertically
    if (y + menuHeight > viewportHeight) {
      y = clientY - menuHeight; // Position above cursor
    }
    
    // Ensure minimum margins from screen edges
    x = Math.max(10, Math.min(x, viewportWidth - menuWidth - 10));
    y = Math.max(10, Math.min(y, viewportHeight - menuHeight - 10));
    
    return { x, y };
  }

  /**
   * Navigate timeline dates
   */
  public navigateTimeline(
    currentDate: Date,
    action: 'PREV' | 'NEXT' | 'TODAY'
  ): Date {
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
}