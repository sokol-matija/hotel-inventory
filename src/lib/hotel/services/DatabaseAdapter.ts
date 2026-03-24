// DatabaseAdapter - Maps current database schema to application expectations
// This adapter allows the existing application code to work with the current database structure

import { supabase } from '../../supabase';
import { Room, Guest, Reservation, Hotel, RoomType as AppRoomType } from '../types';
import { HOTEL_ID } from '../constants';

// Type mappings for current database structure
interface CurrentDBRoom {
  id: number;
  room_number: string;
  floor_number: number;
  room_types: { code: string } | null;
  max_occupancy: number;
  is_premium: boolean;
  room_pricing: Array<{
    base_rate: number;
    pricing_seasons: { code: string; year_pattern: number } | null;
  }> | null;
  amenities: string[];
  is_active: boolean;
  is_clean: boolean;
  created_at: string;
  updated_at: string;
}

interface CurrentDBReservation {
  id: number;
  guest_id: number;
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  number_of_nights: number;
  number_of_guests: number;
  adults: number;
  children_count: number;
  status_id: number;
  booking_source_id: number;
  special_requests: string;
  internal_notes: string;
  booking_date: string;
  confirmation_number: string;
  created_at: string;
  updated_at: string;
  company_id: number | null;
  pricing_tier_id: number | null;
  has_pets: boolean;
  parking_required: boolean;
  last_modified: string;
  label_id: string | null;
  is_r1: boolean | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

interface CurrentDBGuest {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  created_at: string;
  updated_at: string;
  date_of_birth: string | null;
  passport_number: string | null;
  id_card_number: string | null;
  preferred_language: string | null;
  dietary_restrictions: string[] | null;
  special_needs: string | null;
  has_pets: boolean | null;
  is_vip: boolean | null;
  vip_level: number | null;
  marketing_consent: boolean | null;
  average_rating: number | null;
  notes: string | null;
  country_code: string | null;
  full_name: string | null;
}

export class DatabaseAdapter {
  private static instance: DatabaseAdapter;
  // Hotel Porec UUID — must match the hotels table PK (UUID type, per DB schema)
  private hotelId = HOTEL_ID;

  private constructor() {}

  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  /**
   * Get hotel information - adapt to current schema
   */
  async getHotel(): Promise<Hotel> {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('id', this.hotelId as any)
        .single();

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const addr = data.address as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contact = data.contact_info as any;
      return {
        id: data.id.toString(),
        name: data.name || 'Hotel Porec',
        address: addr?.street || 'R Konoba 1, Poreč',
        phone: contact?.phone || '+385(0)52/451 611',
        fax: contact?.fax || '+385(0)52/433 462',
        email: contact?.email || 'hotelporec@pu.t-com.hr',
        website: contact?.website || 'www.hotelporec.com',
        taxId: data.oib || '87246357068',
      };
    } catch (error) {
      console.error('Error fetching hotel:', error);
      // Return default hotel data
      return {
        id: '1',
        name: 'Hotel Porec',
        address: 'R Konoba 1, Poreč',
        phone: '+385(0)52/451 611',
        fax: '+385(0)52/433 462',
        email: 'hotelporec@pu.t-com.hr',
        website: 'www.hotelporec.com',
        taxId: '87246357068',
      };
    }
  }

