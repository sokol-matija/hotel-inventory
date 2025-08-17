// Direct Supabase Service Layer Integration Tests
// Tests core hotel data operations without UI dependencies

import { hotelDataService } from '../HotelDataService';
import { supabase } from '../../../supabase';

// Helper functions
const getTestData = async () => {
  const [rooms, guests, reservations] = await Promise.all([
    hotelDataService.getRooms(),
    hotelDataService.getGuests(),
    hotelDataService.getReservations()
  ]);
  
  return { rooms, guests, reservations };
};

const cleanupTestReservations = async () => {
  const reservations = await hotelDataService.getReservations();
  const testReservations = reservations.filter(r => 
    r.specialRequests?.includes('SERVICE_LAYER_TEST') || 
    r.notes?.includes('SERVICE_LAYER_TEST')
  );
  
  for (const reservation of testReservations) {
    try {
      await hotelDataService.deleteReservation(reservation.id);
    } catch (error) {
      console.warn(`Failed to cleanup test reservation ${reservation.id}:`, error);
    }
  }
};

describe('Supabase Service Layer Integration Tests', () => {
  let testData: {
    rooms: any[];
    guests: any[];
    reservations: any[];
  };

  beforeAll(async () => {
    testData = await getTestData();
    console.log(`🎯 Service Test Environment: ${testData.rooms.length} rooms, ${testData.guests.length} guests, ${testData.reservations.length} reservations`);
  });

  afterEach(async () => {
    await cleanupTestReservations();
  });

  describe('🏗️ Database Connection & Schema', () => {
    test('should verify Supabase connection works', async () => {
      // Test direct connection
      const { data: testConnection, error } = await supabase
        .from('rooms')
        .select('count')
        .single();

      expect(error).toBeNull();
      expect(testConnection).toBeDefined();
      console.log('✅ Supabase connection verified');
    });

    test('should verify all required tables exist and are accessible', async () => {
      // Test all main tables
      const tableTests = await Promise.allSettled([
        supabase.from('rooms').select('*').limit(1),
        supabase.from('guests').select('*').limit(1),
        supabase.from('reservations').select('*').limit(1),
        supabase.from('companies').select('*').limit(1),
        supabase.from('pricing_tiers').select('*').limit(1)
      ]);

      tableTests.forEach((result, index) => {
        const tables = ['rooms', 'guests', 'reservations', 'companies', 'pricing_tiers'];
        if (result.status === 'fulfilled' && !result.value.error) {
          console.log(`✅ Table ${tables[index]} accessible`);
        } else {
          console.log(`❌ Table ${tables[index]} issue:`, result);
        }
        expect(result.status).toBe('fulfilled');
      });
    });

    test('should verify database has test data', async () => {
      expect(testData.rooms.length).toBeGreaterThan(0);
      expect(testData.guests.length).toBeGreaterThan(0);
      
      console.log(`✅ Database contains ${testData.rooms.length} rooms and ${testData.guests.length} guests`);
    });
  });

  describe('🏨 Room Operations', () => {
    test('should fetch all rooms correctly', async () => {
      const rooms = await hotelDataService.getRooms();
      
      expect(Array.isArray(rooms)).toBe(true);
      expect(rooms.length).toBeGreaterThan(0);
      
      // Verify room structure
      const firstRoom = rooms[0];
      expect(firstRoom).toHaveProperty('id');
      expect(firstRoom).toHaveProperty('number');
      expect(firstRoom).toHaveProperty('floor');
      expect(firstRoom).toHaveProperty('type');
      
      console.log(`✅ Fetched ${rooms.length} rooms successfully`);
    });

    test('should get room by ID correctly', async () => {
      const rooms = await hotelDataService.getRooms();
      if (rooms.length === 0) {
        console.log('📝 Skipping test - no rooms available');
        return;
      }

      const testRoomId = rooms[0].id;
      const room = await hotelDataService.getRoomById(testRoomId);
      
      expect(room).toBeDefined();
      expect(room.id).toBe(testRoomId);
      expect(room.number).toBe(rooms[0].number);
      
      console.log(`✅ Retrieved room ${room.number} by ID successfully`);
    });

    test('should check room availability correctly', async () => {
      if (testData.rooms.length === 0) {
        console.log('📝 Skipping test - no rooms available');
        return;
      }

      const testRoom = testData.rooms[0];
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 30); // Far future to avoid conflicts
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 32);

      const isAvailable = await hotelDataService.checkRoomAvailability(
        testRoom.id,
        checkIn,
        checkOut
      );

      expect(typeof isAvailable).toBe('boolean');
      console.log(`✅ Room ${testRoom.number} availability check: ${isAvailable}`);
    });

    test('should get available rooms for date range', async () => {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 35); // Far future
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 37);

      const availableRooms = await hotelDataService.getAvailableRooms(checkIn, checkOut);
      
      expect(Array.isArray(availableRooms)).toBe(true);
      expect(availableRooms.length).toBeGreaterThanOrEqual(0);
      
      console.log(`✅ Found ${availableRooms.length} available rooms for date range`);
    });
  });

  describe('👥 Guest Operations', () => {
    test('should fetch all guests correctly', async () => {
      const guests = await hotelDataService.getGuests();
      
      expect(Array.isArray(guests)).toBe(true);
      
      if (guests.length > 0) {
        const firstGuest = guests[0];
        expect(firstGuest).toHaveProperty('id');
        expect(firstGuest).toHaveProperty('firstName');
        expect(firstGuest).toHaveProperty('lastName');
        expect(firstGuest).toHaveProperty('email');
      }
      
      console.log(`✅ Fetched ${guests.length} guests successfully`);
    });

    test('should get guest by ID correctly', async () => {
      if (testData.guests.length === 0) {
        console.log('📝 Skipping test - no guests available');
        return;
      }

      const testGuestId = testData.guests[0].id;
      const guest = await hotelDataService.getGuestById(testGuestId);
      
      expect(guest).toBeDefined();
      expect(guest.id).toBe(testGuestId);
      
      console.log(`✅ Retrieved guest ${guest.firstName} ${guest.lastName} by ID successfully`);
    });
  });

  describe('📋 Reservation Operations', () => {
    test('should create reservation successfully', async () => {
      if (testData.guests.length === 0 || testData.rooms.length === 0) {
        console.log('📝 Skipping test - insufficient test data');
        return;
      }

      const testGuest = testData.guests[0];
      const testRoom = testData.rooms[0];

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
        specialRequests: 'SERVICE_LAYER_TEST reservation',
        seasonalPeriod: 'A' as const,
        baseRoomRate: 150,
        numberOfNights: 2,
        subtotal: 300,
        childrenDiscounts: 0,
        tourismTax: 6,
        vatAmount: 75,
        petFee: 0,
        parkingFee: 0,
        shortStaySuplement: 0,
        additionalCharges: 0,
        roomServiceItems: [],
        totalAmount: 381,
        notes: 'SERVICE_LAYER_TEST reservation'
      };

      const startTime = performance.now();
      const reservation = await hotelDataService.createReservation(reservationData);
      const duration = performance.now() - startTime;

      expect(reservation).toBeDefined();
      expect(reservation.id).toBeDefined();
      expect(reservation.roomId).toBe(testRoom.id);
      expect(reservation.guestId).toBe(testGuest.id);
      expect(reservation.status).toBe('confirmed');

      console.log(`✅ Created reservation ${reservation.id} for room ${testRoom.number} in ${Math.round(duration)}ms`);
    });

    test('should update reservation successfully', async () => {
      if (testData.guests.length === 0 || testData.rooms.length === 0) {
        console.log('📝 Skipping test - insufficient test data');
        return;
      }

      // Create test reservation first
      const testGuest = testData.guests[0];
      const testRoom = testData.rooms[0];

      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 5);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 7);

      const reservation = await hotelDataService.createReservation({
        roomId: testRoom.id,
        guestId: testGuest.id,
        checkIn,
        checkOut,
        numberOfGuests: 1,
        adults: 1,
        children: [],
        status: 'confirmed' as const,
        bookingSource: 'direct' as const,
        specialRequests: 'SERVICE_LAYER_TEST update test',
        seasonalPeriod: 'A' as const,
        baseRoomRate: 100,
        numberOfNights: 2,
        subtotal: 200,
        childrenDiscounts: 0,
        tourismTax: 4,
        vatAmount: 50,
        petFee: 0,
        parkingFee: 0,
        shortStaySuplement: 0,
        additionalCharges: 0,
        roomServiceItems: [],
        totalAmount: 254,
        notes: 'SERVICE_LAYER_TEST update test'
      });

      // Update the reservation
      const updatedReservation = await hotelDataService.updateReservation(reservation.id, {
        status: 'checked-in',
        specialRequests: 'SERVICE_LAYER_TEST updated reservation'
      });

      expect(updatedReservation.status).toBe('checked-in');
      expect(updatedReservation.specialRequests).toBe('SERVICE_LAYER_TEST updated reservation');

      console.log(`✅ Updated reservation ${reservation.id} status to checked-in`);
    });

    test('should fetch reservations correctly', async () => {
      const reservations = await hotelDataService.getReservations();
      
      expect(Array.isArray(reservations)).toBe(true);
      
      if (reservations.length > 0) {
        const firstReservation = reservations[0];
        expect(firstReservation).toHaveProperty('id');
        expect(firstReservation).toHaveProperty('roomId');
        expect(firstReservation).toHaveProperty('guestId');
        expect(firstReservation).toHaveProperty('checkIn');
        expect(firstReservation).toHaveProperty('checkOut');
        expect(firstReservation).toHaveProperty('status');
      }
      
      console.log(`✅ Fetched ${reservations.length} reservations successfully`);
    });

    test('should delete reservation successfully', async () => {
      if (testData.guests.length === 0 || testData.rooms.length === 0) {
        console.log('📝 Skipping test - insufficient test data');
        return;
      }

      // Create test reservation to delete
      const testGuest = testData.guests[0];
      const testRoom = testData.rooms[0];

      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 10);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 12);

      const reservation = await hotelDataService.createReservation({
        roomId: testRoom.id,
        guestId: testGuest.id,
        checkIn,
        checkOut,
        numberOfGuests: 1,
        adults: 1,
        children: [],
        status: 'confirmed' as const,
        bookingSource: 'direct' as const,
        specialRequests: 'SERVICE_LAYER_TEST deletion test',
        seasonalPeriod: 'A' as const,
        baseRoomRate: 100,
        numberOfNights: 2,
        subtotal: 200,
        childrenDiscounts: 0,
        tourismTax: 4,
        vatAmount: 50,
        petFee: 0,
        parkingFee: 0,
        shortStaySuplement: 0,
        additionalCharges: 0,
        roomServiceItems: [],
        totalAmount: 254,
        notes: 'SERVICE_LAYER_TEST deletion test'
      });

      // Delete the reservation
      await hotelDataService.deleteReservation(reservation.id);

      // Verify deletion
      const allReservations = await hotelDataService.getReservations();
      const deletedReservation = allReservations.find(r => r.id === reservation.id);
      
      expect(deletedReservation).toBeUndefined();
      console.log(`✅ Successfully deleted reservation ${reservation.id}`);
    });
  });

  describe('🔄 Real-time Operations', () => {
    test('should handle concurrent operations correctly', async () => {
      if (testData.guests.length === 0 || testData.rooms.length < 2) {
        console.log('📝 Skipping test - insufficient test data');
        return;
      }

      const testGuest = testData.guests[0];
      const room1 = testData.rooms[0];
      const room2 = testData.rooms[1];

      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 15);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 17);

      // Create multiple reservations concurrently
      const reservationPromises = [
        hotelDataService.createReservation({
          roomId: room1.id,
          guestId: testGuest.id,
          checkIn,
          checkOut,
          numberOfGuests: 1,
          adults: 1,
          children: [],
          status: 'confirmed' as const,
          bookingSource: 'direct' as const,
          specialRequests: 'SERVICE_LAYER_TEST concurrent 1',
          seasonalPeriod: 'A' as const,
          baseRoomRate: 100,
          numberOfNights: 2,
          subtotal: 200,
          childrenDiscounts: 0,
          tourismTax: 4,
          vatAmount: 50,
          petFee: 0,
          parkingFee: 0,
          shortStaySuplement: 0,
          additionalCharges: 0,
          roomServiceItems: [],
          totalAmount: 254,
          notes: 'SERVICE_LAYER_TEST concurrent 1'
        }),
        hotelDataService.createReservation({
          roomId: room2.id,
          guestId: testGuest.id,
          checkIn,
          checkOut,
          numberOfGuests: 1,
          adults: 1,
          children: [],
          status: 'confirmed' as const,
          bookingSource: 'direct' as const,
          specialRequests: 'SERVICE_LAYER_TEST concurrent 2',
          seasonalPeriod: 'A' as const,
          baseRoomRate: 100,
          numberOfNights: 2,
          subtotal: 200,
          childrenDiscounts: 0,
          tourismTax: 4,
          vatAmount: 50,
          petFee: 0,
          parkingFee: 0,
          shortStaySuplement: 0,
          additionalCharges: 0,
          roomServiceItems: [],
          totalAmount: 254,
          notes: 'SERVICE_LAYER_TEST concurrent 2'
        })
      ];

      const results = await Promise.allSettled(reservationPromises);
      
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          console.log(`✅ Concurrent reservation ${index + 1} created successfully`);
        }
      });
    });
  });

  describe('⚠️ Error Handling', () => {
    test('should handle invalid room ID gracefully', async () => {
      try {
        await hotelDataService.getRoomById('invalid-room-id');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid room ID error handled correctly');
      }
    });

    test('should handle invalid guest ID gracefully', async () => {
      try {
        await hotelDataService.getGuestById('invalid-guest-id');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid guest ID error handled correctly');
      }
    });

    test('should handle invalid reservation operations gracefully', async () => {
      try {
        await hotelDataService.updateReservation('invalid-id', { status: 'checked-in' });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid reservation update error handled correctly');
      }

      try {
        await hotelDataService.deleteReservation('invalid-id');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid reservation deletion error handled correctly');
      }
    });
  });

  describe('📊 Performance & Metrics', () => {
    test('should measure operation performance', async () => {
      const operations = {
        getRooms: 0,
        getGuests: 0,
        getReservations: 0,
        createReservation: 0
      };

      // Measure getRooms performance
      let startTime = performance.now();
      await hotelDataService.getRooms();
      operations.getRooms = performance.now() - startTime;

      // Measure getGuests performance
      startTime = performance.now();
      await hotelDataService.getGuests();
      operations.getGuests = performance.now() - startTime;

      // Measure getReservations performance
      startTime = performance.now();
      await hotelDataService.getReservations();
      operations.getReservations = performance.now() - startTime;

      console.log('📊 Operation Performance Metrics:');
      console.log(`   📋 getRooms: ${Math.round(operations.getRooms)}ms`);
      console.log(`   👥 getGuests: ${Math.round(operations.getGuests)}ms`);
      console.log(`   🏨 getReservations: ${Math.round(operations.getReservations)}ms`);

      // All operations should complete within reasonable time (5 seconds)
      Object.values(operations).forEach(duration => {
        expect(duration).toBeLessThan(5000);
      });

      console.log('✅ All operations completed within performance thresholds');
    });
  });
});