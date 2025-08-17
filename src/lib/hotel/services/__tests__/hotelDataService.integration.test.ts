// Integration tests for HotelDataService with real Supabase endpoints
import { hotelDataService } from '../HotelDataService';
import { 
  verifyDatabaseConnection, 
  cleanupTestData, 
  getTestRoomsFromDatabase,
  createTestGuest,
  createTestReservation,
  mockTestHotelId
} from '../../../../__tests__/utils/supabaseTestHelpers';
import { Room, Guest, Reservation } from '../../types';

describe('HotelDataService Integration Tests', () => {
  let testRooms: Room[] = [];
  let testGuest: Guest | null = null;
  let testReservation: Reservation | null = null;

  beforeAll(async () => {
    // Verify database connection
    const isConnected = await verifyDatabaseConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to Supabase database. Tests aborted.');
    }
    
    // Get rooms from database for testing
    testRooms = await getTestRoomsFromDatabase();
    if (testRooms.length === 0) {
      throw new Error('No rooms found in database. Tests aborted.');
    }
    
    console.log(` Found ${testRooms.length} test rooms in database`);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up any test data created during tests
    if (testReservation) {
      try {
        await hotelDataService.deleteReservation(testReservation.id);
      } catch (error) {
        console.warn('Failed to cleanup test reservation:', error);
      }
      testReservation = null;
    }
  });

  describe('Room Management', () => {
    test('should fetch rooms from Supabase successfully', async () => {
      const rooms = await hotelDataService.getRooms();
      
      expect(rooms).toBeDefined();
      expect(Array.isArray(rooms)).toBe(true);
      expect(rooms.length).toBeGreaterThan(0);
      
      // Verify room structure
      const firstRoom = rooms[0];
      expect(firstRoom).toHaveProperty('id');
      expect(firstRoom).toHaveProperty('number');
      expect(firstRoom).toHaveProperty('floor');
      expect(firstRoom).toHaveProperty('type');
      expect(firstRoom).toHaveProperty('maxOccupancy');
      expect(firstRoom).toHaveProperty('seasonalRates');
      
      console.log(` Fetched ${rooms.length} rooms from database`);
      console.log(`=� Sample room:`, {
        id: firstRoom.id,
        number: firstRoom.number,
        type: firstRoom.type,
        floor: firstRoom.floor
      });
    });

    test('should get room by ID', async () => {
      const rooms = await hotelDataService.getRooms();
      const firstRoom = rooms[0];
      
      const room = await hotelDataService.getRoomById(firstRoom.id);
      
      expect(room).toBeDefined();
      expect(room?.id).toBe(firstRoom.id);
      expect(room?.number).toBe(firstRoom.number);
      
      console.log(` Retrieved room by ID: ${room?.number}`);
    });

    test('should get rooms by floor', async () => {
      const rooms = await hotelDataService.getRooms();
      const targetFloor = rooms[0].floor;
      
      const floorRooms = await hotelDataService.getRoomsByFloor(targetFloor);
      
      expect(floorRooms).toBeDefined();
      expect(Array.isArray(floorRooms)).toBe(true);
      expect(floorRooms.length).toBeGreaterThan(0);
      
      // All rooms should be on the same floor
      floorRooms.forEach(room => {
        expect(room.floor).toBe(targetFloor);
      });
      
      console.log(` Retrieved ${floorRooms.length} rooms from floor ${targetFloor}`);
    });
  });

  describe('Guest Management', () => {
    test('should create guest in Supabase', async () => {
      const guestData = {
        firstName: `Test_${Date.now()}`,
        lastName: 'IntegrationTest',
        email: `integration.test.${Date.now()}@example.com`,
        phone: '+385 91 999 8888',
        nationality: 'HR',
        preferredLanguage: 'en' as const,
        dietaryRestrictions: [],
        hasPets: false,
        vipLevel: 0,
        children: [],
        emergencyContactName: '',
        emergencyContactPhone: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      testGuest = await hotelDataService.createGuest(guestData);
      
      expect(testGuest).toBeDefined();
      expect(testGuest.id).toBeDefined();
      expect(testGuest.firstName).toBe(guestData.firstName);
      expect(testGuest.lastName).toBe(guestData.lastName);
      expect(testGuest.email).toBe(guestData.email);
      expect(testGuest.totalStays).toBe(0);
      
      console.log(` Created guest: ${testGuest.fullName} (ID: ${testGuest.id})`);
    });

    test('should fetch guests from Supabase', async () => {
      const guests = await hotelDataService.getGuests();
      
      expect(guests).toBeDefined();
      expect(Array.isArray(guests)).toBe(true);
      
      // Verify guest structure if guests exist
      if (guests.length > 0) {
        const firstGuest = guests[0];
        expect(firstGuest).toHaveProperty('id');
        expect(firstGuest).toHaveProperty('firstName');
        expect(firstGuest).toHaveProperty('lastName');
        expect(firstGuest).toHaveProperty('fullName');
        expect(firstGuest).toHaveProperty('totalStays');
      }
      
      console.log(` Fetched ${guests.length} guests from database`);
    });

    test('should find guests by lastname', async () => {
      // Create a test guest first
      if (!testGuest) {
        testGuest = await createTestGuest({ 
          firstName: 'FindTest',
          lastName: 'SearchableGuest'
        });
      }
      
      const foundGuests = await hotelDataService.findGuestByLastname('SearchableGuest');
      
      expect(foundGuests).toBeDefined();
      expect(Array.isArray(foundGuests)).toBe(true);
      expect(foundGuests.length).toBeGreaterThan(0);
      
      const testGuestFound = foundGuests.find(g => g.id === testGuest?.id);
      expect(testGuestFound).toBeDefined();
      
      console.log(` Found ${foundGuests.length} guests with lastname containing "SearchableGuest"`);
    });

    test('should update guest information', async () => {
      // Create a test guest first
      if (!testGuest) {
        testGuest = await createTestGuest();
      }
      
      const updatedData = {
        email: `updated.${Date.now()}@example.com`,
        phone: '+385 91 777 6666',
        nationality: 'DE'
      };
      
      const updatedGuest = await hotelDataService.updateGuest(testGuest.id, updatedData);
      
      expect(updatedGuest).toBeDefined();
      expect(updatedGuest.email).toBe(updatedData.email);
      expect(updatedGuest.phone).toBe(updatedData.phone);
      expect(updatedGuest.nationality).toBe(updatedData.nationality);
      
      console.log(` Updated guest: ${updatedGuest.fullName}`);
    });
  });

  describe('Reservation Management', () => {
    test('should create reservation in Supabase', async () => {
      // Create test guest if not exists
      if (!testGuest) {
        testGuest = await createTestGuest();
      }
      
      const testRoom = testRooms[0];
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 1);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 3);
      
      const reservationData = {
        roomId: testRoom.id,
        guestId: testGuest.id,
        checkIn,
        checkOut,
        numberOfGuests: 2,
        adults: 2,
        children: [],
        status: 'confirmed' as const,
        bookingSource: 'direct' as const,
        specialRequests: 'Integration test reservation',
        seasonalPeriod: 'A' as const,
        baseRoomRate: 120,
        numberOfNights: 2,
        subtotal: 240,
        childrenDiscounts: 0,
        tourismTax: 5,
        vatAmount: 60,
        petFee: 0,
        parkingFee: 0,
        shortStaySuplement: 0,
        additionalCharges: 0,
        roomServiceItems: [],
        totalAmount: 305,
        notes: 'Test reservation'
      };
      
      testReservation = await hotelDataService.createReservation(reservationData);
      
      expect(testReservation).toBeDefined();
      expect(testReservation.id).toBeDefined();
      expect(testReservation.roomId).toBe(testRoom.id);
      expect(testReservation.guestId).toBe(testGuest.id);
      expect(testReservation.status).toBe('confirmed');
      expect(testReservation.totalAmount).toBe(305);
      
      console.log(` Created reservation: ${testReservation.id} for room ${testRoom.number}`);
    });

    test('should fetch reservations from Supabase', async () => {
      const reservations = await hotelDataService.getReservations();
      
      expect(reservations).toBeDefined();
      expect(Array.isArray(reservations)).toBe(true);
      
      // Verify reservation structure if reservations exist
      if (reservations.length > 0) {
        const firstReservation = reservations[0];
        expect(firstReservation).toHaveProperty('id');
        expect(firstReservation).toHaveProperty('roomId');
        expect(firstReservation).toHaveProperty('guestId');
        expect(firstReservation).toHaveProperty('checkIn');
        expect(firstReservation).toHaveProperty('checkOut');
        expect(firstReservation).toHaveProperty('status');
        expect(firstReservation).toHaveProperty('totalAmount');
      }
      
      console.log(` Fetched ${reservations.length} reservations from database`);
    });

    test('should check room availability', async () => {
      const testRoom = testRooms[0];
      
      // Check availability for future dates
      const futureCheckIn = new Date();
      futureCheckIn.setDate(futureCheckIn.getDate() + 30);
      const futureCheckOut = new Date();
      futureCheckOut.setDate(futureCheckOut.getDate() + 32);
      
      const isAvailable = await hotelDataService.checkRoomAvailability(
        testRoom.id, 
        futureCheckIn, 
        futureCheckOut
      );
      
      expect(typeof isAvailable).toBe('boolean');
      
      console.log(` Room ${testRoom.number} availability for future dates: ${isAvailable}`);
    });

    test('should get available rooms for date range', async () => {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 60); // Far future to avoid conflicts
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 62);
      
      const availableRooms = await hotelDataService.getAvailableRooms(checkIn, checkOut);
      
      expect(availableRooms).toBeDefined();
      expect(Array.isArray(availableRooms)).toBe(true);
      
      console.log(` Found ${availableRooms.length} available rooms for date range`);
    });

    test('should update reservation', async () => {
      // Create test reservation if not exists
      if (!testReservation) {
        if (!testGuest) {
          testGuest = await createTestGuest();
        }
        testReservation = await createTestReservation(testRooms[0].id, testGuest.id);
      }
      
      const updates = {
        specialRequests: 'Updated special requests',
        status: 'checked-in' as const
      };
      
      const updatedReservation = await hotelDataService.updateReservation(
        testReservation.id, 
        updates
      );
      
      expect(updatedReservation).toBeDefined();
      expect(updatedReservation.specialRequests).toBe(updates.specialRequests);
      expect(updatedReservation.status).toBe(updates.status);
      
      console.log(` Updated reservation status to: ${updatedReservation.status}`);
    });
  });

  describe('Data Consistency Tests', () => {
    test('should maintain referential integrity between rooms, guests, and reservations', async () => {
      // Create test guest
      if (!testGuest) {
        testGuest = await createTestGuest();
      }
      
      // Create test reservation
      const testRoom = testRooms[0];
      testReservation = await createTestReservation(testRoom.id, testGuest.id);
      
      // Verify the reservation references valid room and guest
      const reservations = await hotelDataService.getReservations();
      const ourReservation = reservations.find(r => r.id === testReservation.id);
      
      expect(ourReservation).toBeDefined();
      expect(ourReservation?.roomId).toBe(testRoom.id);
      expect(ourReservation?.guestId).toBe(testGuest.id);
      
      // Verify room exists
      const room = await hotelDataService.getRoomById(testRoom.id);
      expect(room).toBeDefined();
      expect(room?.id).toBe(testRoom.id);
      
      console.log(' Referential integrity verified between rooms, guests, and reservations');
    });

    test('should handle room ID mapping correctly', async () => {
      const rooms = await hotelDataService.getRooms();
      
      // Verify all rooms have valid UUIDs as IDs (not static room IDs)
      rooms.forEach(room => {
        expect(room.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(room.number).toBeDefined();
        expect(typeof room.number).toBe('string');
      });
      
      console.log(' All room IDs are valid UUIDs from database');
    });

    test('should compare static vs dynamic room data', async () => {
      const dynamicRooms = await hotelDataService.getRooms();
      
      // Import static room data
      const { HOTEL_POREC_ROOMS } = await import('../../hotelData');
      
      console.log(`=� Room Data Comparison:`);
      console.log(`Static rooms count: ${HOTEL_POREC_ROOMS.length}`);
      console.log(`Dynamic rooms count: ${dynamicRooms.length}`);
      
      // Check if room numbers match between static and dynamic
      const staticRoomNumbers = HOTEL_POREC_ROOMS.map(r => r.number).sort();
      const dynamicRoomNumbers = dynamicRooms.map(r => r.number).sort();
      
      console.log(`Static room numbers: ${staticRoomNumbers.join(', ')}`);
      console.log(`Dynamic room numbers: ${dynamicRoomNumbers.join(', ')}`);
      
      // This test documents the difference - don't fail if they don't match
      const roomNumbersMatch = JSON.stringify(staticRoomNumbers) === JSON.stringify(dynamicRoomNumbers);
      console.log(`Room numbers match: ${roomNumbersMatch}`);
      
      // Check ID format differences
      const staticRoomId = HOTEL_POREC_ROOMS[0]?.id;
      const dynamicRoomId = dynamicRooms[0]?.id;
      
      console.log(`Static room ID format: ${staticRoomId}`);
      console.log(`Dynamic room ID format: ${dynamicRoomId}`);
      
      console.log(' Room data comparison completed');
    });
  });
});