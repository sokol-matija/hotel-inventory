// Test utilities for Supabase integration tests
import { supabase, Database } from '../../lib/supabase';
import { Room, Guest, Reservation } from '../../lib/hotel/types';

// Test database configuration
export const mockTestHotelId = 1; // Hotel Porec ID (integer for database)

// Database cleanup utilities
export const cleanupTestData = async () => {
  console.log('>� Cleaning up test data...');
  
  try {
    // Delete reservations first (due to foreign key constraints)
    await supabase
      .from('reservations')
      .delete()
      .eq('hotel_id', mockTestHotelId)
      .like('confirmation_number', 'TEST_%');
    
    // Delete test guests
    await supabase
      .from('guests')
      .delete()
      .like('first_name', 'Test_%');
    
    console.log(' Test data cleanup completed');
  } catch (error) {
    console.error('L Test data cleanup failed:', error);
    throw error;
  }
};

// Helper to verify database connection
export const verifyDatabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('id, name')
      .eq('id', mockTestHotelId)
      .single();
    
    if (error) {
      console.error('L Database connection failed:', error);
      return false;
    }
    
    console.log(' Database connection verified:', data?.name);
    return true;
  } catch (error) {
    console.error('L Database connection error:', error);
    return false;
  }
};

// Helper to get actual room data from database
export const getTestRoomsFromDatabase = async (): Promise<Room[]> => {
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
      .eq('hotel_id', mockTestHotelId)
      .eq('is_active', true)
      .order('number')
      .limit(5); // Get first 5 rooms for testing
    
    if (error) throw error;
    
    return data?.map(room => mapRoomFromDB(room)) || [];
  } catch (error) {
    console.error('L Failed to get test rooms:', error);
    return [];
  }
};

// Helper to create test guest
export const createTestGuest = async (overrides: Partial<Guest> = {}): Promise<Guest> => {
  const testGuestData = {
    first_name: `Test_${Date.now()}`,
    last_name: 'Guest',
    email: `test.guest.${Date.now()}@example.com`,
    phone: '+385 91 123 4567',
    nationality: 'HR',
    preferred_language: 'en',
    has_pets: false,
    is_vip: false,
    total_stays: 0,
    ...overrides
  };
  
  try {
    const { data, error } = await supabase
      .from('guests')
      .insert(testGuestData)
      .select()
      .single();
    
    if (error) throw error;
    
    return mapGuestFromDB(data);
  } catch (error) {
    console.error('L Failed to create test guest:', error);
    throw error;
  }
};

// Helper to create test reservation
export const createTestReservation = async (
  roomId: string,
  guestId: string,
  overrides: Partial<Database['public']['Tables']['reservations']['Insert']> = {}
): Promise<Reservation> => {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 1); // Tomorrow
  const checkOut = new Date();
  checkOut.setDate(checkOut.getDate() + 3); // Day after tomorrow
  
  const testReservationData = {
    hotel_id: mockTestHotelId,
    room_id: roomId,
    primary_guest_id: guestId,
    confirmation_number: `TEST_${Date.now()}`,
    check_in: checkIn.toISOString().split('T')[0],
    check_out: checkOut.toISOString().split('T')[0],
    adults: 2,
    children: 0,
    total_guests: 2,
    booking_source: 'direct',
    status: 'confirmed',
    seasonal_period: 'A',
    base_room_rate: 100,
    number_of_nights: 2,
    subtotal_accommodation: 200,
    vat_accommodation: 50,
    total_amount: 250,
    total_vat_amount: 50,
    payment_status: 'pending',
    ...overrides
  };
  
  try {
    const { data, error } = await supabase
      .from('reservations')
      .insert(testReservationData)
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
      .single();
    
    if (error) throw error;
    
    return mapReservationFromDB(data);
  } catch (error) {
    console.error('L Failed to create test reservation:', error);
    throw error;
  }
};

// Helper to wait for real-time updates
export const waitForRealtimeUpdate = (timeout = 2000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

// Mapping functions (copied from HotelDataService for consistency)
const mapRoomFromDB = (roomRow: any): Room => {
  const roomType = roomRow.room_type;
  
  return {
    id: roomRow.id,
    number: roomRow.number,
    floor: roomRow.floor,
    type: mapRoomTypeCode(roomType?.code || 'unknown'),
    nameCroatian: roomType?.name_croatian || '',
    nameEnglish: roomType?.name_english || '',
    seasonalRates: {
      A: 50,
      B: 60,
      C: 80,
      D: 100
    },
    maxOccupancy: roomRow.max_occupancy_override || roomType?.max_occupancy || 2,
    isPremium: roomRow.is_premium || false,
    amenities: roomType?.amenities || []
  };
};

const mapGuestFromDB = (guestRow: any): Guest => {
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
    children: [],
    totalStays: guestRow.total_stays || 0,
    emergencyContactName: guestRow.emergency_contact_name || '',
    emergencyContactPhone: guestRow.emergency_contact_phone || '',
    createdAt: guestRow.created_at ? new Date(guestRow.created_at) : new Date(),
    updatedAt: guestRow.updated_at ? new Date(guestRow.updated_at) : new Date()
  };
};

const mapReservationFromDB = (reservationRow: any): Reservation => {
  return {
    id: reservationRow.id,
    roomId: reservationRow.room_id,
    guestId: reservationRow.primary_guest_id,
    checkIn: new Date(reservationRow.check_in),
    checkOut: new Date(reservationRow.check_out),
    numberOfGuests: reservationRow.total_guests || (reservationRow.adults + (reservationRow.children || 0)),
    adults: reservationRow.adults,
    children: [],
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
    roomServiceItems: [],
    totalAmount: reservationRow.total_amount,
    bookingDate: new Date(reservationRow.booking_date || reservationRow.created_at),
    lastModified: new Date(reservationRow.updated_at || reservationRow.created_at),
    notes: reservationRow.notes || ''
  };
};

const mapRoomTypeCode = (code: string): any => {
  const mapping: Record<string, any> = {
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
};