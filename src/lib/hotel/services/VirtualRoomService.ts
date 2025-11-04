// VirtualRoomService - Manage virtual Floor 5 rooms for unallocated reservations
// Handles creation, assignment, and conversion of virtual rooms (501-599)

import { supabase } from '../../supabase';
import { Room, Reservation, Guest } from '../types';

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
  reservationId?: string;
  error?: string;
}

export class VirtualRoomService {
  private static instance: VirtualRoomService;

  private config: VirtualRoomConfig = {
    VIRTUAL_FLOOR: 5,
    VIRTUAL_ROOM_START: 501,
    VIRTUAL_ROOM_END: 599,
    VIRTUAL_ROOM_TYPE: 'UNALLOC'
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
    return room.floor === this.config.VIRTUAL_FLOOR ||
           room.type === this.config.VIRTUAL_ROOM_TYPE;
  }

  /**
   * Check if a room number is virtual
   */
  public isVirtualRoomNumber(roomNumber: string): boolean {
    const num = parseInt(roomNumber);
    return num >= this.config.VIRTUAL_ROOM_START &&
           num <= this.config.VIRTUAL_ROOM_END;
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
      const { data, error } = await supabase
        .rpc('get_next_available_virtual_room', {
          p_check_in: checkIn.toISOString().split('T')[0],
          p_check_out: checkOut.toISOString().split('T')[0]
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
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all virtual rooms that have active reservations for a date
   */
  public async getVirtualRoomsWithReservations(
    date: Date
  ): Promise<Room[]> {
    try {
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
          *,
          reservations!inner(*)
        `)
        .eq('floor_number', this.config.VIRTUAL_FLOOR)
        .lte('reservations.check_in_date', date.toISOString().split('T')[0])
        .gte('reservations.check_out_date', date.toISOString().split('T')[0])
        .neq('reservations.status', 'cancelled')
        .neq('reservations.status', 'checked-out');

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
  private async getOrCreatePlaceholderGuest(
    temporaryName: string
  ): Promise<number | null> {
    try {
      // Check if placeholder guest exists
      const { data: existingGuest, error: searchError } = await supabase
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
          preferred_language: 'en'
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
      const virtualRoomResult = await this.getNextAvailableVirtualRoom(
        data.checkIn,
        data.checkOut
      );

      if (!virtualRoomResult.success || !virtualRoomResult.roomId) {
        return {
          success: false,
          error: virtualRoomResult.error || 'Failed to allocate virtual room'
        };
      }

      // Get or create placeholder guest
      const guestId = await this.getOrCreatePlaceholderGuest(
        data.temporaryGuestName
      );

      if (!guestId) {
        return {
          success: false,
          error: 'Failed to create placeholder guest'
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
          payment_status: 'pending'
        })
        .select('id')
        .single();

      if (reservationError || !reservation) {
        console.error('Error creating unallocated reservation:', reservationError);
        return {
          success: false,
          error: reservationError?.message || 'Failed to create reservation'
        };
      }

      return {
        success: true,
        reservationId: reservation.id.toString()
      };
    } catch (error) {
      console.error('Exception creating unallocated reservation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert unallocated reservation to real reservation
   * (Move from virtual room to real room)
   */
  public async convertToRealReservation(
    reservationId: string,
    targetRoomId: string,
    guestData?: Partial<Guest>
  ): Promise<AllocationResult> {
    try {
      // First, get the existing reservation to fetch dates and guest info
      const { data: existingReservation, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', parseInt(reservationId))
        .single();

      if (fetchError || !existingReservation) {
        console.error('Error fetching reservation:', fetchError);
        return {
          success: false,
          error: 'Failed to fetch reservation: ' + (fetchError?.message || 'Not found')
        };
      }

      // Get target room for pricing calculation
      const { data: targetRoom, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', parseInt(targetRoomId))
        .single();

      if (roomError || !targetRoom) {
        console.error('Error fetching target room:', roomError);
        return {
          success: false,
          error: 'Failed to fetch target room: ' + (roomError?.message || 'Not found')
        };
      }

      // Calculate new pricing based on target room
      const { calculatePricing } = await import('../pricingCalculator');
      const checkInDate = new Date(existingReservation.check_in_date);
      const checkOutDate = new Date(existingReservation.check_out_date);

      // Transform target room to Room type for pricing calculation
      const transformedRoom = this.transformDatabaseRoomToRoom(targetRoom);

      const pricing = calculatePricing(
        targetRoomId,
        checkInDate,
        checkOutDate,
        existingReservation.adults || 1,
        [], // children - will use children_count from reservation
        {
          hasPets: existingReservation.has_pets || false,
          needsParking: existingReservation.parking_required || false,
          additionalCharges: existingReservation.additional_charges || 0
        },
        [transformedRoom] // Pass the target room so pricing calculator can find it
      );

      const updates: any = {
        room_id: parseInt(targetRoomId),
        status: 'confirmed',
        // Update all pricing fields
        base_room_rate: pricing.baseRate,
        subtotal: pricing.subtotal,
        children_discounts: pricing.totalDiscounts,
        tourism_tax: pricing.fees.tourism,
        vat_amount: pricing.fees.vat,
        pet_fee: pricing.fees.pets,
        parking_fee: pricing.fees.parking,
        short_stay_supplement: pricing.fees.shortStay,
        total_amount: pricing.total
      };

      // If guest data provided, create/update guest
      if (guestData && guestData.firstName && guestData.lastName) {
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            first_name: guestData.firstName,
            last_name: guestData.lastName,
            full_name: `${guestData.firstName} ${guestData.lastName}`,
            email: guestData.email || null,
            phone: guestData.phone || null,
            nationality: guestData.nationality || null,
            preferred_language: guestData.preferredLanguage || 'en'
          })
          .select('id')
          .single();

        if (guestError) {
          console.error('Error creating guest:', guestError);
          return {
            success: false,
            error: 'Failed to create guest: ' + guestError.message
          };
        }

        updates.guest_id = newGuest.id;
      }

      // Update reservation with new room and pricing
      const { error: updateError } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', parseInt(reservationId));

      if (updateError) {
        console.error('Error updating reservation:', updateError);
        return {
          success: false,
          error: 'Failed to update reservation: ' + updateError.message
        };
      }

      return {
        success: true,
        reservationId
      };
    } catch (error) {
      console.error('Exception converting to real reservation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Transform database room to application Room type
   */
  private transformDatabaseRoomToRoom(dbRoom: any): Room {
    return {
      id: dbRoom.id.toString(),
      number: dbRoom.room_number,
      floor: dbRoom.floor_number,
      type: dbRoom.room_type,
      nameCroatian: `Soba ${dbRoom.room_number}`,
      nameEnglish: `Room ${dbRoom.room_number}`,
      seasonalRates: {
        A: parseFloat(dbRoom.seasonal_rate_a || 0),
        B: parseFloat(dbRoom.seasonal_rate_b || 0),
        C: parseFloat(dbRoom.seasonal_rate_c || 0),
        D: parseFloat(dbRoom.seasonal_rate_d || 0)
      },
      maxOccupancy: dbRoom.max_occupancy || 2,
      isPremium: dbRoom.is_premium || false,
      amenities: dbRoom.amenities || [],
      is_clean: dbRoom.is_clean || false
    };
  }
}

// Export singleton instance getter
export const virtualRoomService = VirtualRoomService.getInstance();