  /**
   * Get all rooms - adapt current flat structure to expected format
   */
  async getRooms(): Promise<Room[]> {
    try {
      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select(
          '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
        )
        .eq('is_active', true)
        .order('room_number');

      if (error) throw error;

      return (roomsData as CurrentDBRoom[]).map((room) => this.mapRoomFromCurrentDB(room));
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  }

  /**
   * Get room by ID - adapt current schema
   */
  async getRoomById(roomId: string): Promise<Room | null> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(
          '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
        )
        .eq('id', parseInt(roomId))
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return this.mapRoomFromCurrentDB(data as CurrentDBRoom);
    } catch (error) {
      console.error('Error fetching room by ID:', error);
      return null;
    }
  }

  /**
   * Update room (e.g., mark as clean/dirty)
   */
  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room> {
    try {
      const updateData: Record<string, unknown> = {};

      // Map Room interface fields to database column names
      if (updates.is_clean !== undefined) {
        updateData.is_clean = updates.is_clean;
      }
      if (updates.number !== undefined) {
        updateData.room_number = updates.number;
      }
      if (updates.floor !== undefined) {
        updateData.floor_number = updates.floor;
      }
      // Add more mappings as needed

      const { data, error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', parseInt(roomId))
        .select(
          '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
        )
        .single();

      if (error) throw error;

      return this.mapRoomFromCurrentDB(data as CurrentDBRoom);
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  }

  /**
   * Get reservations by room and date range
   */
  async getReservationsByRoomAndDateRange(
    roomId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Reservation[]> {
    try {
      // Get reservations for the specific room and date range
      // Overlap predicate: reservation overlaps [startDate, endDate] when
      // check_in_date < endDate AND check_out_date > startDate
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('room_id', parseInt(roomId))
        .lt('check_in_date', endDate.toISOString().split('T')[0])
        .gt('check_out_date', startDate.toISOString().split('T')[0]);

      if (reservationsError) throw reservationsError;

      // Get guests separately to avoid JOIN issues
      const { data: guestsData, error: guestsError } = await supabase.from('guests').select('*');

      if (guestsError) throw guestsError;

      // Get rooms separately
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select(
          '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
        );

      if (roomsError) throw roomsError;

      // Get status and booking source lookups
      const { data: statusesData } = await supabase.from('reservation_statuses').select('id, code');
      const { data: sourcesData } = await supabase.from('booking_sources').select('id, code');
      const statusLookup = new Map((statusesData || []).map((s) => [s.id, s.code as string]));
      const sourceLookup = new Map((sourcesData || []).map((s) => [s.id, s.code as string]));

      // Create lookup maps
      const guestLookup = new Map((guestsData as CurrentDBGuest[]).map((g) => [g.id, g]));
      const roomLookup = new Map((roomsData as CurrentDBRoom[]).map((r) => [r.id, r]));

      return (reservationsData as CurrentDBReservation[]).map((reservation) =>
        this.mapReservationFromCurrentDB(
          reservation,
          guestLookup,
          roomLookup,
          undefined,
          statusLookup,
          sourceLookup
        )
      );
    } catch (error) {
      console.error('Error fetching reservations by room and date range:', error);
      return [];
    }
  }

  /**
   * Get all guests - adapt current schema
   */
  async getGuests(): Promise<Guest[]> {
    try {
      const { data, error } = await supabase.from('guests').select('*').order('last_name');

      if (error) throw error;

      return (data as CurrentDBGuest[]).map((guest) => this.mapGuestFromCurrentDB(guest));
    } catch (error) {
      console.error('Error fetching guests:', error);
      return [];
    }
  }

  /**
   * Get all reservations with guests - adapt current schema
   */
  async getReservations(): Promise<Reservation[]> {
    try {
      // Get reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .order('check_in_date');

      if (reservationsError) throw reservationsError;

      // Get guests separately to avoid JOIN issues
      const { data: guestsData, error: guestsError } = await supabase.from('guests').select('*');

      if (guestsError) throw guestsError;

      // Get rooms separately
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select(
          '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
        );

      if (roomsError) throw roomsError;

      // Get labels separately
      const { data: labelsData, error: labelsError } = await supabase.from('labels').select('*');

      if (labelsError) throw labelsError;

      // Get status and booking source lookups
      const { data: statusesData } = await supabase.from('reservation_statuses').select('id, code');
      const { data: sourcesData } = await supabase.from('booking_sources').select('id, code');
      const statusLookup = new Map((statusesData || []).map((s) => [s.id, s.code as string]));
      const sourceLookup = new Map((sourcesData || []).map((s) => [s.id, s.code as string]));

      // Create lookup maps
      const guestLookup = new Map((guestsData as CurrentDBGuest[]).map((g) => [g.id, g]));
      const roomLookup = new Map((roomsData as CurrentDBRoom[]).map((r) => [r.id, r]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const labelLookup = new Map((labelsData as any[]).map((l: any) => [l.id, l]));

      return (reservationsData as CurrentDBReservation[]).map((reservation) =>
        this.mapReservationFromCurrentDB(
          reservation,
          guestLookup,
          roomLookup,
          labelLookup,
          statusLookup,
          sourceLookup
        )
      );
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }
  }

  /**
   * Create reservation - adapt to current schema
   */
  async createReservation(
    reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>
  ): Promise<Reservation> {
    try {
      const { data: statusRow } = await supabase
        .from('reservation_statuses')
        .select('id')
        .eq('code', reservationData.status || 'confirmed')
        .single();
      const { data: sourceRow } = await supabase
        .from('booking_sources')
        .select('id')
        .eq('code', reservationData.bookingSource || 'direct')
        .single();

      const { data, error } = await supabase
        .from('reservations')
        .insert({
          guest_id: parseInt(reservationData.guestId),
          room_id: parseInt(reservationData.roomId),
          check_in_date: reservationData.checkIn.toISOString().split('T')[0],
          check_out_date: reservationData.checkOut.toISOString().split('T')[0],
          number_of_guests: reservationData.numberOfGuests,
          adults: reservationData.adults,
          children_count: reservationData.children?.length || 0,
          status_id: statusRow?.id,
          booking_source_id: sourceRow?.id,
          special_requests: reservationData.specialRequests || '',
          has_pets: reservationData.hasPets || false,
          parking_required: false,
          company_id: reservationData.companyId ? parseInt(reservationData.companyId) : null,
          pricing_tier_id: reservationData.pricingTierId
            ? parseInt(reservationData.pricingTierId)
            : null,
          is_r1: reservationData.isR1Bill || false,
          confirmation_number: this.generateConfirmationNumber(),
          label_id: reservationData.labelId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch complete reservation with related data
      const reservations = await this.getReservations();
      const newReservation = reservations.find((r) => r.id === data.id.toString());

      if (!newReservation) {
        throw new Error('Failed to fetch created reservation');
      }

      // Notification removed - now handled in ModernCreateBookingModal

      return newReservation;
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  }

  /**
   * Update reservation - adapt to current schema
   */
  async updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.checkIn) updateData.check_in_date = updates.checkIn.toISOString().split('T')[0];
      if (updates.checkOut)
        updateData.check_out_date = updates.checkOut.toISOString().split('T')[0];
      if (updates.roomId) updateData.room_id = parseInt(updates.roomId);
      if (updates.adults !== undefined) updateData.adults = updates.adults;
      if (updates.status) {
        const { data: statusRow } = await supabase
          .from('reservation_statuses')
          .select('id')
          .eq('code', updates.status)
          .single();
        if (statusRow) updateData.status_id = statusRow.id;
      }
      if (updates.specialRequests !== undefined)
        updateData.special_requests = updates.specialRequests;
      if (updates.labelId !== undefined) updateData.label_id = updates.labelId || null;
      if (updates.isR1Bill !== undefined) updateData.is_r1 = updates.isR1Bill;
      if (updates.companyId !== undefined)
        updateData.company_id = updates.companyId ? parseInt(updates.companyId) : null;
      if (updates.pricingTierId !== undefined)
        updateData.pricing_tier_id = updates.pricingTierId ? parseInt(updates.pricingTierId) : null;

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', parseInt(id));

      if (error) throw error;

      // Fetch updated reservation
      const reservations = await this.getReservations();
      const updatedReservation = reservations.find((r) => r.id === id);

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
   * Create guest - adapt to current schema
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
          nationality: guestData.nationality || null,
          preferred_language: guestData.preferredLanguage || 'en',
          has_pets: guestData.hasPets || false,
          date_of_birth: guestData.dateOfBirth?.toISOString().split('T')[0] || null,
          is_vip: false,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapGuestFromCurrentDB(data as CurrentDBGuest);
    } catch (error) {
      console.error('Error creating guest:', error);
      throw error;
    }
  }

  // Private mapping methods
  public mapRoomFromCurrentDB(room: CurrentDBRoom): Room {
    // Handle missing room_types gracefully (can happen with partial real-time updates)
    const roomType = room.room_types?.code || 'double';

    return {
      id: room.id.toString(),
      number: room.room_number,
      floor: room.floor_number,
      type: this.mapRoomTypeCode(roomType),
      nameCroatian: this.getRoomTypeCroatianName(roomType),
      nameEnglish: this.getRoomTypeEnglishName(roomType),
      seasonalRates: {
        A: room.room_pricing?.find((rp) => rp.pricing_seasons?.code === 'A')?.base_rate ?? 50,
        B: room.room_pricing?.find((rp) => rp.pricing_seasons?.code === 'B')?.base_rate ?? 60,
        C: room.room_pricing?.find((rp) => rp.pricing_seasons?.code === 'C')?.base_rate ?? 80,
        D: room.room_pricing?.find((rp) => rp.pricing_seasons?.code === 'D')?.base_rate ?? 100,
      },
      maxOccupancy: room.max_occupancy || 2,
      isPremium: room.is_premium || false,
      amenities: room.amenities || [],
      is_clean: room.is_clean ?? false,
    };
  }

  private mapGuestFromCurrentDB(guest: CurrentDBGuest): Guest {
    return {
      id: guest.id.toString(),
      firstName: guest.first_name || '',
      lastName: guest.last_name || '',
      fullName: guest.full_name || `${guest.first_name} ${guest.last_name}`,
      email: guest.email || '',
      phone: guest.phone || '',
      dateOfBirth: guest.date_of_birth ? new Date(guest.date_of_birth) : undefined,
      nationality: guest.nationality || '',
      passportNumber: guest.passport_number || undefined,
      idCardNumber: guest.id_card_number || undefined,
      preferredLanguage: guest.preferred_language || 'en',
      dietaryRestrictions: guest.dietary_restrictions || [],
      specialNeeds: guest.special_needs || undefined,
      hasPets: guest.has_pets || false,
      isVip: guest.is_vip || false,
      vipLevel: guest.vip_level || 0,
      children: [], // TODO: Load from guest_children table if needed
      totalStays: 0,
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
      createdAt: new Date(guest.created_at),
      updatedAt: new Date(guest.updated_at),
    };
  }

  private mapReservationFromCurrentDB(
    reservation: CurrentDBReservation,
    guestLookup: Map<number, CurrentDBGuest>,
    _roomLookup: Map<number, CurrentDBRoom>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    labelLookup?: Map<string, any>,
    statusLookup?: Map<number, string>,
    sourceLookup?: Map<number, string>
  ): Reservation {
    const guestData = guestLookup.get(reservation.guest_id);
    const labelData =
      labelLookup && reservation.label_id ? labelLookup.get(reservation.label_id) : undefined;

    return {
      id: reservation.id.toString(),
      roomId: reservation.room_id.toString(),
      guestId: reservation.guest_id.toString(),
      guest: guestData ? this.mapGuestFromCurrentDB(guestData) : undefined,
      checkIn: new Date(reservation.check_in_date),
      checkOut: new Date(reservation.check_out_date),
      numberOfGuests: reservation.number_of_guests,
      adults: reservation.adults,
      children: [], // TODO: Load children if needed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (statusLookup?.get(reservation.status_id) || 'confirmed') as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bookingSource: (sourceLookup?.get(reservation.booking_source_id) || 'direct') as any,
      specialRequests: reservation.special_requests || '',
      numberOfNights: reservation.number_of_nights || 1,
      hasPets: reservation.has_pets || false,
      isR1Bill: reservation.is_r1 || false,
      companyId: reservation.company_id?.toString(),
      pricingTierId: reservation.pricing_tier_id?.toString(),
      checkedInAt: reservation.checked_in_at ? new Date(reservation.checked_in_at) : undefined,
      checkedOutAt: reservation.checked_out_at ? new Date(reservation.checked_out_at) : undefined,
      bookingDate: new Date(reservation.booking_date || reservation.created_at),
      lastModified: new Date(reservation.last_modified || reservation.updated_at),
      notes: reservation.internal_notes || '',
      // Deprecated flat pricing stubs — all zeros until consumers migrate to ReservationCharge
      seasonalPeriod: 'A',
      baseRoomRate: 0,
      subtotal: 0,
      childrenDiscounts: 0,
      tourismTax: 0,
      vatAmount: 0,
      petFee: 0,
      parkingFee: 0,
      shortStaySuplement: 0,
      additionalCharges: 0,
      roomServiceItems: [],
      totalAmount: 0,
      // Label/Group mapping
      labelId: reservation.label_id || undefined,
      label: labelData
        ? {
            id: labelData.id,
            hotelId: labelData.hotel_id?.toString() || '',
            name: labelData.name,
            color: labelData.color || '#000000',
            bgColor: labelData.bg_color || '#FFFFFF',
            createdAt: new Date(labelData.created_at),
            updatedAt: new Date(labelData.updated_at),
          }
        : undefined,
    };
  }

  private mapRoomTypeCode(roomType: string): AppRoomType {
    const mapping: Record<string, AppRoomType> = {
      BD: 'big-double',
      BS: 'big-single',
      D: 'double',
      T: 'triple',
      S: 'single',
      F: 'family',
      A: 'apartment',
      RA: 'rooftop-apartment',
    };
    return mapping[roomType] || 'double';
  }

  private getRoomTypeCroatianName(roomType: string): string {
    const mapping: Record<string, string> = {
      BD: 'Velika dvokrevetna soba',
      BS: 'Velika jednokrevetna soba',
      D: 'Dvokrevetna soba',
      T: 'Trokrevetna soba',
      S: 'Jednokrevetna soba',
      F: 'Obiteljska soba',
      A: 'Apartman',
      RA: '401 ROOFTOP APARTMAN',
    };
    return mapping[roomType] || 'Dvokrevetna soba';
  }

  private getRoomTypeEnglishName(roomType: string): string {
    const mapping: Record<string, string> = {
      // Legacy single letter codes
      BD: 'Big Double Room',
      BS: 'Big Single Room',
      D: 'Double Room',
      T: 'Triple Room',
      S: 'Single Room',
      F: 'Family Room',
      A: 'Apartment',
      RA: '401 Rooftop Apartment',
      // Current database room types (lowercase)
      single: 'Single Room',
      double: 'Double Room',
      triple: 'Triple Room',
      family: 'Family Room',
      apartment: 'Apartment',
    };
    return mapping[roomType] || `${roomType.charAt(0).toUpperCase()}${roomType.slice(1)} Room`;
  }

  private generateConfirmationNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `HP${year}${month}${random}`;
  }

  // ============================================
  // ADVANCED FILTERING & PAGINATION METHODS
  // ============================================

  /**
   * Get reservations with advanced filtering, pagination, and sorting
   */
  async getReservationsWithFilters(
    options: {
      // Search
      searchQuery?: string;

      // Filters
      statuses?: string[];
      bookingSources?: string[];
      paymentStatuses?: string[];
      roomTypes?: string[];
      nationalities?: string[];
      vipOnly?: boolean;
      hasSpecialRequests?: boolean;

      // Date filters
      checkInFrom?: Date;
      checkInTo?: Date;
      checkOutFrom?: Date;
      checkOutTo?: Date;
      bookingDateFrom?: Date;
      bookingDateTo?: Date;

      // Pagination
      page?: number;
      pageSize?: number;

      // Sorting
      sortBy?: 'check_in_date' | 'check_out_date' | 'booking_date' | 'guest_name';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    reservations: Reservation[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        searchQuery,
        statuses,
        bookingSources,
        paymentStatuses,
        roomTypes,
        nationalities,
        vipOnly,
        hasSpecialRequests,
        checkInFrom,
        checkInTo,
        checkOutFrom,
        checkOutTo,
        bookingDateFrom,
        bookingDateTo,
        page = 1,
        pageSize = 25,
        sortBy = 'check_in_date',
        sortOrder = 'desc',
      } = options;

      // Build base query — join rooms with their type and pricing so we can build
      // the roomLookup from embedded data without an extra full-table fetch.
      let query = supabase
        .from('reservations')
        .select(
          '*, guests(*), rooms(*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern)))',
          { count: 'exact' }
        );

      // Apply filters
      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }

      if (bookingSources && bookingSources.length > 0) {
        query = query.in('booking_source', bookingSources);
      }

      if (paymentStatuses && paymentStatuses.length > 0) {
        // payment_status column removed — filter is no-op until Phase 6 consumer migration
        void paymentStatuses;
      }

      // Date range filters
      if (checkInFrom) {
        query = query.gte('check_in_date', checkInFrom.toISOString().split('T')[0]);
      }
      if (checkInTo) {
        query = query.lte('check_in_date', checkInTo.toISOString().split('T')[0]);
      }
      if (checkOutFrom) {
        query = query.gte('check_out_date', checkOutFrom.toISOString().split('T')[0]);
      }
      if (checkOutTo) {
        query = query.lte('check_out_date', checkOutTo.toISOString().split('T')[0]);
      }
      if (bookingDateFrom) {
        query = query.gte('booking_date', bookingDateFrom.toISOString());
      }
      if (bookingDateTo) {
        query = query.lte('booking_date', bookingDateTo.toISOString());
      }

      if (hasSpecialRequests) {
        query = query.not('special_requests', 'is', null);
        query = query.neq('special_requests', '');
      }

      // Push guest-level filters to SQL via foreign table filter syntax so they
      // run server-side before pagination, keeping page sizes and counts accurate.
      if (nationalities && nationalities.length > 0) {
        query = query.in('guests.nationality', nationalities);
      }

      if (vipOnly) {
        query = query.eq('guests.is_vip', true);
      }

      // Sorting
      const orderColumn = sortBy === 'guest_name' ? 'guests(last_name)' : sortBy;
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Execute query
      const { data: reservationsData, error: reservationsError, count } = await query;

      if (reservationsError) throw reservationsError;

      // Build lookup maps from the joined guest/room data already embedded in each
      // reservation row — no additional full-table queries needed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawRows = (reservationsData as any[]) || [];

      const guestLookup = new Map<number, CurrentDBGuest>(
        rawRows
          .filter((r) => r.guests)
          .map((r) => [r.guest_id as number, r.guests as CurrentDBGuest])
      );
      const roomLookup = new Map<number, CurrentDBRoom>(
        rawRows.filter((r) => r.rooms).map((r) => [r.room_id as number, r.rooms as CurrentDBRoom])
      );

      // Map reservations using the joined data
      let mappedReservations = rawRows.map(
        (reservation: CurrentDBReservation & Record<string, unknown>) => {
          return this.mapReservationFromCurrentDB(
            reservation as CurrentDBReservation,
            guestLookup,
            roomLookup
          );
        }
      );

      // Apply client-side filters that can't be done in SQL
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        mappedReservations = mappedReservations.filter((res) => {
          const guest = res.guest;
          const room = roomLookup.get(Number(res.roomId));

          return (
            guest?.firstName?.toLowerCase().includes(searchLower) ||
            guest?.lastName?.toLowerCase().includes(searchLower) ||
            guest?.fullName?.toLowerCase().includes(searchLower) ||
            res.id?.toString().includes(searchLower) ||
            room?.room_number?.toLowerCase().includes(searchLower)
          );
        });
      }

      if (roomTypes && roomTypes.length > 0) {
        mappedReservations = mappedReservations.filter((res) => {
          const room = roomLookup.get(Number(res.roomId));
          return room && roomTypes.includes(room.room_types?.code || 'double');
        });
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        reservations: mappedReservations,
        totalCount,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      console.error('Error fetching filtered reservations:', error);
      return {
        reservations: [],
        totalCount: 0,
        page: options.page || 1,
        pageSize: options.pageSize || 25,
        totalPages: 0,
      };
    }
  }

  /**
   * Get total count of reservations matching filters
   */
  async getReservationsCount(filters?: {
    statuses?: string[];
    bookingSources?: string[];
    paymentStatuses?: string[];
    checkInFrom?: Date;
    checkInTo?: Date;
  }): Promise<number> {
    try {
      let query = supabase.from('reservations').select('*', { count: 'exact', head: true });

      if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      if (filters?.bookingSources && filters.bookingSources.length > 0) {
        query = query.in('booking_source', filters.bookingSources);
      }

      if (filters?.paymentStatuses && filters.paymentStatuses.length > 0) {
        query = query.in('payment_status', filters.paymentStatuses);
      }

      if (filters?.checkInFrom) {
        query = query.gte('check_in_date', filters.checkInFrom.toISOString().split('T')[0]);
      }

      if (filters?.checkInTo) {
        query = query.lte('check_in_date', filters.checkInTo.toISOString().split('T')[0]);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error counting reservations:', error);
      return 0;
    }
  }
}

export const databaseAdapter = DatabaseAdapter.getInstance();
