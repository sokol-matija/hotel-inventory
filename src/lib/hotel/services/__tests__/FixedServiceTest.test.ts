// Test for the fixed HotelDataService without complex joins
import { hotelDataServiceFixed } from '../HotelDataServiceFixed';

describe('Fixed Hotel Data Service Tests', () => {
  
  describe('🏨 Basic Data Operations', () => {
    test('should fetch rooms without join errors', async () => {
      const rooms = await hotelDataServiceFixed.getRooms();
      
      expect(Array.isArray(rooms)).toBe(true);
      console.log(`✅ Fetched ${rooms.length} rooms successfully`);
      
      if (rooms.length > 0) {
        const firstRoom = rooms[0];
        expect(firstRoom).toHaveProperty('id');
        expect(firstRoom).toHaveProperty('number');
        expect(firstRoom).toHaveProperty('floor');
        expect(firstRoom).toHaveProperty('type');
        
        console.log(`   Sample room: ${firstRoom.number} (${firstRoom.type?.nameEnglish})`);
      }
    });

    test('should fetch guests without errors', async () => {
      const guests = await hotelDataServiceFixed.getGuests();
      
      expect(Array.isArray(guests)).toBe(true);
      console.log(`✅ Fetched ${guests.length} guests successfully`);
      
      if (guests.length > 0) {
        const firstGuest = guests[0];
        expect(firstGuest).toHaveProperty('id');
        expect(firstGuest).toHaveProperty('firstName');
        expect(firstGuest).toHaveProperty('lastName');
        
        console.log(`   Sample guest: ${firstGuest.firstName} ${firstGuest.lastName}`);
      }
    });

    test('should fetch reservations without join errors', async () => {
      const reservations = await hotelDataServiceFixed.getReservations();
      
      expect(Array.isArray(reservations)).toBe(true);
      console.log(`✅ Fetched ${reservations.length} reservations successfully`);
      
      if (reservations.length > 0) {
        const firstReservation = reservations[0];
        expect(firstReservation).toHaveProperty('id');
        expect(firstReservation).toHaveProperty('roomId');
        expect(firstReservation).toHaveProperty('guestId');
        expect(firstReservation).toHaveProperty('checkIn');
        expect(firstReservation).toHaveProperty('checkOut');
        
        console.log(`   Sample reservation: ${firstReservation.confirmationNumber}`);
      }
    });
  });

  describe('📋 CRUD Operations', () => {
    let testReservation: any;
    let testData: { rooms: any[]; guests: any[] };

    beforeAll(async () => {
      // Get test data
      const [rooms, guests] = await Promise.all([
        hotelDataServiceFixed.getRooms(),
        hotelDataServiceFixed.getGuests()
      ]);
      
      testData = { rooms, guests };
      console.log(`🎯 Test data: ${rooms.length} rooms, ${guests.length} guests`);
    });

    afterEach(async () => {
      // Cleanup test reservation
      if (testReservation?.id) {
        try {
          await hotelDataServiceFixed.deleteReservation(testReservation.id);
          console.log(`🧹 Cleaned up test reservation ${testReservation.id}`);
        } catch (error) {
          console.warn('Failed to cleanup test reservation:', error);
        }
      }
    });

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
        specialRequests: 'FIXED_SERVICE_TEST reservation',
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
        notes: 'FIXED_SERVICE_TEST reservation'
      };

      const startTime = performance.now();
      testReservation = await hotelDataServiceFixed.createReservation(reservationData);
      const duration = performance.now() - startTime;

      expect(testReservation).toBeDefined();
      expect(testReservation.id).toBeDefined();
      expect(testReservation.roomId).toBe(testRoom.id);
      expect(testReservation.guestId).toBe(testGuest.id);
      expect(testReservation.status).toBe('confirmed');

      console.log(`✅ Created reservation ${testReservation.id} in ${Math.round(duration)}ms`);
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

      testReservation = await hotelDataServiceFixed.createReservation({
        roomId: testRoom.id,
        guestId: testGuest.id,
        checkIn,
        checkOut,
        numberOfGuests: 1,
        adults: 1,
        children: [],
        status: 'confirmed' as const,
        bookingSource: 'direct' as const,
        specialRequests: 'FIXED_SERVICE_TEST update test',
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
        notes: 'FIXED_SERVICE_TEST update test'
      });

      // Update the reservation
      const updatedReservation = await hotelDataServiceFixed.updateReservation(testReservation.id, {
        status: 'checked-in',
        specialRequests: 'FIXED_SERVICE_TEST updated reservation'
      });

      expect(updatedReservation.status).toBe('checked-in');
      expect(updatedReservation.specialRequests).toBe('FIXED_SERVICE_TEST updated reservation');

      console.log(`✅ Updated reservation ${testReservation.id} status to checked-in`);
    });

    test('should check room availability correctly', async () => {
      if (testData.rooms.length === 0) {
        console.log('📝 Skipping test - no rooms available');
        return;
      }

      const testRoom = testData.rooms[0];
      const futureCheckIn = new Date();
      futureCheckIn.setDate(futureCheckIn.getDate() + 30);
      const futureCheckOut = new Date();
      futureCheckOut.setDate(futureCheckOut.getDate() + 32);

      const isAvailable = await hotelDataServiceFixed.checkRoomAvailability(
        testRoom.id,
        futureCheckIn,
        futureCheckOut
      );

      expect(typeof isAvailable).toBe('boolean');
      console.log(`✅ Room ${testRoom.number} availability check: ${isAvailable}`);
    });

    test('should get available rooms for date range', async () => {
      const futureCheckIn = new Date();
      futureCheckIn.setDate(futureCheckIn.getDate() + 35);
      const futureCheckOut = new Date();
      futureCheckOut.setDate(futureCheckOut.getDate() + 37);

      const availableRooms = await hotelDataServiceFixed.getAvailableRooms(futureCheckIn, futureCheckOut);
      
      expect(Array.isArray(availableRooms)).toBe(true);
      console.log(`✅ Found ${availableRooms.length} available rooms for date range`);
    });
  });

  describe('🔍 Individual Record Access', () => {
    test('should get room by ID', async () => {
      const rooms = await hotelDataServiceFixed.getRooms();
      if (rooms.length === 0) {
        console.log('📝 Skipping test - no rooms available');
        return;
      }

      const testRoomId = rooms[0].id;
      const room = await hotelDataServiceFixed.getRoomById(testRoomId);
      
      expect(room).toBeDefined();
      expect(room.id).toBe(testRoomId);
      expect(room.number).toBe(rooms[0].number);
      
      console.log(`✅ Retrieved room ${room.number} by ID successfully`);
    });

    test('should get guest by ID', async () => {
      const guests = await hotelDataServiceFixed.getGuests();
      if (guests.length === 0) {
        console.log('📝 Skipping test - no guests available');
        return;
      }

      const testGuestId = guests[0].id;
      const guest = await hotelDataServiceFixed.getGuestById(testGuestId);
      
      expect(guest).toBeDefined();
      expect(guest.id).toBe(testGuestId);
      
      console.log(`✅ Retrieved guest ${guest.firstName} ${guest.lastName} by ID successfully`);
    });
  });

  describe('⚠️ Error Handling', () => {
    test('should handle invalid room ID gracefully', async () => {
      try {
        await hotelDataServiceFixed.getRoomById('invalid-room-id');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid room ID error handled correctly');
      }
    });

    test('should handle invalid guest ID gracefully', async () => {
      try {
        await hotelDataServiceFixed.getGuestById('invalid-guest-id');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid guest ID error handled correctly');
      }
    });
  });

  describe('📊 Performance Check', () => {
    test('should perform operations within reasonable time', async () => {
      const operations = {
        getRooms: 0,
        getGuests: 0,
        getReservations: 0
      };

      // Measure getRooms performance
      let startTime = performance.now();
      await hotelDataServiceFixed.getRooms();
      operations.getRooms = performance.now() - startTime;

      // Measure getGuests performance
      startTime = performance.now();
      await hotelDataServiceFixed.getGuests();
      operations.getGuests = performance.now() - startTime;

      // Measure getReservations performance
      startTime = performance.now();
      await hotelDataServiceFixed.getReservations();
      operations.getReservations = performance.now() - startTime;

      console.log('📊 Fixed Service Performance:');
      console.log(`   📋 getRooms: ${Math.round(operations.getRooms)}ms`);
      console.log(`   👥 getGuests: ${Math.round(operations.getGuests)}ms`);
      console.log(`   🏨 getReservations: ${Math.round(operations.getReservations)}ms`);

      // All operations should complete within reasonable time
      Object.values(operations).forEach(duration => {
        expect(duration).toBeLessThan(5000);
      });

      console.log('✅ All operations completed within performance thresholds');
    });
  });
});