import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addDays, startOfDay } from 'date-fns';
import { HotelTimelineService } from './HotelTimelineService';
import type { Reservation } from '@/lib/queries/hooks/useReservations';
import type { Room } from '@/lib/queries/hooks/useRooms';

// Mock calendarUtils — the service only uses RESERVATION_STATUS_COLORS
vi.mock('../calendarUtils', () => ({
  RESERVATION_STATUS_COLORS: {
    confirmed: {
      backgroundColor: '#fb923c',
      borderColor: '#ea580c',
      textColor: '#ffffff',
      label: 'Confirmed',
    },
    'checked-in': {
      backgroundColor: '#22c55e',
      borderColor: '#16a34a',
      textColor: '#ffffff',
      label: 'Checked In',
    },
    'checked-out': {
      backgroundColor: '#6b7280',
      borderColor: '#4b5563',
      textColor: '#ffffff',
      label: 'Checked Out',
    },
  },
}));

// Reset singleton between tests
function resetSingleton() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing private static for test reset
  (HotelTimelineService as any).instance = undefined;
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 1,
    room_number: '101',
    floor_number: 1,
    room_type_id: 1,
    is_active: true,
    is_premium: false,
    is_clean: true,
    amenities: [],
    max_occupancy: 2,
    name_english: 'Double Room',
    name_croatian: 'Dvokrevetna soba',
    seasonal_rates: { A: 50, B: 60, C: 70, D: 80 },
    room_types: { code: 'double' },
    room_pricing: [],
    ...overrides,
  } as unknown as Room;
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 1,
    room_id: 1,
    guest_id: 10,
    check_in_date: '2026-04-01',
    check_out_date: '2026-04-05',
    adults: 2,
    children_count: 0,
    number_of_guests: 2,
    status_id: 1,
    booking_source_id: 1,
    special_requests: null,
    internal_notes: null,
    has_pets: false,
    parking_required: false,
    checked_in_at: null,
    checked_out_at: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    company_id: null,
    pricing_tier_id: null,
    label_id: null,
    is_r1: false,
    reservation_statuses: { code: 'confirmed' },
    booking_sources: { code: 'direct' },
    guests: {
      id: 10,
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: null,
      nationality: null,
      has_pets: false,
      is_vip: false,
      vip_level: 0,
    },
    labels: null,
    ...overrides,
  } as unknown as Reservation;
}

