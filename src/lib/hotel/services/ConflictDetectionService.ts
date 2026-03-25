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

import type { Reservation } from '@/lib/queries/hooks/useReservations';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { supabase } from '../../supabase';
import { startOfDay, endOfDay } from 'date-fns';

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
  type:
    | 'short_stay'
    | 'late_checkin'
    | 'early_checkin'
    | 'early_checkout'
    | 'peak_period'
    | 'guest_history';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRoomFromDB(room: any): Room {
  const roomType = room.room_types?.code || 'double';
  const mapping: Record<string, string> = {
    single: 'Single Room',
    double: 'Double Room',
    triple: 'Triple Room',
    family: 'Family Room',
    apartment: 'Apartment',
    BD: 'Big Double Room',
    BS: 'Big Single Room',
    D: 'Double Room',
    T: 'Triple Room',
    S: 'Single Room',
    F: 'Family Room',
    A: 'Apartment',
    RA: '401 Rooftop Apartment',
  };
  const hrMapping: Record<string, string> = {
    single: 'Jednokrevetna soba',
    double: 'Dvokrevetna soba',
    triple: 'Trokrevetna soba',
    family: 'Obiteljska soba',
    apartment: 'Apartman',
  };
  return {
    id: room.id,
    room_number: room.room_number,
    floor_number: room.floor_number ?? 1,
    room_types: room.room_types,
    max_occupancy: room.max_occupancy || 2,
    is_premium: room.is_premium || false,
    amenities: room.amenities || [],
    is_clean: room.is_clean ?? false,
    name_croatian: hrMapping[roomType] || 'Dvokrevetna soba',
    name_english:
      mapping[roomType] || `${roomType.charAt(0).toUpperCase()}${roomType.slice(1)} Room`,
    seasonal_rates: { A: 50, B: 60, C: 80, D: 100 },
  };
}

async function getRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_types!room_type_id(code)')
    .eq('is_active', true)
    .order('room_number');
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(mapRoomFromDB);
}

async function getRoomById(roomId: number): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_types!room_type_id(code)')
    .eq('id', roomId)
    .single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapRoomFromDB(data as any);
}

async function getReservationsByRoomAndDateRange(
  roomId: number,
  startDate: Date,
  endDate: Date
): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select(
      `*,
      reservation_statuses!status_id(code),
      booking_sources!booking_source_id(code),
      guests!guest_id(id, first_name, last_name, full_name, email, phone, nationality, has_pets, is_vip, vip_level),
      labels!label_id(id, name, color, bg_color)`
    )
    .eq('room_id', roomId)
    .lt('check_in_date', endDate.toISOString().split('T')[0])
    .gt('check_out_date', startDate.toISOString().split('T')[0]);
  if (error || !data) return [];
  return data as unknown as Reservation[];
}

async function getAllReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select(
      `*,
      reservation_statuses!status_id(code),
      booking_sources!booking_source_id(code),
      guests!guest_id(id, first_name, last_name, full_name, email, phone, nationality, has_pets, is_vip, vip_level),
      labels!label_id(id, name, color, bg_color)`
    )
    .order('check_in_date');
  if (error || !data) return [];
  return data as unknown as Reservation[];
}

export class ConflictDetectionService {
  private static instance: ConflictDetectionService;

