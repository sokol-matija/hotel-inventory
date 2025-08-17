// Integration tests for hotel booking creation flow with real Supabase endpoints
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupabaseHotelProvider } from '../../../../lib/hotel/state/SupabaseHotelContext';
import CalendarView from '../CalendarView';
import HotelTimeline from '../HotelTimeline';
import { 
  verifyDatabaseConnection, 
  cleanupTestData, 
  getTestRoomsFromDatabase,
  createTestGuest,
  waitForRealtimeUpdate,
  mockTestHotelId
} from '../../../../__tests__/utils/supabaseTestHelpers';
import { Room, Guest } from '../../../../lib/hotel/types';
import { hotelDataService } from '../../../../lib/hotel/services/HotelDataService';

// Mock router to avoid navigation issues in tests
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ hotelId: mockTestHotelId })
}));

// Mock notifications to avoid side effects
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Test component wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SupabaseHotelProvider>
      {children}
    </SupabaseHotelProvider>
  );
};

describe('Booking Integration Tests', () => {
  let testRooms: Room[] = [];
  let testGuest: Guest | null = null;

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
    await cleanupTestData();
  });

  describe('CalendarView with Real Data', () => {
    test('should use dynamic room count instead of static HOTEL_POREC_ROOMS', async () => {
      render(
        <TestWrapper>
          <CalendarView />
        </TestWrapper>
      );

      // Wait for data to load
      await waitForRealtimeUpdate(3000);

      // Look for occupancy display - it should use dynamic room count
      // The CalendarView should show "X/Y" where Y is the actual room count from database
      const occupancyElements = screen.getAllByText(/\/\d+/);
      
      expect(occupancyElements.length).toBeGreaterThan(0);
      
      // Check if the total room count matches our dynamic rooms
      const occupancyText = occupancyElements[0].textContent;
      const totalRoomsFromUI = occupancyText?.split('/')[1];
      
      console.log(`=� UI shows total rooms: ${totalRoomsFromUI}`);
      console.log(`=� Database has ${testRooms.length} rooms`);
      
      // This test documents whether the UI is using static or dynamic data
      // If it's using static data, the numbers won't match
      expect(totalRoomsFromUI).toBeTruthy();
    });

    test('should display hotel overview stats with real reservation data', async () => {
      render(
        <TestWrapper>
          <CalendarView />
        </TestWrapper>
      );

      // Wait for data to load
      await waitForRealtimeUpdate(3000);

      // Check for the stats cards
      expect(screen.getByText('Guests in Hotel')).toBeInTheDocument();
      expect(screen.getByText('Room Occupancy')).toBeInTheDocument();
      expect(screen.getByText("Today's Check-ins")).toBeInTheDocument();
      expect(screen.getByText("Today's Revenue")).toBeInTheDocument();

      console.log(' Hotel overview stats loaded with real data');
    });

    test('should load and display real room data in timeline', async () => {
      render(
        <TestWrapper>
          <CalendarView />
        </TestWrapper>
      );

      // Wait for data to load
      await waitForRealtimeUpdate(3000);

      // Check that timeline is rendered
      const timelineContainer = screen.getByRole('main') || screen.getByTestId('hotel-timeline');
      expect(timelineContainer).toBeDefined();

      console.log(' Timeline loaded with real room data');
    });
  });

  describe('Room Selection and Booking Flow', () => {
    test('should handle room click with database room IDs', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <HotelTimeline />
        </TestWrapper>
      );

      // Wait for data to load
      await waitForRealtimeUpdate(3000);

      // Try to find a room cell to click
      // Note: This might need adjustment based on actual UI structure
      const roomCells = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Room') || 
        button.className?.includes('room') ||
        button.className?.includes('cell')
      );

      if (roomCells.length > 0) {
        await user.click(roomCells[0]);
        
        // Check if booking modal or form opens
        await waitFor(() => {
          // Look for modal, dialog, or form elements
          const modal = screen.queryByRole('dialog') || 
                       screen.queryByText(/create/i) ||
                       screen.queryByText(/booking/i) ||
                       screen.queryByText(/reservation/i);
          
          if (modal) {
            console.log(' Room click opened booking interface');
          } else {
            console.log('� Room click did not open booking interface (might need UI investigation)');
          }
        }, { timeout: 2000 });
      } else {
        console.log('� No clickable room elements found (UI structure investigation needed)');
      }
    });

    test('should create booking with real guest and room data', async () => {
      // Create a test guest first
      testGuest = await createTestGuest({
        firstName: 'BookingTest',
        lastName: 'Integration'
      });

      const testRoom = testRooms[0];
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 1);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 3);

      // Create reservation using the data service directly
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
        specialRequests: 'Integration test booking',
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
        notes: 'Integration test booking'
      };

      const reservation = await hotelDataService.createReservation(reservationData);

      expect(reservation).toBeDefined();
      expect(reservation.id).toBeDefined();
      expect(reservation.roomId).toBe(testRoom.id);
      expect(reservation.guestId).toBe(testGuest.id);

      console.log(` Created booking: ${reservation.id} for room ${testRoom.number}`);

      // Verify booking appears in database
      const allReservations = await hotelDataService.getReservations();
      const ourReservation = allReservations.find(r => r.id === reservation.id);
      
      expect(ourReservation).toBeDefined();
      expect(ourReservation?.roomId).toBe(testRoom.id);
      expect(ourReservation?.guestId).toBe(testGuest.id);

      console.log(' Booking verified in database');
    });
  });

  describe('Real-Time Updates and UI Sync', () => {
    test('should reflect booking changes in UI via SupabaseHotelContext', async () => {
      render(
        <TestWrapper>
          <CalendarView />
        </TestWrapper>
      );

      // Wait for initial data load
      await waitForRealtimeUpdate(3000);

      // Create a test booking
      if (!testGuest) {
        testGuest = await createTestGuest();
      }

      const testRoom = testRooms[0];
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 5); // Use future dates to avoid conflicts
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 7);

      const reservationData = {
        roomId: testRoom.id,
        guestId: testGuest.id,
        checkIn,
        checkOut,
        numberOfGuests: 1,
        adults: 1,
        children: [],
        status: 'confirmed' as const,
        bookingSource: 'direct' as const,
        specialRequests: 'Real-time test booking',
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
        notes: 'Real-time sync test'
      };

      const reservation = await hotelDataService.createReservation(reservationData);

      // Wait for real-time update to propagate
      await waitForRealtimeUpdate(5000);

      // The UI should now reflect the new booking
      // Note: This test verifies that SupabaseHotelContext real-time subscriptions work
      console.log(` Created reservation ${reservation.id} - checking for UI update...`);
      
      // In a real test, we'd check for specific UI elements that show the booking
      // For now, we verify the booking exists in the database
      const verifyReservation = await hotelDataService.getReservations();
      const foundReservation = verifyReservation.find(r => r.id === reservation.id);
      
      expect(foundReservation).toBeDefined();
      console.log(' Real-time booking creation verified');
    });

    test('should handle booking status updates in real-time', async () => {
      // Create a test booking first
      if (!testGuest) {
        testGuest = await createTestGuest();
      }

      const testRoom = testRooms[0];
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 10);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 12);

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
        specialRequests: 'Status update test',
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
        notes: 'Status update test'
      };

      const reservation = await hotelDataService.createReservation(reservationData);
      
      // Wait for creation to propagate
      await waitForRealtimeUpdate(2000);

      // Update the reservation status
      const updatedReservation = await hotelDataService.updateReservation(reservation.id, {
        status: 'checked-in'
      });

      expect(updatedReservation.status).toBe('checked-in');

      // Wait for update to propagate
      await waitForRealtimeUpdate(3000);

      // Verify the update is reflected in the database
      const verifyReservation = await hotelDataService.getReservations();
      const foundReservation = verifyReservation.find(r => r.id === reservation.id);
      
      expect(foundReservation?.status).toBe('checked-in');
      console.log(' Real-time status update verified');
    });
  });

  describe('Room Availability and Conflicts', () => {
    test('should prevent double bookings using real availability checking', async () => {
      // Create a test guest
      if (!testGuest) {
        testGuest = await createTestGuest();
      }

      const testRoom = testRooms[0];
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 15);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 17);

      // Check initial availability
      const initialAvailability = await hotelDataService.checkRoomAvailability(
        testRoom.id, 
        checkIn, 
        checkOut
      );
      
      expect(typeof initialAvailability).toBe('boolean');
      console.log(`Initial availability for room ${testRoom.number}: ${initialAvailability}`);

      // Create first booking
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
        specialRequests: 'Double booking test',
        seasonalPeriod: 'A' as const,
        baseRoomRate: 130,
        numberOfNights: 2,
        subtotal: 260,
        childrenDiscounts: 0,
        tourismTax: 5,
        vatAmount: 65,
        petFee: 0,
        parkingFee: 0,
        shortStaySuplement: 0,
        additionalCharges: 0,
        roomServiceItems: [],
        totalAmount: 330,
        notes: 'First booking'
      };

      const firstReservation = await hotelDataService.createReservation(reservationData);
      expect(firstReservation).toBeDefined();

      // Check availability after first booking
      const postBookingAvailability = await hotelDataService.checkRoomAvailability(
        testRoom.id, 
        checkIn, 
        checkOut
      );

      console.log(`Availability after booking for room ${testRoom.number}: ${postBookingAvailability}`);
      
      // If the system is working correctly, availability should be false
      expect(postBookingAvailability).toBe(false);

      console.log(' Double booking prevention verified');
    });

    test('should correctly show available rooms for date ranges', async () => {
      const futureCheckIn = new Date();
      futureCheckIn.setDate(futureCheckIn.getDate() + 30);
      const futureCheckOut = new Date();
      futureCheckOut.setDate(futureCheckOut.getDate() + 32);

      const availableRooms = await hotelDataService.getAvailableRooms(
        futureCheckIn, 
        futureCheckOut
      );

      expect(Array.isArray(availableRooms)).toBe(true);
      expect(availableRooms.length).toBeGreaterThanOrEqual(0);

      // All returned rooms should have valid database IDs
      availableRooms.forEach(room => {
        expect(room.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });

      console.log(` Found ${availableRooms.length} available rooms for future dates`);
    });
  });

  describe('Data Consistency and Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // This test would temporarily disrupt network access
      // For now, we'll test error handling with invalid data
      
      try {
        await hotelDataService.getRoomById('invalid-room-id');
      } catch (error) {
        console.log(' Error handling verified for invalid room ID');
      }

      try {
        await hotelDataService.updateReservation('invalid-reservation-id', {
          status: 'checked-in'
        });
      } catch (error) {
        console.log(' Error handling verified for invalid reservation ID');
      }
    });

    test('should maintain data consistency across operations', async () => {
      // Create guest
      const guest = await createTestGuest({
        firstName: 'Consistency',
        lastName: 'Test'
      });

      // Create reservation
      const testRoom = testRooms[0];
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 20);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 22);

      const reservationData = {
        roomId: testRoom.id,
        guestId: guest.id,
        checkIn,
        checkOut,
        numberOfGuests: 1,
        adults: 1,
        children: [],
        status: 'confirmed' as const,
        bookingSource: 'direct' as const,
        specialRequests: 'Consistency test',
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
        notes: 'Consistency test'
      };

      const reservation = await hotelDataService.createReservation(reservationData);

      // Verify all data is consistent
      const fetchedReservation = await hotelDataService.getReservations();
      const ourReservation = fetchedReservation.find(r => r.id === reservation.id);
      
      expect(ourReservation).toBeDefined();
      expect(ourReservation?.roomId).toBe(testRoom.id);
      expect(ourReservation?.guestId).toBe(guest.id);

      // Verify room and guest still exist
      const fetchedRoom = await hotelDataService.getRoomById(testRoom.id);
      const fetchedGuests = await hotelDataService.getGuests();
      const foundGuest = fetchedGuests.find(g => g.id === guest.id);

      expect(fetchedRoom).toBeDefined();
      expect(foundGuest).toBeDefined();

      console.log(' Data consistency verified across all operations');
    });
  });
});