// VirtualRoomService - Manage virtual Floor 5 rooms for unallocated reservations
// Handles creation, assignment, and conversion of virtual rooms (501-599)

import { supabase } from '../../supabase';
import { Guest } from '../types';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { unifiedPricingService } from './UnifiedPricingService';

export interface VirtualRoomConfig {
  VIRTUAL_FLOOR: number;
  VIRTUAL_ROOM_START: number;
  VIRTUAL_ROOM_END: number;
  VIRTUAL_ROOM_TYPE: string;
}

export interface CreateUnallocatedReservationData {
  temporaryGuestName: string;
  checkIn: Date;
  checkOut: Date;
  numberOfPeople: number;
  notes?: string;
}

export interface AllocationResult {
  success: boolean;
  reservationId?: number;
  error?: string;
}

export class VirtualRoomService {
  private static instance: VirtualRoomService;

  private config: VirtualRoomConfig = {
    VIRTUAL_FLOOR: 5,
    VIRTUAL_ROOM_START: 501,
    VIRTUAL_ROOM_END: 599,
    VIRTUAL_ROOM_TYPE: 'UNALLOC',
  };

  private constructor() {}

  public static getInstance(): VirtualRoomService {
    if (!VirtualRoomService.instance) {
      VirtualRoomService.instance = new VirtualRoomService();
    }
    return VirtualRoomService.instance;
  }

  /**
   * Check if a room is a virtual room (Floor 5)
   */
  public isVirtualRoom(room: Room): boolean {
    return (
      room.floor_number === this.config.VIRTUAL_FLOOR ||
      room.room_types?.code === this.config.VIRTUAL_ROOM_TYPE
    );
  }

  /**
   * Check if a room number is virtual
   */
  public isVirtualRoomNumber(roomNumber: string): boolean {
    const num = parseInt(roomNumber);
    return num >= this.config.VIRTUAL_ROOM_START && num <= this.config.VIRTUAL_ROOM_END;
  }

