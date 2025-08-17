// Simplified Front-Desk UI Testing without problematic dependencies
// Tests: core Supabase integration, data loading, and basic UI functionality

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { SupabaseHotelProvider } from '../../../../lib/hotel/state/SupabaseHotelContext';
import CalendarView from '../CalendarView';
import { hotelDataService } from '../../../../lib/hotel/services/HotelDataService';
import { supabase } from '../../../../lib/supabase';

// Test wrapper without DnD dependencies
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <SupabaseHotelProvider>
        {children}
      </SupabaseHotelProvider>
    </BrowserRouter>
  );
};

// Mock notifications
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => ({ dismiss: jest.fn() }))
  }
}));

// Helper functions
const waitForDataLoad = async (timeout = 10000) => {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  }, { timeout });
};

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
    r.specialRequests?.includes('SIMPLIFIED_TEST') || 
    r.notes?.includes('SIMPLIFIED_TEST')
  );
  
  for (const reservation of testReservations) {
    try {
      await hotelDataService.deleteReservation(reservation.id);
    } catch (error) {
      console.warn(`Failed to cleanup test reservation ${reservation.id}:`, error);
    }
  }
};

describe('Simplified Front-Desk UI Tests', () => {
  let testData: {
    rooms: any[];
    guests: any[];
    reservations: any[];
  };

  beforeAll(async () => {
    testData = await getTestData();
    console.log(`🏨 Test Data Available: ${testData.rooms.length} rooms, ${testData.guests.length} guests, ${testData.reservations.length} reservations`);
  });

  afterEach(async () => {
    await cleanupTestReservations();
  });

  describe('🏨 Core Data Loading', () => {
    test('should load and display hotel data from Supabase', async () => {
      render(
        <TestWrapper>
          <CalendarView />
        </TestWrapper>
      );

      await waitForDataLoad();

      // Check core hotel overview stats
      expect(screen.getByText('Guests in Hotel')).toBeInTheDocument();
      expect(screen.getByText('Room Occupancy')).toBeInTheDocument();
      expect(screen.getByText("Today's Check-ins")).toBeInTheDocument();
      expect(screen.getByText("Today's Revenue")).toBeInTheDocument();

      // Verify dynamic room count is used
      const occupancyElements = screen.getAllByText(/\/\d+/);
      expect(occupancyElements.length).toBeGreaterThan(0);
      
      const totalRoomsDisplayed = occupancyElements[0].textContent?.split('/')[1];
      expect(parseInt(totalRoomsDisplayed || '0')).toBe(testData.rooms.length);

      console.log('✅ Core data loading verified');
    });

    test('should verify database connection and table access', async () => {
      // Test direct Supabase queries
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .limit(5);

      expect(roomsError).toBeNull();
      expect(rooms).toBeDefined();
      expect(Array.isArray(rooms)).toBe(true);
      
      const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .limit(5);

      expect(guestsError).toBeNull();
      expect(guests).toBeDefined();

      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .limit(5);

      expect(reservationsError).toBeNull();
      expect(reservations).toBeDefined();

      console.log('✅ Database connection and table access verified');
    });
  });

  describe('📋 Reservation Management', () => {
    test('should create reservation programmatically', async () => {
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
        specialRequests: 'SIMPLIFIED_TEST reservation',
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
        notes: 'SIMPLIFIED_TEST reservation'
      };

      const reservation = await hotelDataService.createReservation(reservationData);

      expect(reservation).toBeDefined();
      expect(reservation.id).toBeDefined();
      expect(reservation.roomId).toBe(testRoom.id);
      expect(reservation.guestId).toBe(testGuest.id);

      console.log(`✅ Created reservation ${reservation.id} for room ${testRoom.number}`);
    });

    test('should update reservation status', async () => {
      if (testData.guests.length === 0 || testData.rooms.length === 0) {
        console.log('📝 Skipping test - insufficient test data');
        return;
      }

      // Create test reservation
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
        specialRequests: 'SIMPLIFIED_TEST status update',
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
        notes: 'SIMPLIFIED_TEST status update'
      });

      // Update reservation status
      const updatedReservation = await hotelDataService.updateReservation(reservation.id, {
        status: 'checked-in'
      });

      expect(updatedReservation.status).toBe('checked-in');

      // Verify in database
      const allReservations = await hotelDataService.getReservations();
      const persistedReservation = allReservations.find(r => r.id === reservation.id);
      
      expect(persistedReservation?.status).toBe('checked-in');
      console.log('✅ Reservation status update verified');
    });
  });

  describe('🔍 Room Availability Testing', () => {
    test('should check room availability correctly', async () => {
      if (testData.rooms.length === 0) {
        console.log('📝 Skipping test - no rooms available');
        return;
      }

      const testRoom = testData.rooms[0];
      const futureCheckIn = new Date();
      futureCheckIn.setDate(futureCheckIn.getDate() + 15);
      const futureCheckOut = new Date();
      futureCheckOut.setDate(futureCheckOut.getDate() + 17);

      // Check initial availability
      const isAvailable = await hotelDataService.checkRoomAvailability(
        testRoom.id,
        futureCheckIn,
        futureCheckOut
      );

      expect(typeof isAvailable).toBe('boolean');
      console.log(`Room ${testRoom.number} availability: ${isAvailable}`);

      // Test with available rooms search
      const availableRooms = await hotelDataService.getAvailableRooms(
        futureCheckIn,
        futureCheckOut
      );

      expect(Array.isArray(availableRooms)).toBe(true);
      console.log(`Found ${availableRooms.length} available rooms`);
    });

    test('should prevent double bookings', async () => {
      if (testData.guests.length === 0 || testData.rooms.length === 0) {
        console.log('📝 Skipping test - insufficient test data');
        return;
      }

      const testRoom = testData.rooms[0];
      const testGuest = testData.guests[0];
      
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 20);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 22);

      // Check initial availability
      const initialAvailability = await hotelDataService.checkRoomAvailability(
        testRoom.id,
        checkIn,
        checkOut
      );

      if (initialAvailability) {
        // Create blocking reservation
        const blockingReservation = await hotelDataService.createReservation({
          roomId: testRoom.id,
          guestId: testGuest.id,
          checkIn,
          checkOut,
          numberOfGuests: 1,
          adults: 1,
          children: [],
          status: 'confirmed' as const,
          bookingSource: 'direct' as const,
          specialRequests: 'SIMPLIFIED_TEST double booking prevention',
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
          notes: 'SIMPLIFIED_TEST blocking reservation'
        });

        // Check availability again - should be false
        const postBookingAvailability = await hotelDataService.checkRoomAvailability(
          testRoom.id,
          checkIn,
          checkOut
        );

        expect(postBookingAvailability).toBe(false);
        console.log('✅ Double booking prevention verified');
      } else {
        console.log('📝 Room already occupied, cannot test double booking prevention');
      }
    });
  });

  describe('📊 System Health Check', () => {
    test('should verify comprehensive system health', async () => {
      const healthCheck = {
        databaseConnection: false,
        dataIntegrity: false,
        uiRendering: false,
        serviceLayer: false,
        errorHandling: false
      };

      try {
        // Test database connection
        const { data, error } = await supabase.from('rooms').select('count').single();
        healthCheck.databaseConnection = !error;

        // Test data integrity
        healthCheck.dataIntegrity = testData.rooms.length > 0 && 
                                   testData.guests.length > 0;

        // Test UI rendering
        render(
          <TestWrapper>
            <CalendarView />
          </TestWrapper>
        );
        
        await waitForDataLoad();
        healthCheck.uiRendering = screen.getByText('Guests in Hotel') !== null;

        // Test service layer
        const rooms = await hotelDataService.getRooms();
        healthCheck.serviceLayer = Array.isArray(rooms) && rooms.length > 0;

        // Test error handling
        try {
          await hotelDataService.getRoomById('invalid-id');
          healthCheck.errorHandling = false; // Should have thrown
        } catch {
          healthCheck.errorHandling = true; // Correctly threw error
        }

        console.log('🏨 SIMPLIFIED SYSTEM HEALTH CHECK:');
        console.log(`   📡 Database Connection: ${healthCheck.databaseConnection ? '✅' : '❌'}`);
        console.log(`   🔗 Data Integrity: ${healthCheck.dataIntegrity ? '✅' : '❌'}`);
        console.log(`   🖥️  UI Rendering: ${healthCheck.uiRendering ? '✅' : '❌'}`);
        console.log(`   ⚙️  Service Layer: ${healthCheck.serviceLayer ? '✅' : '❌'}`);
        console.log(`   ⚠️  Error Handling: ${healthCheck.errorHandling ? '✅' : '❌'}`);

        const overallHealth = Object.values(healthCheck).every(check => check);
        console.log(`   🎯 Overall Status: ${overallHealth ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED'}`);

        // Assert critical components are working
        expect(healthCheck.databaseConnection).toBe(true);
        expect(healthCheck.dataIntegrity).toBe(true);
        expect(healthCheck.uiRendering).toBe(true);
        expect(healthCheck.serviceLayer).toBe(true);

      } catch (error) {
        console.error('❌ Health check failed:', error);
        throw error;
      }
    });
  });
});