describe('HotelTimelineService', () => {
  let service: HotelTimelineService;

  beforeEach(() => {
    resetSingleton();
    service = HotelTimelineService.getInstance();
  });

  describe('getInstance', () => {
    it('returns a singleton', () => {
      expect(HotelTimelineService.getInstance()).toBe(service);
    });
  });

  describe('getTimelineDateRange', () => {
    it('returns 14 dates starting from the given date', () => {
      const result = service.getTimelineDateRange(new Date('2026-04-01'));
      expect(result.dates).toHaveLength(14);
      expect(result.startDate).toEqual(startOfDay(new Date('2026-04-01')));
      expect(result.endDate).toEqual(startOfDay(new Date('2026-04-14')));
    });

    it('normalizes to start of day', () => {
      const dateWithTime = new Date('2026-04-01T15:30:00');
      const result = service.getTimelineDateRange(dateWithTime);
      expect(result.startDate.getHours()).toBe(0);
      expect(result.startDate.getMinutes()).toBe(0);
    });
  });

  describe('navigateTimeline', () => {
    const base = new Date('2026-04-15');

    it('moves back 14 days on PREV', () => {
      const result = service.navigateTimeline(base, 'PREV');
      expect(result).toEqual(addDays(base, -14));
    });

    it('moves forward 14 days on NEXT', () => {
      const result = service.navigateTimeline(base, 'NEXT');
      expect(result).toEqual(addDays(base, 14));
    });

    it('returns current date for TODAY', () => {
      const before = Date.now();
      const result = service.navigateTimeline(base, 'TODAY');
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('navigateOverview', () => {
    const base = new Date('2026-04-15');

    it('moves back 1 day on PREV', () => {
      expect(service.navigateOverview(base, 'PREV')).toEqual(addDays(base, -1));
    });

    it('moves forward 1 day on NEXT', () => {
      expect(service.navigateOverview(base, 'NEXT')).toEqual(addDays(base, 1));
    });
  });

  describe('generateCalendarEvents', () => {
    const rooms = [makeRoom({ id: 1, room_number: '101' })];
    const startDate = new Date('2026-04-01');

    it('includes reservations overlapping the 14-day window', () => {
      const reservations = [
        makeReservation({ id: 1, check_in_date: '2026-04-03', check_out_date: '2026-04-07' }),
      ];

      const events = service.generateCalendarEvents(reservations, startDate, rooms);
      expect(events).toHaveLength(1);
      expect(events[0].reservationId).toBe('1');
      expect(events[0].resource.guestName).toBe('John Doe');
      expect(events[0].resource.roomNumber).toBe('101');
    });

    it('excludes reservations completely outside the window', () => {
      const reservations = [
        makeReservation({ id: 2, check_in_date: '2026-05-01', check_out_date: '2026-05-05' }),
      ];

      const events = service.generateCalendarEvents(reservations, startDate, rooms);
      expect(events).toHaveLength(0);
    });

    it('includes partially overlapping reservations', () => {
      const reservations = [
        // Starts before window, ends within
        makeReservation({ id: 3, check_in_date: '2026-03-28', check_out_date: '2026-04-03' }),
        // Starts within window, ends after
        makeReservation({ id: 4, check_in_date: '2026-04-13', check_out_date: '2026-04-20' }),
      ];

      const events = service.generateCalendarEvents(reservations, startDate, rooms);
      expect(events).toHaveLength(2);
    });

    it('handles unknown room gracefully', () => {
      const reservations = [
        makeReservation({
          id: 5,
          room_id: 999,
          check_in_date: '2026-04-03',
          check_out_date: '2026-04-05',
        }),
      ];

      const events = service.generateCalendarEvents(reservations, startDate, rooms);
      expect(events[0].resource.roomNumber).toBe('Unknown Room');
    });

    it('uses full_name from guest data', () => {
      const reservations = [
        makeReservation({
          id: 6,
          check_in_date: '2026-04-03',
          check_out_date: '2026-04-05',
          guests: {
            id: 10,
            first_name: 'Jane',
            last_name: 'Smith',
            full_name: 'Jane Smith',
            email: null,
            phone: null,
            nationality: null,
            has_pets: false,
            is_vip: false,
            vip_level: 0,
          },
        }),
      ];

      const events = service.generateCalendarEvents(reservations, startDate, rooms);
      expect(events[0].title).toBe('Jane Smith');
    });
  });

  describe('calculateReservationPosition', () => {
    const timelineStart = new Date('2026-04-01');

    it('calculates correct grid columns for a reservation starting on timeline start', () => {
      const reservation = makeReservation({
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-04',
      });

      const pos = service.calculateReservationPosition(reservation, timelineStart);
      // Day 0: startHalfDay = 0*2+1 = 1, endDayIndex=3, endHalfDay = 3*2 = 6
      expect(pos.visibleStartHalfDay).toBe(1);
      expect(pos.visibleEndHalfDay).toBe(6);
      expect(pos.gridColumnStart).toBe(3); // 1 + 2
      expect(pos.gridColumnEnd).toBe(9); // 6 + 3
      expect(pos.reservationDays).toBe(3);
    });

    it('clamps reservations that extend before the timeline', () => {
      const reservation = makeReservation({
        check_in_date: '2026-03-28',
        check_out_date: '2026-04-03',
      });

      const pos = service.calculateReservationPosition(reservation, timelineStart);
      // startDayIndex = -4, startHalfDay = -4*2+1 = -7, clamped to 0
      expect(pos.visibleStartHalfDay).toBe(0);
      expect(pos.reservationDays).toBe(6);
    });

    it('clamps reservations that extend beyond the timeline', () => {
      const reservation = makeReservation({
        check_in_date: '2026-04-12',
        check_out_date: '2026-04-20',
      });

      const pos = service.calculateReservationPosition(reservation, timelineStart);
      // endDayIndex = 19, endHalfDay = 19*2 = 38, clamped to 27
      expect(pos.visibleEndHalfDay).toBe(27);
    });
  });

  describe('calculateOccupancyData', () => {
    const rooms = [
      makeRoom({ id: 1, room_number: '101' }),
      makeRoom({ id: 2, room_number: '102' }),
    ];

    it('marks all rooms as available when no reservations', () => {
      const result = service.calculateOccupancyData([], new Date('2026-04-03'), rooms);
      expect(result['1'].status).toBe('available');
      expect(result['2'].status).toBe('available');
    });

    it('marks room as occupied when reservation covers the date', () => {
      const reservations = [
        makeReservation({
          id: 1,
          room_id: 1,
          check_in_date: '2026-04-01',
          check_out_date: '2026-04-05',
        }),
      ];

      const result = service.calculateOccupancyData(reservations, new Date('2026-04-03'), rooms);
      expect(result['1'].status).toBe('confirmed');
      expect(result['1'].reservation).toBeDefined();
      expect(result['2'].status).toBe('available');
    });

    it('sets checkInTime on check-in day', () => {
      const reservations = [
        makeReservation({
          id: 1,
          room_id: 1,
          check_in_date: '2026-04-03',
          check_out_date: '2026-04-05',
        }),
      ];

      const result = service.calculateOccupancyData(reservations, new Date('2026-04-03'), rooms);
      expect(result['1'].checkInTime).toBe('15:00');
    });

    it('does not set checkOutTime for middle days', () => {
      const reservations = [
        makeReservation({
          id: 1,
          room_id: 1,
          check_in_date: '2026-04-01',
          check_out_date: '2026-04-05',
        }),
      ];

      const result = service.calculateOccupancyData(reservations, new Date('2026-04-03'), rooms);
      expect(result['1'].checkOutTime).toBeUndefined();
      expect(result['1'].checkInTime).toBeUndefined();
    });
  });

  describe('calculateOccupancyDataByPeriod', () => {
    const rooms = [makeRoom({ id: 1 })];

    it('AM shows check-out and middle-day reservations', () => {
      const reservations = [
        // Checking out today
        makeReservation({
          id: 1,
          room_id: 1,
          check_in_date: '2026-04-01',
          check_out_date: '2026-04-03',
        }),
      ];

      const result = service.calculateOccupancyDataByPeriod(
        reservations,
        new Date('2026-04-03'),
        rooms,
        'AM'
      );
      expect(result['1'].status).toBe('confirmed');
      expect(result['1'].checkOutTime).toBe('11:00');
    });

    it('PM shows check-in and middle-day reservations', () => {
      const reservations = [
        // Checking in today
        makeReservation({
          id: 2,
          room_id: 1,
          check_in_date: '2026-04-03',
          check_out_date: '2026-04-06',
        }),
      ];

      const result = service.calculateOccupancyDataByPeriod(
        reservations,
        new Date('2026-04-03'),
        rooms,
        'PM'
      );
      expect(result['1'].status).toBe('confirmed');
      expect(result['1'].checkInTime).toBe('15:00');
    });

    it('AM does not show check-in-only reservations', () => {
      const reservations = [
        makeReservation({
          id: 3,
          room_id: 1,
          check_in_date: '2026-04-03',
          check_out_date: '2026-04-06',
        }),
      ];

      const result = service.calculateOccupancyDataByPeriod(
        reservations,
        new Date('2026-04-03'),
        rooms,
        'AM'
      );
      expect(result['1'].status).toBe('available');
    });

    it('PM does not show check-out-only reservations', () => {
      const reservations = [
        makeReservation({
          id: 4,
          room_id: 1,
          check_in_date: '2026-04-01',
          check_out_date: '2026-04-03',
        }),
      ];

      const result = service.calculateOccupancyDataByPeriod(
        reservations,
        new Date('2026-04-03'),
        rooms,
        'PM'
      );
      expect(result['1'].status).toBe('available');
    });

    it('middle-day stays show in both AM and PM', () => {
      const reservations = [
        makeReservation({
          id: 5,
          room_id: 1,
          check_in_date: '2026-04-01',
          check_out_date: '2026-04-06',
        }),
      ];

      const am = service.calculateOccupancyDataByPeriod(
        reservations,
        new Date('2026-04-03'),
        rooms,
        'AM'
      );
      const pm = service.calculateOccupancyDataByPeriod(
        reservations,
        new Date('2026-04-03'),
        rooms,
        'PM'
      );
      expect(am['1'].status).toBe('confirmed');
      expect(pm['1'].status).toBe('confirmed');
    });
  });

  describe('getRoomsByFloor', () => {
    it('groups rooms by floor_number', () => {
      const rooms = [
        makeRoom({ id: 1, floor_number: 1 }),
        makeRoom({ id: 2, floor_number: 1 }),
        makeRoom({ id: 3, floor_number: 2 }),
      ];

      const grouped = service.getRoomsByFloor(rooms);
      expect(grouped[1]).toHaveLength(2);
      expect(grouped[2]).toHaveLength(1);
    });

    it('returns empty object for empty input', () => {
      expect(service.getRoomsByFloor([])).toEqual({});
    });
  });

  describe('calculateDragCreatePreview', () => {
    it('returns preview when start and end are in the same room', () => {
      const result = service.calculateDragCreatePreview(
        { roomId: 'r1', dayIndex: 2 },
        { roomId: 'r1', dayIndex: 5 }
      );
      expect(result).toEqual({ roomId: 'r1', startDay: 2, endDay: 5 });
    });

    it('orders days correctly when dragging backwards', () => {
      const result = service.calculateDragCreatePreview(
        { roomId: 'r1', dayIndex: 7 },
        { roomId: 'r1', dayIndex: 3 }
      );
      expect(result).toEqual({ roomId: 'r1', startDay: 3, endDay: 7 });
    });

    it('returns null when rooms differ', () => {
      expect(
        service.calculateDragCreatePreview(
          { roomId: 'r1', dayIndex: 2 },
          { roomId: 'r2', dayIndex: 5 }
        )
      ).toBeNull();
    });

    it('returns null when start is null', () => {
      expect(service.calculateDragCreatePreview(null, { roomId: 'r1', dayIndex: 5 })).toBeNull();
    });
  });

  describe('convertDayIndexToDates', () => {
    it('converts indices to check-in/check-out dates', () => {
      const base = new Date('2026-04-01');
      const { checkIn, checkOut } = service.convertDayIndexToDates(2, 5, base);

      expect(checkIn).toEqual(addDays(startOfDay(base), 2));
      expect(checkOut).toEqual(addDays(startOfDay(base), 6)); // endDay + 1
    });
  });

  describe('positionContextMenu', () => {
    it('returns original position when within bounds', () => {
      // jsdom defaults: innerWidth=0, innerHeight=0 — set them explicitly
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      const result = service.positionContextMenu(100, 100);
      expect(result).toEqual({ x: 100, y: 100 });
    });

    it('adjusts position when near right edge', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      const result = service.positionContextMenu(1800, 100, 200, 300);
      expect(result.x).toBe(1710); // 1920 - 200 - 10
    });

    it('adjusts position when near bottom edge', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      const result = service.positionContextMenu(100, 900, 200, 300);
      expect(result.y).toBe(770); // 1080 - 300 - 10
    });

    it('ensures minimum 10px from edges', () => {
      Object.defineProperty(window, 'innerWidth', { value: 100, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 100, writable: true });

      const result = service.positionContextMenu(-50, -50);
      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
    });
  });

  describe('validateReservationMove', () => {
    const rooms = [
      makeRoom({ id: 1, room_number: '101' }),
      makeRoom({ id: 2, room_number: '102' }),
    ];

    it('returns valid when no conflicts exist', () => {
      const reservation = makeReservation({
        id: 1,
        room_id: 1,
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
      });

      const result = service.validateReservationMove(reservation, 2, [], rooms);
      expect(result).toEqual({ valid: true });
    });

    it('returns invalid when target room does not exist', () => {
      const reservation = makeReservation();
      const result = service.validateReservationMove(reservation, 999, [], rooms);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target room not found');
    });

    it('detects conflicts with existing reservations in target room', () => {
      const movingRes = makeReservation({
        id: 1,
        room_id: 1,
        check_in_date: '2026-04-03',
        check_out_date: '2026-04-07',
      });
      const existingRes = makeReservation({
        id: 2,
        room_id: 2,
        check_in_date: '2026-04-05',
        check_out_date: '2026-04-10',
      });

      const result = service.validateReservationMove(movingRes, 2, [existingRes], rooms);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('102');
    });

    it('ignores the same reservation in conflict check', () => {
      const reservation = makeReservation({
        id: 1,
        room_id: 2,
        check_in_date: '2026-04-03',
        check_out_date: '2026-04-07',
      });

      // Same reservation in target room should not conflict with itself
      const result = service.validateReservationMove(reservation, 2, [reservation], rooms);
      expect(result.valid).toBe(true);
    });
  });

  describe('getReservationStatusColors', () => {
    it('returns colors for known status', () => {
      const colors = service.getReservationStatusColors('confirmed');
      expect(colors.backgroundColor).toBe('#fb923c');
    });

    it('falls back to confirmed colors for unknown status', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing fallback for unknown status
      const colors = service.getReservationStatusColors('unknown' as any);
      expect(colors).toBeDefined();
    });
  });

  describe('formatDateRange', () => {
    it('formats a date range', () => {
      const result = service.formatDateRange(new Date('2026-04-01'), new Date('2026-04-14'));
      expect(result).toBe('Apr 1 - Apr 14, 2026');
    });
  });

  describe('isWeekend', () => {
    it('returns true for Saturday', () => {
      // 2026-04-04 is Saturday
      expect(service.isWeekend(new Date('2026-04-04'))).toBe(true);
    });

    it('returns true for Sunday', () => {
      // 2026-04-05 is Sunday
      expect(service.isWeekend(new Date('2026-04-05'))).toBe(true);
    });

    it('returns false for weekday', () => {
      // 2026-04-06 is Monday
      expect(service.isWeekend(new Date('2026-04-06'))).toBe(false);
    });
  });
});