  /**
   * Get next available virtual room for date range
   * Calls the database function we created in migration
   */
  public async getNextAvailableVirtualRoom(
    checkIn: Date,
    checkOut: Date
  ): Promise<{ success: boolean; roomId?: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_next_available_virtual_room', {
        p_check_in: checkIn.toISOString().split('T')[0],
        p_check_out: checkOut.toISOString().split('T')[0],
      });

      if (error) {
        console.error('Error getting virtual room:', error);
        return { success: false, error: error.message };
      }

      return { success: true, roomId: data };
    } catch (error) {
      console.error('Exception getting virtual room:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all virtual rooms that have active reservations for a date
   */
  public async getVirtualRoomsWithReservations(date: Date): Promise<Room[]> {
    try {
      const { data: excludedStatuses } = await supabase
        .from('reservation_statuses')
        .select('id')
        .in('code', ['cancelled', 'checked-out']);
      const excludedIds = (excludedStatuses || []).map((s) => s.id);

      let roomQuery = supabase
        .from('rooms')
        .select(
          `
          *,
          room_types!room_type_id(code),
          room_pricing(base_rate, pricing_seasons(code, year_pattern)),
          reservations!inner(*)
        `
        )
        .eq('floor_number', this.config.VIRTUAL_FLOOR)
        .lte('reservations.check_in_date', date.toISOString().split('T')[0])
        .gte('reservations.check_out_date', date.toISOString().split('T')[0]);

      if (excludedIds.length > 0) {
        roomQuery = roomQuery.not('reservations.status_id', 'in', `(${excludedIds.join(',')})`);
      }

      const { data: rooms, error } = await roomQuery;

      if (error) {
        console.error('Error fetching virtual rooms with reservations:', error);
        return [];
      }

      // Transform to Room type
      return (rooms || []).map(this.transformDatabaseRoomToRoom);
    } catch (error) {
      console.error('Exception fetching virtual rooms:', error);
      return [];
    }
  }

  /**
   * Create placeholder guest for unallocated reservation
   */
  private async getOrCreatePlaceholderGuest(temporaryName: string): Promise<number | null> {
    try {
      // Check if placeholder guest exists
      const { data: existingGuest } = await supabase
        .from('guests')
        .select('id')
        .eq('first_name', 'Unallocated')
        .eq('last_name', temporaryName)
        .single();

      if (existingGuest) {
        return existingGuest.id;
      }

      // Create new placeholder guest
      const { data: newGuest, error: createError } = await supabase
        .from('guests')
        .insert({
          first_name: 'Unallocated',
          last_name: temporaryName,
          full_name: `Unallocated - ${temporaryName}`,
          email: null,
          phone: null,
          nationality: null,
          preferred_language: 'en',
        })
        .select('id')
        .single();

      if (createError || !newGuest) {
        console.error('Error creating placeholder guest:', createError);
        return null;
      }

      return newGuest.id;
    } catch (error) {
      console.error('Exception creating placeholder guest:', error);
      return null;
    }
  }

  /**
   * Create unallocated reservation with virtual room
   */
  public async createUnallocatedReservation(
    data: CreateUnallocatedReservationData
  ): Promise<AllocationResult> {
    try {
      // Get next available virtual room
      const virtualRoomResult = await this.getNextAvailableVirtualRoom(data.checkIn, data.checkOut);

      if (!virtualRoomResult.success || !virtualRoomResult.roomId) {
        return {
          success: false,
          error: virtualRoomResult.error || 'Failed to allocate virtual room',
        };
      }

      // Get or create placeholder guest
      const guestId = await this.getOrCreatePlaceholderGuest(data.temporaryGuestName);

      if (!guestId) {
        return {
          success: false,
          error: 'Failed to create placeholder guest',
        };
      }

      // Calculate nights
      const nights = Math.ceil(
        (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create reservation
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          guest_id: guestId,
          room_id: virtualRoomResult.roomId,
          check_in_date: data.checkIn.toISOString().split('T')[0],
          check_out_date: data.checkOut.toISOString().split('T')[0],
          number_of_nights: nights,
          number_of_guests: data.numberOfPeople,
          adults: data.numberOfPeople,
          children_count: 0,
          status: 'unallocated',
          booking_source: 'direct',
          internal_notes: data.notes || '',
          seasonal_period: 'A',
          base_room_rate: 0,
          subtotal: 0,
          vat_amount: 0,
          total_amount: 0,
          payment_status: 'pending',
        })
        .select('id')
        .single();

      if (reservationError || !reservation) {
        console.error('Error creating unallocated reservation:', reservationError);
        return {
          success: false,
          error: reservationError?.message || 'Failed to create reservation',
        };
      }

      return {
        success: true,
        reservationId: reservation.id,
      };
    } catch (error) {
      console.error('Exception creating unallocated reservation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert unallocated reservation to real reservation
   * (Move from virtual room to real room)
   */
  public async convertToRealReservation(
    reservationId: number,
    targetRoomId: number,
    guestData?: Partial<Guest>
  ): Promise<AllocationResult> {
    try {
      // First, get the existing reservation to fetch dates and guest info
      const { data: existingReservation, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();

      if (fetchError || !existingReservation) {
        console.error('Error fetching reservation:', fetchError);
        return {
          success: false,
          error: 'Failed to fetch reservation: ' + (fetchError?.message || 'Not found'),
        };
      }

      // Get target room for pricing calculation
      const { data: targetRoom, error: roomError } = await supabase
        .from('rooms')
        .select(
          '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
        )
        .eq('id', targetRoomId)
        .single();

      if (roomError || !targetRoom) {
        console.error('Error fetching target room:', roomError);
        return {
          success: false,
          error: 'Failed to fetch target room: ' + (roomError?.message || 'Not found'),
        };
      }

      // Calculate new pricing based on target room

      const checkInDate = new Date(existingReservation.check_in_date);
      const checkOutDate = new Date(existingReservation.check_out_date);

      const pricing = await unifiedPricingService.calculateTotal({
        roomId: String(targetRoomId),
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: existingReservation.adults || 1,
        children: [],
        hasPets: existingReservation.has_pets || false,
        needsParking: existingReservation.parking_required || false,
        additionalCharges: 0, // additional_charges column removed — charges now in reservation_charges
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = {
        room_id: targetRoomId,
        status: 'confirmed',
        base_room_rate: pricing.baseRate,
        subtotal: pricing.subtotal,
        children_discounts: pricing.totalDiscounts,
        tourism_tax: pricing.fees.tourism,
        vat_amount: pricing.fees.vat,
        pet_fee: pricing.fees.pets,
        parking_fee: pricing.fees.parking,
        short_stay_supplement: pricing.fees.shortStay,
        total_amount: pricing.total,
      };

      // If guest data provided, create/update guest
      if (guestData && guestData.first_name && guestData.last_name) {
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            first_name: guestData.first_name,
            last_name: guestData.last_name,
            full_name: `${guestData.first_name} ${guestData.last_name}`,
            email: guestData.email || null,
            phone: guestData.phone || null,
            nationality: guestData.nationality || null,
            preferred_language: guestData.preferred_language || 'en',
          })
          .select('id')
          .single();

        if (guestError) {
          console.error('Error creating guest:', guestError);
          return {
            success: false,
            error: 'Failed to create guest: ' + guestError.message,
          };
        }

        updates.guest_id = newGuest.id;
      }

      // Update reservation with new room and pricing
      const { error: updateError } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', reservationId);

      if (updateError) {
        console.error('Error updating reservation:', updateError);
        return {
          success: false,
          error: 'Failed to update reservation: ' + updateError.message,
        };
      }

      return {
        success: true,
        reservationId,
      };
    } catch (error) {
      console.error('Exception converting to real reservation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Transform database room to application Room type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformDatabaseRoomToRoom(dbRoom: any): Room {
    const pricing = dbRoom.room_pricing as
      | { base_rate: number; pricing_seasons?: { code: string } }[]
      | null;
    return {
      id: dbRoom.id as number,
      room_number: dbRoom.room_number as string,
      floor_number: dbRoom.floor_number as number,
      room_types: dbRoom.room_types as { code: string } | null,
      max_occupancy: (dbRoom.max_occupancy as number) || 2,
      is_premium: (dbRoom.is_premium as boolean) || false,
      amenities: (dbRoom.amenities as string[]) || [],
      is_clean: (dbRoom.is_clean as boolean) || false,
      name_croatian: `Soba ${dbRoom.room_number as string}`,
      name_english: `Room ${dbRoom.room_number as string}`,
      seasonal_rates: {
        A: pricing?.find((rp) => rp.pricing_seasons?.code === 'A')?.base_rate ?? 0,
        B: pricing?.find((rp) => rp.pricing_seasons?.code === 'B')?.base_rate ?? 0,
        C: pricing?.find((rp) => rp.pricing_seasons?.code === 'C')?.base_rate ?? 0,
        D: pricing?.find((rp) => rp.pricing_seasons?.code === 'D')?.base_rate ?? 0,
      },
    } as unknown as Room;
  }
}

// Export singleton instance getter
export const virtualRoomService = VirtualRoomService.getInstance();