  private constructor() {}

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
    excludeReservationId?: number
  ): Promise<ConflictResult> {
    const conflicts: BookingConflict[] = [];
    const warnings: BookingWarning[] = [];
    const suggestions: BookingSuggestion[] = [];

    try {
      // Get all reservations for the room in the date range
      const existingReservations = await getReservationsByRoomAndDateRange(
        Number(roomId),
        startOfDay(checkIn),
        endOfDay(checkOut)
      );

      // Filter out the reservation being edited if provided
      const relevantReservations = excludeReservationId
        ? existingReservations.filter((r) => r.id !== excludeReservationId)
        : existingReservations;

      // Check for direct room conflicts
      for (const reservation of relevantReservations) {
        if (
          this.datesOverlap(
            checkIn,
            checkOut,
            new Date(reservation.check_in_date),
            new Date(reservation.check_out_date)
          )
        ) {
          conflicts.push({
            type: 'overlapping_reservation',
            severity: 'error',
            message: `Room ${roomId} is already booked from ${new Date(reservation.check_in_date).toLocaleDateString()} to ${new Date(reservation.check_out_date).toLocaleDateString()}`,
            conflictingReservation: reservation,
          });
        }
      }

      // Check room availability and status
      const room = await getRoomById(Number(roomId));
      if (!room) {
        conflicts.push({
          type: 'room_unavailable',
          severity: 'error',
          message: `Room ${roomId} not found or unavailable`,
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
        message: 'Unable to verify room availability. Please try again.',
      });
    }

    return {
      hasConflict: conflicts.some((c) => c.severity === 'error'),
      conflicts,
      warnings,
      suggestions,
    };
  }

  /**
   * Check for conflicts when moving a reservation
   */
  async checkReservationMove(
    reservationId: number,
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
      reservationId?: number;
      guestId?: string;
    }>
  ): Promise<{ [index: number]: ConflictResult }> {
    const results: { [index: number]: ConflictResult } = {};

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      let result: ConflictResult;

      if (op.type === 'create') {
        result = await this.checkNewReservation(
          op.roomId,
          op.checkIn,
          op.checkOut,
          op.guestId || ''
        );
      } else {
        result = await this.checkReservationMove(
          op.reservationId!,
          op.roomId,
          op.checkIn,
          op.checkOut
        );
      }

      // Also check against earlier operations in this batch for the same room
      for (let j = 0; j < i; j++) {
        const prev = operations[j];
        if (prev.roomId === op.roomId) {
          const overlaps = prev.checkIn < op.checkOut && prev.checkOut > op.checkIn;
          if (overlaps) {
            result.conflicts.push({
              type: 'overlapping_reservation',
              severity: 'error',
              message: `Conflicts with operation #${j + 1} in this batch (same room, overlapping dates)`,
            });
            result.hasConflict = true;
          }
        }
      }

      results[i] = result;
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
      const allRooms = await getRooms();
      const originalRoom = allRooms.find((r) => r.id.toString() === originalRoomId);

      if (!originalRoom) return [];

      const alternatives: Room[] = [];

      for (const room of allRooms) {
        if (room.id.toString() === originalRoomId) continue;

        // Check if room is available
        const roomConflict = await this.checkNewReservation(
          room.id.toString(),
          checkIn,
          checkOut,
          ''
        );
        if (!roomConflict.hasConflict) {
          // Prefer same room type or higher
          if (
            room.room_types?.code === originalRoom.room_types?.code ||
            (room.is_premium ? 1 : 0) >= (originalRoom.is_premium ? 1 : 0)
          ) {
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
  private datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Check for maintenance periods (placeholder for future implementation)
   */
  private async checkMaintenancePeriods(
    _roomId: string,
    _checkIn: Date,
    _checkOut: Date,
    _conflicts: BookingConflict[]
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
        impact: 'May qualify for short stay supplement',
      });
    }

    // Weekend/peak period detection
    const isWeekend =
      checkIn.getDay() === 0 ||
      checkIn.getDay() === 6 ||
      checkOut.getDay() === 0 ||
      checkOut.getDay() === 6;
    if (isWeekend) {
      warnings.push({
        type: 'peak_period',
        message: 'Weekend stay - peak pricing may apply',
        impact: 'Higher rates and minimum stay requirements',
      });
    }

    // Check-in time warnings
    const checkInHour = checkIn.getHours();
    if (checkInHour < 15) {
      warnings.push({
        type: 'early_checkin',
        message: 'Check-in before 3 PM may require early check-in fee',
      });
    } else if (checkInHour > 22) {
      warnings.push({
        type: 'late_checkin',
        message: 'Late check-in after 10 PM - ensure reception availability',
      });
    }

    // Room upgrade suggestions
    // NOTE: We query rooms directly here instead of calling findAlternativeRooms()
    // to avoid infinite recursion: findAlternativeRooms → checkNewReservation → validateBusinessRules → findAlternativeRooms
    try {
      const room = await getRoomById(Number(roomId));
      if (room && !room.is_premium) {
        const allRooms = await getRooms();
        const premiumAlternatives = allRooms.filter(
          (r) => r.is_premium && r.id.toString() !== roomId
        );

        if (premiumAlternatives.length > 0) {
          suggestions.push({
            type: 'room_upgrade',
            message: `Premium room ${premiumAlternatives[0].room_number} available for upgrade`,
            roomId: premiumAlternatives[0].id.toString(),
            benefitDescription: 'Enhanced amenities and better view',
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
    sourceReservationId: number,
    targetRoomId: string,
    targetDate: Date,
    _isStartDrag: boolean = false
  ): Promise<{ valid: boolean; message?: string; conflicts?: BookingConflict[] }> {
    try {
      // Get the source reservation
      const reservations = await getAllReservations();
      const sourceReservation = reservations.find((r) => r.id === sourceReservationId);

      if (!sourceReservation) {
        return { valid: false, message: 'Source reservation not found' };
      }

      // Calculate new dates based on drag operation
      const checkOut = new Date(sourceReservation.check_out_date);
      const checkIn = new Date(sourceReservation.check_in_date);
      const originalDuration = checkOut.getTime() - checkIn.getTime();
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
        conflicts: conflictResult.conflicts,
      };
    } catch (error) {
      console.error('Error validating drag operation:', error);
      return { valid: false, message: 'Unable to validate operation' };
    }
  }
}
