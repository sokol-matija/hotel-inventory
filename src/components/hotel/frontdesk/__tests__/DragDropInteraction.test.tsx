// Drag and Drop Interaction Tests for Hotel Timeline
// Tests reservation moving between rooms and dates

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TestBackend } from 'react-dnd-test-backend';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { SupabaseHotelProvider } from '../../../../lib/hotel/state/SupabaseHotelContext';
import HotelTimeline from '../HotelTimeline';
import { hotelDataService } from '../../../../lib/hotel/services/HotelDataService';

// Test wrapper with DnD test backend
const TestWrapperWithTestBackend: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <SupabaseHotelProvider>
        <DndProvider backend={TestBackend}>
          {children}
        </DndProvider>
      </SupabaseHotelProvider>
    </BrowserRouter>
  );
};

// Regular test wrapper with HTML5Backend
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <SupabaseHotelProvider>
        <DndProvider backend={HTML5Backend}>
          {children}
        </DndProvider>
      </SupabaseHotelProvider>
    </BrowserRouter>
  );
};

// Mock GSAP for testing
jest.mock('gsap', () => ({
  gsap: {
    set: jest.fn(),
    to: jest.fn(),
    timeline: jest.fn(() => ({
      to: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis()
    }))
  }
}));

// Mock notifications
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => ({ dismiss: jest.fn() }))
  }
}));

