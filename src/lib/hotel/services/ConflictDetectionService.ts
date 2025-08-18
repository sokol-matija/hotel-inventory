/**
 * ConflictDetectionService - Real-time booking conflict detection and validation
 * 
 * This service provides comprehensive booking conflict detection to prevent double bookings,
 * validate room availability, and enforce business rules for the hotel management system.
 * 
 * Features:
 * - Real-time conflict detection for new reservations
 * - Room availability validation with alternative suggestions
 * - Business rule enforcement (minimum stays, peak periods, check-in times)
 * - Batch operation validation for bulk reservation changes
 * - Drag-and-drop operation validation for timeline interactions
 * 
 * Usage:
 * ```typescript
 * const conflictService = ConflictDetectionService.getInstance();
 * const result = await conflictService.checkNewReservation(roomId, checkIn, checkOut, guestId);
 * if (result.hasConflict) {
 *   // Handle conflicts, show alternatives
 * }
 * ```
 * 
 * @author Hotel Management System v2.7
 * @since August 2025
 */

import { Reservation, Room, Guest } from '../types';
import { DatabaseAdapter } from './DatabaseAdapter';
import { startOfDay, endOfDay, isWithinInterval, isSameDay } from 'date-fns';

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: BookingConflict[];
  warnings: BookingWarning[];
  suggestions: BookingSuggestion[];
}

export interface BookingConflict {
  type: 'room_occupied' | 'overlapping_reservation' | 'maintenance_period' | 'room_unavailable';
  severity: 'error' | 'warning';
  message: string;
  conflictingReservation?: Reservation;
  suggestedAlternatives?: Room[];
}

export interface BookingWarning {
  type: 'short_stay' | 'late_checkin' | 'early_checkin' | 'early_checkout' | 'peak_period' | 'guest_history';
  message: string;
  impact?: string;
}

export interface BookingSuggestion {
  type: 'room_upgrade' | 'date_shift' | 'package_offer' | 'early_checkin';
  message: string;
  roomId?: string;
  suggestedDates?: { checkIn: Date; checkOut: Date };
  benefitDescription?: string;
}

export class ConflictDetectionService {
  private static instance: ConflictDetectionService;
  private databaseAdapter: DatabaseAdapter;

  private constructor() {
    this.databaseAdapter = DatabaseAdapter.getInstance();
  }

  public static getInstance(): ConflictDetectionService {
    if (!ConflictDetectionService.instance) {
      ConflictDetectionService.instance = new ConflictDetectionService();
    }
    return ConflictDetectionService.instance;
  }

  /**
   * Check for conflicts when creating a new reservation
   */
  async checkNewReservation(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    guestId: string,
    excludeReservationId?: string
  ): Promise<ConflictResult> {
    console.log('🔍 CONFLICT SERVICE: Starting checkNewReservation with:', { roomId, checkIn, checkOut, guestId, excludeReservationId });
    const conflicts: BookingConflict[] = [];
    const warnings: BookingWarning[] = [];
    const suggestions: BookingSuggestion[] = [];

    try {
      console.log('📞 CONFLICT SERVICE: Calling getReservationsByRoomAndDateRange...');
      // Get all reservations for the room in the date range
      const existingReservations = await this.databaseAdapter.getReservationsByRoomAndDateRange(
        roomId, 
        startOfDay(checkIn), 
        endOfDay(checkOut)
      );
      console.log('✅ CONFLICT SERVICE: Got existing reservations:', existingReservations.length);

      // Filter out the reservation being edited if provided
      const relevantReservations = excludeReservationId 
        ? existingReservations.filter(r => r.id !== excludeReservationId)
        : existingReservations;

      // Check for direct room conflicts
      for (const reservation of relevantReservations) {
        if (this.datesOverlap(checkIn, checkOut, reservation.checkIn, reservation.checkOut)) {
          conflicts.push({
            type: 'overlapping_reservation',
            severity: 'error',
            message: `Room ${roomId} is already booked from ${reservation.checkIn.toLocaleDateString()} to ${reservation.checkOut.toLocaleDateString()}`,
            conflictingReservation: reservation
          });
        }
      }

      // Check room availability and status
      const room = await this.databaseAdapter.getRoomById(roomId);
      if (!room) {
        conflicts.push({
          type: 'room_unavailable',
          severity: 'error',
          message: `Room ${roomId} not found or unavailable`
        });
      }

      // Check for maintenance periods (if we have that data)
      await this.checkMaintenancePeriods(roomId, checkIn, checkOut, conflicts);

      // Business rule validations
      await this.validateBusinessRules(roomId, checkIn, checkOut, guestId, warnings, suggestions);

      // Suggest alternatives if there are conflicts
      if (conflicts.length > 0) {
        const alternatives = await this.findAlternativeRooms(roomId, checkIn, checkOut);
        if (alternatives.length > 0) {
          conflicts[0].suggestedAlternatives = alternatives;
        }
      }

    } catch (error) {
      console.error('Error checking reservation conflicts:', error);
      conflicts.push({
        type: 'room_unavailable',
        severity: 'error',
        message: 'Unable to verify room availability. Please try again.'
      });
    }

    return {
      hasConflict: conflicts.some(c => c.severity === 'error'),
      conflicts,
      warnings,
      suggestions
    };
  }

  /**
   * Check for conflicts when moving a reservation
   */
  async checkReservationMove(
    reservationId: string,
    newRoomId: string,
    newCheckIn: Date,
    newCheckOut: Date
  ): Promise<ConflictResult> {
    return this.checkNewReservation(newRoomId, newCheckIn, newCheckOut, '', reservationId);
  }

