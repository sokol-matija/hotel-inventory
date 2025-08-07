import { 
  reservationToCalendarEvent,
  reservationsToCalendarEvents,
  isRoomAvailable,
  getRoomOccupancyForDate,
  formatRoomNumber,
  getRoomTypeDisplay,
  RESERVATION_STATUS_COLORS
} from '../calendarUtils';
import { Reservation, CalendarEvent } from '../types';

describe('Calendar Utils', () => {
  const mockReservation: Reservation = {
    id: 'res-1',
    roomId: 'room-101',
    guestId: 'guest-1',
    checkIn: new Date('2025-02-01'),
    checkOut: new Date('2025-02-03'),
    numberOfGuests: 2,
    adults: 2,
    children: [],
    status: 'confirmed',
    bookingSource: 'direct',
    specialRequests: 'Late check-in',
    seasonalPeriod: 'A',
    baseRoomRate: 70,
    numberOfNights: 2,
    subtotal: 140,
    childrenDiscounts: 0,
    tourismTax: 4.40,
    vatAmount: 35,
    petFee: 0,
    parkingFee: 0,
    shortStaySuplement: 0,
    additionalCharges: 0,
    roomServiceItems: [],
    totalAmount: 179.40,
    bookingDate: new Date('2025-01-15'),
    lastModified: new Date('2025-01-15'),
    notes: ''
  };

  describe('reservationToCalendarEvent', () => {
    it('converts reservation to calendar event format', () => {
      const event = reservationToCalendarEvent(mockReservation);
      
      expect(event.id).toBe('event-res-1');
      expect(event.reservationId).toBe('res-1');
      expect(event.roomId).toBe('room-101');
      expect(event.start).toEqual(new Date('2025-02-01'));
      expect(event.end).toEqual(new Date('2025-02-03'));
      expect(event.resource.status).toBe('confirmed');
      expect(event.resource.numberOfGuests).toBe(2);
    });

    it('handles room closure reservations with maintenance title', () => {
      const maintenanceReservation = {
        ...mockReservation,
        status: 'room-closure' as const,
        guestId: 'system-maintenance'
      };
      
      const event = reservationToCalendarEvent(maintenanceReservation);
      expect(event.title).toBe('🔧 Maintenance');
    });

    it('shows guest count in title for multiple guests', () => {
      const multiGuestReservation = {
        ...mockReservation,
        numberOfGuests: 4
      };
      
      const event = reservationToCalendarEvent(multiGuestReservation);
      expect(event.title).toContain('(+3)'); // +3 additional guests beyond first
    });
  });

  describe('reservationsToCalendarEvents', () => {
    it('converts multiple reservations to events', () => {
      const reservations = [mockReservation];
      const events = reservationsToCalendarEvents(reservations);
      
      expect(events).toHaveLength(1);
      expect(events[0].reservationId).toBe('res-1');
    });
  });

  describe('isRoomAvailable', () => {
    it('returns true for available room', () => {
      const checkIn = new Date('2025-02-10');
      const checkOut = new Date('2025-02-12');
      
      const available = isRoomAvailable([mockReservation], 'room-102', checkIn, checkOut);
      expect(available).toBe(true);
    });

    it('returns false for occupied room with date overlap', () => {
      const checkIn = new Date('2025-02-01');
      const checkOut = new Date('2025-02-02');
      
      const available = isRoomAvailable([mockReservation], 'room-101', checkIn, checkOut);
      expect(available).toBe(false);
    });

    it('ignores checked-out reservations', () => {
      const checkedOutReservation = {
        ...mockReservation,
        status: 'checked-out' as const
      };
      
      const checkIn = new Date('2025-02-01');
      const checkOut = new Date('2025-02-02');
      
      const available = isRoomAvailable([checkedOutReservation], 'room-101', checkIn, checkOut);
      expect(available).toBe(true);
    });
  });

  describe('getRoomOccupancyForDate', () => {
    it('returns occupancy data for active reservations', () => {
      const date = new Date('2025-02-01');
      const occupancy = getRoomOccupancyForDate([mockReservation], date);
      
      expect(occupancy['room-101']).toBeDefined();
      expect(occupancy['room-101'].reservation.id).toBe('res-1');
      expect(occupancy['room-101'].status).toBe('confirmed');
    });

    it('returns empty object for date with no reservations', () => {
      const date = new Date('2025-03-01');
      const occupancy = getRoomOccupancyForDate([mockReservation], date);
      
      expect(Object.keys(occupancy)).toHaveLength(0);
    });
  });

  describe('formatRoomNumber', () => {
    it('adds star for premium rooms', () => {
      const premiumRoom = { number: '401', isPremium: true };
      expect(formatRoomNumber(premiumRoom)).toBe('⭐ 401');
    });

    it('returns plain number for regular rooms', () => {
      const regularRoom = { number: '101', isPremium: false };
      expect(formatRoomNumber(regularRoom)).toBe('101');
    });
  });

  describe('getRoomTypeDisplay', () => {
    it('returns English room type name', () => {
      const room = {
        type: 'double',
        nameCroatian: 'Dvokrevetna soba',
        nameEnglish: 'Double Room'
      };
      
      expect(getRoomTypeDisplay(room)).toBe('Double Room');
    });
  });

  describe('RESERVATION_STATUS_COLORS', () => {
    it('contains all 6 status colors', () => {
      const statuses = Object.keys(RESERVATION_STATUS_COLORS);
      expect(statuses).toHaveLength(6);
      expect(statuses).toContain('confirmed');
      expect(statuses).toContain('checked-in');
      expect(statuses).toContain('checked-out');
      expect(statuses).toContain('room-closure');
      expect(statuses).toContain('unallocated');
      expect(statuses).toContain('incomplete-payment');
    });

    it('has proper color structure for each status', () => {
      Object.values(RESERVATION_STATUS_COLORS).forEach(color => {
        expect(color).toHaveProperty('backgroundColor');
        expect(color).toHaveProperty('borderColor');
        expect(color).toHaveProperty('textColor');
        expect(color).toHaveProperty('label');
      });
    });
  });
});