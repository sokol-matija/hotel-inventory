// Integration test to verify HotelTimelineService works with dynamic room data
// This test ensures all static HOTEL_POREC_ROOMS dependencies have been removed

import { HotelTimelineService } from '../HotelTimelineService';
import { Room, Reservation, ReservationStatus } from '../../types';

describe('HotelTimelineService Dynamic Data Integration', () => {
  let timelineService: HotelTimelineService;
  let mockRooms: Room[];
  let mockReservations: Reservation[];

  beforeEach(() => {
    timelineService = HotelTimelineService.getInstance();
    
    // Create mock rooms in database format
    mockRooms = [
      {
        id: 'room-001',
        number: '101',
        floor: 1,
        type: 'double',
        nameCroatian: 'Dvokrevetna soba',
        nameEnglish: 'Double Room',
        seasonalRates: { A: 50, B: 60, C: 80, D: 100 },
        maxOccupancy: 2,
        isPremium: false,
        amenities: ['wifi', 'tv']
      },
      {
        id: 'room-002',
        number: '102',
        floor: 1,
        type: 'single',
        nameCroatian: 'Jednokrevetna soba',
        nameEnglish: 'Single Room',
        seasonalRates: { A: 40, B: 50, C: 70, D: 90 },
        maxOccupancy: 1,
        isPremium: false,
        amenities: ['wifi']
      },
      {
        id: 'room-201',
        number: '201',
        floor: 2,
        type: 'triple',
        nameCroatian: 'Trokrevetna soba',
        nameEnglish: 'Triple Room',
        seasonalRates: { A: 70, B: 80, C: 100, D: 120 },
        maxOccupancy: 3,
        isPremium: true,
        amenities: ['wifi', 'tv', 'minibar']
      }
    ];

    // Create mock reservations
    mockReservations = [
      {
        id: 'res-001',
        roomId: 'room-001',
        guestId: 'guest-001',
        checkIn: new Date('2024-08-16'),
        checkOut: new Date('2024-08-18'),
        numberOfGuests: 2,
        adults: 2,
        children: [],
        status: 'confirmed' as ReservationStatus,
        bookingSource: 'direct',
        specialRequests: 'Late check-in',
        seasonalPeriod: 'B',
        baseRoomRate: 60,
        numberOfNights: 2,
        subtotal: 120,
        childrenDiscounts: 0,
        tourismTax: 4,
        vatAmount: 24,
        petFee: 0,
        parkingFee: 0,
        shortStaySuplement: 0,
        additionalCharges: 0,
        roomServiceItems: [],
        totalAmount: 148,
        bookingDate: new Date('2024-08-15'),
        lastModified: new Date('2024-08-15'),
        notes: ''
      }
    ];
  });

  describe('getRoomsByFloor', () => {
    test('should group rooms by floor using dynamic data', () => {
      const roomsByFloor = timelineService.getRoomsByFloor(mockRooms);
      
      expect(roomsByFloor).toBeDefined();
      expect(roomsByFloor[1]).toHaveLength(2); // Floor 1 has 2 rooms
      expect(roomsByFloor[2]).toHaveLength(1); // Floor 2 has 1 room
      expect(roomsByFloor[1]).toContain(mockRooms[0]); // Room 101
      expect(roomsByFloor[1]).toContain(mockRooms[1]); // Room 102
      expect(roomsByFloor[2]).toContain(mockRooms[2]); // Room 201
    });

    test('should handle empty rooms array', () => {
      const roomsByFloor = timelineService.getRoomsByFloor([]);
      
      expect(roomsByFloor).toEqual({});
    });
  });

  describe('generateCalendarEvents', () => {
    test('should generate events using dynamic room data', () => {
      const startDate = new Date('2024-08-15');
      const events = timelineService.generateCalendarEvents(mockReservations, startDate, mockRooms);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        reservationId: 'res-001',
        roomId: 'room-001',
        resource: {
          roomNumber: '101', // Should find room from dynamic data
          status: 'confirmed'
        }
      });
    });

    test('should handle missing room gracefully', () => {
      const startDate = new Date('2024-08-15');
      const eventsWithMissingRoom = timelineService.generateCalendarEvents(
        mockReservations,
        startDate,
        [] // Empty rooms array
      );
      
      expect(eventsWithMissingRoom).toHaveLength(1);
      expect(eventsWithMissingRoom[0].resource.roomNumber).toBe('Unknown Room');
    });
  });

  describe('calculateOccupancyData', () => {
    test('should calculate occupancy using dynamic room data', () => {
      const date = new Date('2024-08-16');
      const occupancy = timelineService.calculateOccupancyData(mockReservations, date, mockRooms);
      
      expect(occupancy).toBeDefined();
      expect(occupancy['room-001']).toMatchObject({
        status: 'confirmed',
        reservation: mockReservations[0]
      });
      expect(occupancy['room-002']).toMatchObject({
        status: 'available'
      });
      expect(occupancy['room-201']).toMatchObject({
        status: 'available'
      });
    });

    test('should handle empty rooms array', () => {
      const date = new Date('2024-08-16');
      const occupancy = timelineService.calculateOccupancyData(mockReservations, date, []);
      
      // With empty rooms array, no rooms are initialized but reservations are still processed
      // This means the occupancy object will have entries for reservations but no "available" rooms
      expect(occupancy['room-001']).toBeDefined();
      expect(occupancy['room-001'].status).toBe('confirmed');
      expect(occupancy['room-002']).toBeUndefined(); // This room wasn't in the empty array so not initialized
    });
  });

  describe('validateReservationMove', () => {
    test('should validate room move using dynamic room data', () => {
      const result = timelineService.validateReservationMove(
        mockReservations[0],
        'room-002',
        mockReservations,
        mockRooms
      );
      
      expect(result.valid).toBe(true);
    });

    test('should reject move to non-existent room', () => {
      const result = timelineService.validateReservationMove(
        mockReservations[0],
        'non-existent-room',
        mockReservations,
        mockRooms
      );
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target room not found');
    });

    test('should work with empty rooms array', () => {
      const result = timelineService.validateReservationMove(
        mockReservations[0],
        'room-002',
        mockReservations,
        [] // Empty rooms
      );
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target room not found');
    });
  });

  describe('getTimelineStats', () => {
    test('should calculate stats using dynamic room data', () => {
      const startDate = new Date('2024-08-15');
      const stats = timelineService.getTimelineStats(mockReservations, startDate, mockRooms);
      
      expect(stats).toMatchObject({
        totalReservations: 1,
        occupiedRooms: 1,
        availableRooms: 2, // 3 total rooms - 1 occupied = 2 available
        checkInsToday: 0,
        checkOutsToday: 0
      });
    });

    test('should handle empty rooms array', () => {
      const startDate = new Date('2024-08-15');
      const stats = timelineService.getTimelineStats(mockReservations, startDate, []);
      
      expect(stats).toMatchObject({
        totalReservations: 1,
        occupiedRooms: 1,
        availableRooms: -1, // 0 total rooms - 1 occupied = -1 (edge case)
        checkInsToday: 0,
        checkOutsToday: 0
      });
    });
  });

  describe('No Static Dependencies', () => {
    test('service should work without any static room data imports', () => {
      // This test verifies that the service doesn't rely on any hardcoded room data
      // and can work with any dynamic room array passed to it
      
      const customRooms: Room[] = [
        {
          id: 'custom-room-1',
          number: '999',
          floor: 9,
          type: 'family',
          nameCroatian: 'Obiteljska soba',
          nameEnglish: 'Family Room',
          seasonalRates: { A: 100, B: 120, C: 150, D: 200 },
          maxOccupancy: 4,
          isPremium: true,
          amenities: ['wifi', 'tv', 'minibar', 'balcony']
        }
      ];

      // All methods should work with custom room data
      const roomsByFloor = timelineService.getRoomsByFloor(customRooms);
      expect(roomsByFloor[9]).toHaveLength(1);

      const occupancy = timelineService.calculateOccupancyData([], new Date(), customRooms);
      expect(occupancy['custom-room-1']).toMatchObject({ status: 'available' });

      const stats = timelineService.getTimelineStats([], new Date(), customRooms);
      expect(stats.availableRooms).toBe(1);

      // Service should be flexible with any room data structure
      expect(() => {
        timelineService.getRoomsByFloor(customRooms);
        timelineService.calculateOccupancyData([], new Date(), customRooms);
        timelineService.getTimelineStats([], new Date(), customRooms);
      }).not.toThrow();
    });
  });
});