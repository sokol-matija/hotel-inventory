// HotelDataService - Supabase integration for hotel data management
// Handles rooms, room types, guests, and reservations

import { supabase, Database } from '../../supabase';
import { Room, Guest, Reservation, Hotel, RoomType as AppRoomType } from '../types';
import { HOTEL_POREC } from '../hotelData';

// Database row types from Supabase
type HotelRow = Database['public']['Tables']['hotels']['Row'];
type RoomTypeRow = Database['public']['Tables']['room_types']['Row'];
type RoomRow = Database['public']['Tables']['rooms']['Row'];
type GuestRow = Database['public']['Tables']['guests']['Row'];
type ReservationRow = Database['public']['Tables']['reservations']['Row'];

// Hotel Porec ID in database
// Generate a proper UUID for Hotel Porec 
// Using deterministic UUID v5 based on name for consistency across deployments
const HOTEL_POREC_ID = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for Hotel Porec

export class HotelDataService {
  private static instance: HotelDataService;
  
  private constructor() {}
  
  public static getInstance(): HotelDataService {
    if (!HotelDataService.instance) {
      HotelDataService.instance = new HotelDataService();
    }
    return HotelDataService.instance;
  }

  /**
   * Get hotel information
   */
  async getHotel(): Promise<Hotel> {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', HOTEL_POREC_ID)
        .single();

      if (error) throw error;
      
      if (data) {
        return this.mapHotelFromDB(data);
      }
      
      // Return default hotel data if not found in DB
      return HOTEL_POREC;
    } catch (error) {
      console.error('Error fetching hotel:', error);
      return HOTEL_POREC;
    }
  }

  /**
   * Get all room types
   */
  async getRoomTypes(): Promise<Array<RoomTypeRow & { mapped: any }>> {
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .eq('hotel_id', HOTEL_POREC_ID)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching room types:', error);
      return [];
    }
  }

  /**
   * Get all rooms with room type information
   */
  async getRooms(): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_type:room_types (
            code,
            name_croatian,
            name_english,
            max_occupancy,
            amenities
          )
        `)
        .eq('hotel_id', HOTEL_POREC_ID)
        .eq('is_active', true)
        .order('number');

      if (error) throw error;
      
      return data?.map(room => this.mapRoomFromDB(room)) || [];
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  }

  /**
   * Get rooms by floor
   */
  async getRoomsByFloor(floor: number): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_type:room_types (
            code,
            name_croatian,
            name_english,
            max_occupancy,
            amenities
          )
        `)
        .eq('hotel_id', HOTEL_POREC_ID)
        .eq('floor', floor)
        .eq('is_active', true)
        .order('number');

      if (error) throw error;
      
      return data?.map(room => this.mapRoomFromDB(room)) || [];
    } catch (error) {
      console.error('Error fetching rooms by floor:', error);
      return [];
    }
  }

  /**
   * Get room by ID
   */
  async getRoomById(roomId: string): Promise<Room | null> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_type:room_types (
            code,
            name_croatian,
            name_english,
            max_occupancy,
            amenities
          )
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;
      
      return data ? this.mapRoomFromDB(data) : null;
    } catch (error) {
      console.error('Error fetching room by ID:', error);
      return null;
    }
  }

  /**
   * Get all guests
   */
  async getGuests(): Promise<Guest[]> {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      
      return data?.map(guest => this.mapGuestFromDB(guest)) || [];
    } catch (error) {
      console.error('Error fetching guests:', error);
      return [];
    }
  }

  /**
   * Create new guest
   */
  async createGuest(guestData: Omit<Guest, 'id' | 'totalStays' | 'isVip'>): Promise<Guest> {
    try {
      const { data, error } = await supabase
        .from('guests')
        .insert({
          first_name: guestData.firstName,
          last_name: guestData.lastName,
          email: guestData.email || null,
          phone: guestData.phone || null,
          emergency_contact_name: guestData.emergencyContactName || null,
          emergency_contact_phone: guestData.emergencyContactPhone || null,
          nationality: guestData.nationality || null,
          preferred_language: guestData.preferredLanguage || 'en',
          has_pets: guestData.hasPets || false,
          date_of_birth: guestData.dateOfBirth?.toISOString() || null,
          is_vip: false,
          total_stays: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      return this.mapGuestFromDB(data);
    } catch (error) {
      console.error('Error creating guest:', error);
      throw error;
    }
  }

  /**
   * Update guest
   */
  async updateGuest(id: string, updates: Partial<Guest>): Promise<Guest> {
    try {
      const { data, error } = await supabase
        .from('guests')
        .update({
          email: updates.email,
          phone: updates.phone,
          emergency_contact_name: updates.emergencyContactName,
          emergency_contact_phone: updates.emergencyContactPhone,
          nationality: updates.nationality,
          preferred_language: updates.preferredLanguage,
          has_pets: updates.hasPets,
          date_of_birth: updates.dateOfBirth?.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      return this.mapGuestFromDB(data);
    } catch (error) {
      console.error('Error updating guest:', error);
      throw error;
    }
  }

  /**
   * Find guests by last name
   */
  async findGuestByLastname(lastname: string): Promise<Guest[]> {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .ilike('last_name', `%${lastname}%`);

      if (error) throw error;
      
      return data?.map(guest => this.mapGuestFromDB(guest)) || [];
    } catch (error) {
      console.error('Error finding guests by lastname:', error);
      return [];
    }
  }

  /**
   * Get all reservations
   */
  async getReservations(): Promise<Reservation[]> {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests!primary_guest_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            nationality,
            preferred_language,
            has_pets
          ),
          room:rooms (
            id,
            number,
            floor,
            room_type:room_types (
              code,
              name_croatian,
              name_english
            )
          )
        `)
        .eq('hotel_id', HOTEL_POREC_ID)
        .order('check_in', { ascending: true });

      if (error) throw error;
      
      return data?.map(reservation => this.mapReservationFromDB(reservation)) || [];
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }
  }

  /**
   * Get reservations for date range
   */
  async getReservationsForDateRange(startDate: Date, endDate: Date): Promise<Reservation[]> {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests!primary_guest_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            nationality,
            preferred_language,
            has_pets
          ),
          room:rooms (
            id,
            number,
            floor,
            room_type:room_types (
              code,
              name_croatian,
              name_english
            )
          )
        `)
        .eq('hotel_id', HOTEL_POREC_ID)
        .gte('check_out', startDate.toISOString().split('T')[0])
        .lte('check_in', endDate.toISOString().split('T')[0])
        .order('check_in', { ascending: true });

      if (error) throw error;
      
      return data?.map(reservation => this.mapReservationFromDB(reservation)) || [];
    } catch (error) {
      console.error('Error fetching reservations for date range:', error);
      return [];
    }
  }

  /**
   * Create new reservation
   */
  async createReservation(reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>): Promise<Reservation> {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert({
          hotel_id: HOTEL_POREC_ID,
          room_id: reservationData.roomId,
          primary_guest_id: reservationData.guestId,
          confirmation_number: this.generateConfirmationNumber(),
          check_in: reservationData.checkIn.toISOString().split('T')[0],
          check_out: reservationData.checkOut.toISOString().split('T')[0],
          adults: reservationData.adults,
          children: reservationData.children?.length || 0,
          total_guests: reservationData.numberOfGuests,
          booking_source: reservationData.bookingSource || 'direct',
          special_requests: reservationData.specialRequests || null,
          status: reservationData.status || 'confirmed',
          seasonal_period: reservationData.seasonalPeriod,
          base_room_rate: reservationData.baseRoomRate,
          number_of_nights: reservationData.numberOfNights,
          subtotal_accommodation: reservationData.subtotal,
          children_discount: reservationData.childrenDiscounts || 0,
          tourism_tax: reservationData.tourismTax || 0,
          vat_accommodation: reservationData.vatAmount,
          pet_fee_subtotal: reservationData.petFee || 0,
          parking_fee_subtotal: reservationData.parkingFee || 0,
          short_stay_supplement: reservationData.shortStaySuplement || 0,
          additional_services_subtotal: reservationData.additionalCharges || 0,
          total_amount: reservationData.totalAmount,
          total_vat_amount: reservationData.vatAmount,
          payment_status: 'pending',
          has_pets: (reservationData.petFee || 0) > 0, // Based on whether pet fee was charged
          booking_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      // Fetch the complete reservation with relations
      const newReservation = await this.getReservationById(data.id);
      if (!newReservation) {
        throw new Error('Failed to fetch created reservation');
      }
      
      return newReservation;
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  }

  /**
   * Update reservation
   */
  async updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
    try {
      const updateData: any = {};
      
      if (updates.checkIn) updateData.check_in = updates.checkIn.toISOString().split('T')[0];
      if (updates.checkOut) updateData.check_out = updates.checkOut.toISOString().split('T')[0];
      if (updates.adults !== undefined) updateData.adults = updates.adults;
      if (updates.status) updateData.status = updates.status;
      if (updates.specialRequests !== undefined) updateData.special_requests = updates.specialRequests;
      if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      // Fetch the updated reservation
      const updatedReservation = await this.getReservationById(id);
      if (!updatedReservation) {
        throw new Error('Failed to fetch updated reservation');
      }
      
      return updatedReservation;
    } catch (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }
  }

  /**
   * Delete reservation
   */
  async deleteReservation(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting reservation:', error);
      throw error;
    }
  }

  /**
   * Get reservation by ID
   */
  private async getReservationById(id: string): Promise<Reservation | null> {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests!primary_guest_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            nationality,
            preferred_language,
            has_pets
          ),
          room:rooms (
            id,
            number,
            floor,
            room_type:room_types (
              code,
              name_croatian,
              name_english
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return data ? this.mapReservationFromDB(data) : null;
    } catch (error) {
      console.error('Error fetching reservation by ID:', error);
      return null;
    }
  }

  /**
   * Check room availability
   */
  async checkRoomAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', roomId)
        .not('status', 'eq', 'cancelled')
        .or(`check_out.lte.${checkIn.toISOString().split('T')[0]},check_in.gte.${checkOut.toISOString().split('T')[0]}`);

      if (error) throw error;
      
      // Room is available if no conflicting reservations found
      return !data || data.length === 0;
    } catch (error) {
      console.error('Error checking room availability:', error);
      return false;
    }
  }

  /**
   * Get available rooms for date range
   */
  async getAvailableRooms(checkIn: Date, checkOut: Date): Promise<Room[]> {
    try {
      // Get all rooms first
      const allRooms = await this.getRooms();
      
      // Check availability for each room
      const availableRooms: Room[] = [];
      
      for (const room of allRooms) {
        const isAvailable = await this.checkRoomAvailability(room.id, checkIn, checkOut);
        if (isAvailable) {
          availableRooms.push(room);
        }
      }
      
      return availableRooms;
    } catch (error) {
      console.error('Error getting available rooms:', error);
      return [];
    }
  }

  // Private mapping methods
  private mapHotelFromDB(hotelRow: HotelRow): Hotel {
    const address = hotelRow.address as any;
    const contact = hotelRow.contact_info as any;
    
    return {
      id: hotelRow.id,
      name: hotelRow.name,
      address: address?.full || 'Unknown address',
      phone: contact?.phone || '',
      fax: contact?.fax || '',
      email: contact?.email || '',
      website: contact?.website || '',
      taxId: hotelRow.oib
    };
  }

  private mapRoomFromDB(roomRow: any): Room {
    const roomType = roomRow.room_type;
    
    return {
      id: roomRow.id,
      number: roomRow.number,
      floor: roomRow.floor,
      type: this.mapRoomTypeCode(roomType?.code || 'unknown'),
      nameCroatian: roomType?.name_croatian || '',
      nameEnglish: roomType?.name_english || '',
      seasonalRates: {
        A: 50, // TODO: Get from database pricing
        B: 60,
        C: 80,
        D: 100
      },
      maxOccupancy: roomRow.max_occupancy_override || roomType?.max_occupancy || 2,
      isPremium: roomRow.is_premium || false,
      amenities: roomType?.amenities || []
    };
  }

  private mapGuestFromDB(guestRow: GuestRow): Guest {
    return {
      id: guestRow.id,
      firstName: guestRow.first_name || '',
      lastName: guestRow.last_name || '',
      fullName: `${guestRow.first_name || ''} ${guestRow.last_name || ''}`.trim(),
      email: guestRow.email || '',
      phone: guestRow.phone || '',
      dateOfBirth: guestRow.date_of_birth ? new Date(guestRow.date_of_birth) : undefined,
      nationality: guestRow.nationality || '',
      preferredLanguage: guestRow.preferred_language || 'en',
      dietaryRestrictions: [],
      hasPets: guestRow.has_pets || false,
      isVip: guestRow.is_vip || false,
      vipLevel: 0,
      children: [], // TODO: Load from guest_children table
      totalStays: guestRow.total_stays || 0,
      emergencyContactName: guestRow.emergency_contact_name || '',
      emergencyContactPhone: guestRow.emergency_contact_phone || '',
      createdAt: guestRow.created_at ? new Date(guestRow.created_at) : new Date(),
      updatedAt: guestRow.updated_at ? new Date(guestRow.updated_at) : new Date()
    };
  }

  private mapReservationFromDB(reservationRow: any): Reservation {
    const guest = reservationRow.guest;
    const room = reservationRow.room;
    
    return {
      id: reservationRow.id,
      roomId: reservationRow.room_id,
      guestId: reservationRow.primary_guest_id,
      checkIn: new Date(reservationRow.check_in),
      checkOut: new Date(reservationRow.check_out),
      numberOfGuests: reservationRow.total_guests || (reservationRow.adults + (reservationRow.children || 0)),
      adults: reservationRow.adults,
      children: [], // TODO: Load from reservation_guests table
      status: reservationRow.status as any,
      bookingSource: reservationRow.booking_source as any,
      specialRequests: reservationRow.special_requests || '',
      seasonalPeriod: reservationRow.seasonal_period as any,
      baseRoomRate: reservationRow.base_room_rate,
      numberOfNights: reservationRow.number_of_nights || 1,
      subtotal: reservationRow.subtotal_accommodation,
      childrenDiscounts: reservationRow.children_discount || 0,
      tourismTax: reservationRow.tourism_tax || 0,
      vatAmount: reservationRow.vat_accommodation,
      petFee: reservationRow.pet_fee_subtotal || 0,
      parkingFee: reservationRow.parking_fee_subtotal || 0,
      shortStaySuplement: reservationRow.short_stay_supplement || 0,
      additionalCharges: reservationRow.additional_services_subtotal || 0,
      roomServiceItems: [], // TODO: Load from separate table
      totalAmount: reservationRow.total_amount,
      bookingDate: new Date(reservationRow.booking_date || reservationRow.created_at),
      lastModified: new Date(reservationRow.updated_at || reservationRow.created_at),
      notes: reservationRow.notes || ''
    };
  }

  private mapRoomTypeCode(code: string): AppRoomType {
    const mapping: Record<string, AppRoomType> = {
      'BD': 'big-double',
      'BS': 'big-single',
      'D': 'double',
      'T': 'triple',
      'S': 'single',
      'F': 'family',
      'A': 'apartment',
      'RA': 'rooftop-apartment'
    };
    
    return mapping[code] || 'double';
  }

  private generateConfirmationNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `HP${year}${month}${random}`;
  }
}

export const hotelDataService = HotelDataService.getInstance();