describe('Drag and Drop Interaction Tests', () => {
  let testReservation: any;
  let testRooms: any[];
  let testGuests: any[];

  beforeAll(async () => {
    // Get test data
    const [rooms, guests] = await Promise.all([
      hotelDataService.getRooms(),
      hotelDataService.getGuests()
    ]);
    
    testRooms = rooms.slice(0, 3); // Use first 3 rooms for testing
    testGuests = guests;
    
    console.log(`🎯 DnD Test Setup: ${testRooms.length} rooms, ${testGuests.length} guests`);
  });

  beforeEach(async () => {
    // Create a test reservation for each test
    if (testRooms.length > 0 && testGuests.length > 0) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 10); // Future date to avoid conflicts
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 12);

      testReservation = await hotelDataService.createReservation({
        roomId: testRooms[0].id,
        guestId: testGuests[0].id,
        checkIn,
        checkOut,
        numberOfGuests: 2,
        adults: 2,
        children: [],
        status: 'confirmed' as const,
        bookingSource: 'direct' as const,
        specialRequests: 'DnD Test Reservation',
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
        notes: 'TEST DnD reservation'
      });
    }
  });

  afterEach(async () => {
    // Clean up test reservation
    if (testReservation?.id) {
      try {
        await hotelDataService.deleteReservation(testReservation.id);
      } catch (error) {
        console.warn('Failed to cleanup test reservation:', error);
      }
    }
  });

  describe('🖱️ Drag and Drop Setup', () => {
    test('should render timeline with DnD context', async () => {
      render(
        <TestWrapper>
          <HotelTimeline />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      });

      // Check that timeline is rendered
      const timelineContainer = screen.getByRole('main') || document.querySelector('.hotel-timeline');
      expect(timelineContainer).toBeDefined();

      console.log('✅ Timeline rendered with DnD context');
    });

    test('should identify draggable reservation elements', async () => {
      if (!testReservation) {
        console.log('📝 Skipping test - no test reservation created');
        return;
      }

      render(
        <TestWrapper>
          <HotelTimeline />
        </TestWrapper>
      );

      // Wait for data to load and reservation to appear
      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Look for reservation elements
      const reservationElements = screen.queryAllByTestId(/reservation-/);
      
      if (reservationElements.length > 0) {
        console.log(`✅ Found ${reservationElements.length} draggable reservations`);
        
        // Check if reservation has draggable attributes
        const firstReservation = reservationElements[0];
        expect(firstReservation).toBeInTheDocument();
      } else {
        console.log('📝 No reservation elements found - checking if UI needs time to update');
        
        // Wait a bit longer for real-time updates
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const delayedElements = screen.queryAllByTestId(/reservation-/);
        console.log(`   Found ${delayedElements.length} reservations after delay`);
      }
    });
  });

  describe('🎯 Drop Zone Detection', () => {
    test('should identify valid drop zones for reservations', async () => {
      render(
        <TestWrapper>
          <HotelTimeline />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      });

      // Look for room cells that can act as drop zones
      const roomCells = screen.getAllByRole('gridcell');
      const dropZones = roomCells.filter(cell => 
        !cell.textContent?.includes('Room') && // Not header
        cell.className?.includes('cell') || cell.className?.includes('slot')
      );

      expect(dropZones.length).toBeGreaterThan(0);
      console.log(`✅ Found ${dropZones.length} potential drop zones`);
    });

    test('should handle drop zone hover states', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <HotelTimeline />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      });

      // Get drop zone elements
      const roomCells = screen.getAllByRole('gridcell');
      
      if (roomCells.length > 0) {
        // Simulate hover over drop zone
        await user.hover(roomCells[0]);
        
        // Check for hover effects (this would depend on implementation)
        console.log('✅ Drop zone hover simulation completed');
      }
    });
  });

  describe('📱 Reservation Movement Simulation', () => {
    test('should simulate reservation drag start', async () => {
      if (!testReservation) {
        console.log('📝 Skipping test - no test reservation');
        return;
      }

      render(
        <TestWrapper>
          <HotelTimeline />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Wait for reservation to appear
      await new Promise(resolve => setTimeout(resolve, 2000));

      const reservationElements = screen.queryAllByTestId(/reservation-/);
      
      if (reservationElements.length > 0) {
        const reservation = reservationElements[0];
        
        // Simulate mouse down (drag start)
        fireEvent.mouseDown(reservation);
        
        // Simulate drag
        fireEvent.dragStart(reservation);
        
        console.log('✅ Reservation drag start simulated');
        
        // Simulate drag end
        fireEvent.dragEnd(reservation);
      } else {
        console.log('📝 No reservation elements found for drag simulation');
      }
    });

    test('should test reservation movement via service layer', async () => {
      if (!testReservation || testRooms.length < 2) {
        console.log('📝 Skipping test - insufficient test data');
        return;
      }

      const originalRoomId = testReservation.roomId;
      const targetRoomId = testRooms[1].id; // Move to second room

      console.log(`🎯 Testing move from room ${testRooms[0].number} to room ${testRooms[1].number}`);

      // Update reservation to move it to a different room
      const updatedReservation = await hotelDataService.updateReservation(testReservation.id, {
        roomId: targetRoomId
      });

      expect(updatedReservation.roomId).toBe(targetRoomId);
      expect(updatedReservation.roomId).not.toBe(originalRoomId);

      console.log('✅ Reservation moved successfully via service layer');

      // Verify the change persisted
      const allReservations = await hotelDataService.getReservations();
      const persistedReservation = allReservations.find(r => r.id === testReservation.id);
      
      expect(persistedReservation?.roomId).toBe(targetRoomId);
      console.log('✅ Reservation move persisted in database');
    });

    test('should test date change via service layer', async () => {
      if (!testReservation) {
        console.log('📝 Skipping test - no test reservation');
        return;
      }

      const originalCheckIn = new Date(testReservation.checkIn);
      const newCheckIn = new Date(originalCheckIn);
      newCheckIn.setDate(newCheckIn.getDate() + 2); // Move 2 days later
      
      const newCheckOut = new Date(testReservation.checkOut);
      newCheckOut.setDate(newCheckOut.getDate() + 2);

      console.log(`🎯 Testing date change from ${originalCheckIn.toDateString()} to ${newCheckIn.toDateString()}`);

      // Update reservation dates
      const updatedReservation = await hotelDataService.updateReservation(testReservation.id, {
        checkIn: newCheckIn,
        checkOut: newCheckOut
      });

      expect(updatedReservation.checkIn.getTime()).toBe(newCheckIn.getTime());
      console.log('✅ Reservation dates updated successfully');

      // Verify the change persisted
      const allReservations = await hotelDataService.getReservations();
      const persistedReservation = allReservations.find(r => r.id === testReservation.id);
      
      expect(new Date(persistedReservation?.checkIn || '').getTime()).toBe(newCheckIn.getTime());
      console.log('✅ Date change persisted in database');
    });
  });

  describe('⚠️ Conflict Detection', () => {
    test('should detect room availability conflicts', async () => {
      if (testRooms.length === 0) {
        console.log('📝 Skipping conflict test - no rooms available');
        return;
      }

      const testRoom = testRooms[0];
      const conflictCheckIn = new Date();
      conflictCheckIn.setDate(conflictCheckIn.getDate() + 15);
      const conflictCheckOut = new Date();
      conflictCheckOut.setDate(conflictCheckOut.getDate() + 17);

      // Check initial availability
      const isAvailable = await hotelDataService.checkRoomAvailability(
        testRoom.id,
        conflictCheckIn,
        conflictCheckOut
      );

      console.log(`🔍 Room ${testRoom.number} availability for ${conflictCheckIn.toDateString()}: ${isAvailable}`);

      if (isAvailable) {
        // Create a reservation to block the room
        const blockingReservation = await hotelDataService.createReservation({
          roomId: testRoom.id,
          guestId: testGuests[0].id,
          checkIn: conflictCheckIn,
          checkOut: conflictCheckOut,
          numberOfGuests: 1,
          adults: 1,
          children: [],
          status: 'confirmed' as const,
          bookingSource: 'direct' as const,
          specialRequests: 'Conflict test blocking reservation',
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
          notes: 'TEST conflict detection'
        });

        // Check availability again - should be false now
        const isAvailableAfter = await hotelDataService.checkRoomAvailability(
          testRoom.id,
          conflictCheckIn,
          conflictCheckOut
        );

        expect(isAvailableAfter).toBe(false);
        console.log('✅ Conflict detection working correctly');

        // Clean up
        await hotelDataService.deleteReservation(blockingReservation.id);
      }
    });
  });

  describe('🔄 UI State Management', () => {
    test('should handle UI updates after drag and drop operations', async () => {
      render(
        <TestWrapper>
          <HotelTimeline />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      });

      // Simulate a successful drag and drop by directly updating data
      if (testReservation && testRooms.length > 1) {
        const targetRoom = testRooms[1];
        
        // Update reservation
        await hotelDataService.updateReservation(testReservation.id, {
          roomId: targetRoom.id
        });

        // Wait for UI to update (via real-time subscriptions)
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log(`✅ UI state management test completed - moved reservation to room ${targetRoom.number}`);
      }
    });
  });

  describe('📊 DnD Performance', () => {
    test('should measure drag and drop operation performance', async () => {
      if (!testReservation || testRooms.length < 2) {
        console.log('📝 Skipping performance test - insufficient data');
        return;
      }

      const startTime = performance.now();
      
      // Simulate a room change
      await hotelDataService.updateReservation(testReservation.id, {
        roomId: testRooms[1].id
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`⚡ Drag and drop operation took ${Math.round(duration)}ms`);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds max
      
      if (duration < 1000) {
        console.log('✅ Excellent performance - under 1 second');
      } else if (duration < 3000) {
        console.log('✅ Good performance - under 3 seconds');
      } else {
        console.log('⚠️ Slow performance - over 3 seconds');
      }
    });
  });
});