  /**
   * Batch conflict check for multiple operations
   */
  async checkBatchOperations(
    operations: Array<{
      type: 'create' | 'move' | 'extend';
      roomId: string;
      checkIn: Date;
      checkOut: Date;
      reservationId?: string;
      guestId?: string;
    }>
  ): Promise<{ [index: number]: ConflictResult }> {
    const results: { [index: number]: ConflictResult } = {};
    
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (op.type === 'create') {
        results[i] = await this.checkNewReservation(op.roomId, op.checkIn, op.checkOut, op.guestId || '');
      } else if (op.type === 'move' || op.type === 'extend') {
        results[i] = await this.checkReservationMove(op.reservationId!, op.roomId, op.checkIn, op.checkOut);
      }
    }

    return results;
  }

  /**
   * Find alternative rooms for conflicted booking
   */
  private async findAlternativeRooms(
    originalRoomId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<Room[]> {
    try {
      const allRooms = await this.databaseAdapter.getRooms();
      const originalRoom = allRooms.find(r => r.id === originalRoomId);
      
      if (!originalRoom) return [];

      const alternatives: Room[] = [];

      for (const room of allRooms) {
        if (room.id === originalRoomId) continue;

        // Check if room is available
        const roomConflict = await this.checkNewReservation(room.id, checkIn, checkOut, '');
        if (!roomConflict.hasConflict) {
          // Prefer same room type or higher
          if (room.type === originalRoom.type || room.isPremium >= originalRoom.isPremium) {
            alternatives.push(room);
          }
        }
      }

      return alternatives.slice(0, 3); // Return top 3 alternatives
    } catch (error) {
      console.error('Error finding alternative rooms:', error);
      return [];
    }
  }

  /**
   * Check if two date ranges overlap
   */
  private datesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Check for maintenance periods (placeholder for future implementation)
   */
  private async checkMaintenancePeriods(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    conflicts: BookingConflict[]
  ): Promise<void> {
    // TODO: Implement maintenance period checking when maintenance table is added
    // For now, this is a placeholder for future enhancement
  }

  /**
   * Validate business rules and add warnings/suggestions
   */
  private async validateBusinessRules(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    guestId: string,
    warnings: BookingWarning[],
    suggestions: BookingSuggestion[]
  ): Promise<void> {
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Short stay warning
    if (nights === 1) {
      warnings.push({
        type: 'short_stay',
        message: 'Single night stay - consider offering early check-in or late check-out',
        impact: 'May qualify for short stay supplement'
      });
    }

    // Weekend/peak period detection
    const isWeekend = checkIn.getDay() === 0 || checkIn.getDay() === 6 || checkOut.getDay() === 0 || checkOut.getDay() === 6;
    if (isWeekend) {
      warnings.push({
        type: 'peak_period',
        message: 'Weekend stay - peak pricing may apply',
        impact: 'Higher rates and minimum stay requirements'
      });
    }

    // Check-in time warnings
    const checkInHour = checkIn.getHours();
    if (checkInHour < 15) {
      warnings.push({
        type: 'early_checkin',
        message: 'Check-in before 3 PM may require early check-in fee'
      });
    } else if (checkInHour > 22) {
      warnings.push({
        type: 'late_checkin',
        message: 'Late check-in after 10 PM - ensure reception availability'
      });
    }

    // Room upgrade suggestions
    try {
      const room = await this.databaseAdapter.getRoomById(roomId);
      if (room && !room.isPremium) {
        const premiumRooms = await this.findAlternativeRooms(roomId, checkIn, checkOut);
        const premiumAlternatives = premiumRooms.filter(r => r.isPremium);
        
        if (premiumAlternatives.length > 0) {
          suggestions.push({
            type: 'room_upgrade',
            message: `Premium room ${premiumAlternatives[0].number} available for upgrade`,
            roomId: premiumAlternatives[0].id,
            benefitDescription: 'Enhanced amenities and better view'
          });
        }
      }
    } catch (error) {
      console.error('Error checking room upgrade options:', error);
    }
  }

  /**
   * Real-time validation for drag operations
   */
  async validateDragOperation(
    sourceReservationId: string,
    targetRoomId: string,
    targetDate: Date,
    isStartDrag: boolean = false
  ): Promise<{ valid: boolean; message?: string; conflicts?: BookingConflict[] }> {
    try {
      // Get the source reservation
      const reservations = await this.databaseAdapter.getReservations();
      const sourceReservation = reservations.find(r => r.id === sourceReservationId);
      
      if (!sourceReservation) {
        return { valid: false, message: 'Source reservation not found' };
      }

      // Calculate new dates based on drag operation
      const originalDuration = sourceReservation.checkOut.getTime() - sourceReservation.checkIn.getTime();
      const newCheckIn = new Date(targetDate);
      const newCheckOut = new Date(targetDate.getTime() + originalDuration);

      // Check for conflicts
      const conflictResult = await this.checkReservationMove(
        sourceReservationId,
        targetRoomId,
        newCheckIn,
        newCheckOut
      );

      return {
        valid: !conflictResult.hasConflict,
        message: conflictResult.hasConflict ? conflictResult.conflicts[0]?.message : undefined,
        conflicts: conflictResult.conflicts
      };

    } catch (error) {
      console.error('Error validating drag operation:', error);
      return { valid: false, message: 'Unable to validate operation' };
    }
  }
}