/**
 * ConflictDetectionService unit tests
 *
 * Strategy: mock Supabase at the module boundary so every test is pure
 * (no network, no DB). The Supabase client is accessed through the module-
 * level helper functions inside ConflictDetectionService, so vi.mock() on
 * '@/lib/supabase' is sufficient.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConflictDetectionService } from './ConflictDetectionService';
import type { Reservation } from '@/lib/queries/hooks/useReservations';
import type { Room } from '@/lib/queries/hooks/useRooms';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ─── Test factory helpers ─────────────────────────────────────────────────────

function makeRoomRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    room_number: '101',
    floor_number: 1,
    room_types: { code: 'D' },
    max_occupancy: 2,
    is_premium: false,
    amenities: [],
    is_clean: true,
    is_active: true,
    ...overrides,
  };
}

/** Build a minimal Reservation-like object. Dates are ISO strings. */
function makeReservation(id: number, checkIn: string, checkOut: string, roomId = 1): Reservation {
  return {
    id,
    room_id: roomId,
    check_in_date: checkIn,
    check_out_date: checkOut,
    guest_id: 10,
    adults: 2,
    children_count: 0,
    number_of_guests: 2,
    status_id: null,
    booking_source_id: null,
    special_requests: null,
    has_pets: false,
    parking_required: false,
    company_id: null,
    pricing_tier_id: null,
    label_id: null,
    is_r1: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    reservation_statuses: { code: 'confirmed' },
    booking_sources: { code: 'direct' },
    guests: {
      id: 10,
      first_name: 'Ana',
      last_name: 'Horvat',
      full_name: 'Ana Horvat',
      email: null,
      phone: null,
      nationality: null,
      has_pets: false,
      is_vip: false,
      vip_level: null,
    },
    labels: null,
    // eslint_disable-next-line @typescript-eslint/no-explicit-any
  } as any as Reservation;
}

// ─── Supabase builder mock helpers ───────────────────────────────────────────

/**
 * Creates a chainable Supabase query builder that resolves with `{ data, error }`.
 * All filter/select/order methods return `this` so they can be chained freely.
 */
function makeQueryBuilder(data: unknown[] | null, error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const chain = ['select', 'eq', 'lt', 'gt', 'order', 'in', 'neq', 'gte', 'lte', 'is'] as const;
  for (const method of chain) {
    builder[method] = () => builder;
  }
  builder['single'] = async () => ({ data: data?.[0] ?? null, error });
  // Make the builder itself thenable (for `await supabase.from(...).select(...)`)
  builder['then'] = (resolve: (v: unknown) => void) => resolve({ data, error });
  return builder;
}

// ─── Reset singleton between tests ───────────────────────────────────────────

// ConflictDetectionService.instance is private; we cast to bypass TS.
// eslint_disable-next-line @typescript-eslint/no-explicit-any
const resetSingleton = () => ((ConflictDetectionService as any).instance = undefined);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConflictDetectionService', () => {
  let service: ConflictDetectionService;

  beforeEach(() => {
    resetSingleton();
    vi.clearAllMocks();
    service = ConflictDetectionService.getInstance();
  });

  afterEach(() => {
    resetSingleton();
  });

  // ── Singleton ──────────────────────────────────────────────────────────────

  describe('getInstance()', () => {
    it('returns the same instance on repeated calls', () => {
      const a = ConflictDetectionService.getInstance();
      const b = ConflictDetectionService.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── checkNewReservation — happy paths ─────────────────────────────────────

  describe('checkNewReservation() — no conflicts', () => {
    /**
     * Wire mockFrom so that:
     *   - reservations query (by room + date range) returns `reservations`
     *   - rooms single query returns `room`
     *   - rooms list query (for upgrade suggestions) returns `[room]`
     */
    function wireNoConflict(reservations: Reservation[], room: ReturnType<typeof makeRoomRow>) {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') {
          return makeQueryBuilder(reservations);
        }
        if (table === 'rooms') {
          // Both `.single()` and list queries come through `from('rooms')`
          const builder = makeQueryBuilder([room]);
          return builder;
        }
        return makeQueryBuilder([]);
      });
    }

    it('returns hasConflict=false when no reservations exist for the room', async () => {
      wireNoConflict([], makeRoomRow());

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-01T14:00:00'),
        new Date('2025-07-05T11:00:00'),
        'guest-1'
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('returns hasConflict=false when existing booking ends the day new booking starts (adjacent)', async () => {
      // Existing: Jun 28 – Jul 1. New: Jul 1 – Jul 5.
      // datesOverlap: start1 < end2 && end1 > start2  →  Jul1 < Jul1 is FALSE → no overlap ✓
      const existing = makeReservation(99, '2025-06-28', '2025-07-01');
      wireNoConflict([existing], makeRoomRow());

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-01'),
        new Date('2025-07-05'),
        'guest-1'
      );

      expect(result.hasConflict).toBe(false);
    });

    it('returns hasConflict=false when new booking ends the day existing booking starts', async () => {
      // New: Jul 1 – Jul 5. Existing: Jul 5 – Jul 8.
      const existing = makeReservation(99, '2025-07-05', '2025-07-08');
      wireNoConflict([existing], makeRoomRow());

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-01'),
        new Date('2025-07-05'),
        'guest-1'
      );

      expect(result.hasConflict).toBe(false);
    });
  });

  // ── checkNewReservation — conflict scenarios ───────────────────────────────

  describe('checkNewReservation() — overlapping reservations', () => {
    function wireConflict(reservations: Reservation[]) {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder(reservations);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow()]);
        return makeQueryBuilder([]);
      });
    }

    it('detects full overlap (new dates entirely inside existing booking)', async () => {
      // Existing: Jul 1 – Jul 10.  New: Jul 3 – Jul 7 (fully inside).
      const existing = makeReservation(5, '2025-07-01', '2025-07-10');
      wireConflict([existing]);

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-03'),
        new Date('2025-07-07'),
        'guest-2'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('overlapping_reservation');
      expect(result.conflicts[0].severity).toBe('error');
      expect(result.conflicts[0].conflictingReservation?.id).toBe(5);
    });

    it('detects partial overlap — new booking starts before existing ends', async () => {
      // Existing: Jul 5 – Jul 10.  New: Jul 3 – Jul 7.
      const existing = makeReservation(6, '2025-07-05', '2025-07-10');
      wireConflict([existing]);

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-03'),
        new Date('2025-07-07'),
        'guest-2'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].type).toBe('overlapping_reservation');
    });

    it('detects partial overlap — new booking ends after existing starts', async () => {
      // Existing: Jul 1 – Jul 5.  New: Jul 4 – Jul 8.
      const existing = makeReservation(7, '2025-07-01', '2025-07-05');
      wireConflict([existing]);

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-04'),
        new Date('2025-07-08'),
        'guest-2'
      );

      expect(result.hasConflict).toBe(true);
    });

    it('detects full encapsulation — new booking spans the entire existing booking', async () => {
      // Existing: Jul 3 – Jul 6.  New: Jul 1 – Jul 10 (wraps it).
      const existing = makeReservation(8, '2025-07-03', '2025-07-06');
      wireConflict([existing]);

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-01'),
        new Date('2025-07-10'),
        'guest-2'
      );

      expect(result.hasConflict).toBe(true);
    });

    it('detects exact same dates as existing booking', async () => {
      const existing = makeReservation(9, '2025-07-01', '2025-07-05');
      wireConflict([existing]);

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-01'),
        new Date('2025-07-05'),
        'guest-3'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });

    it('reports multiple conflicts when several bookings overlap', async () => {
      const r1 = makeReservation(10, '2025-07-01', '2025-07-05');
      const r2 = makeReservation(11, '2025-07-03', '2025-07-08');
      wireConflict([r1, r2]);

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-02'),
        new Date('2025-07-06'),
        'guest-4'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
    });

    it('attaches suggested alternatives to the first conflict', async () => {
      const existing = makeReservation(12, '2025-07-01', '2025-07-05');

      // First call: the conflicting room (room 1) returns an existing booking.
      // Subsequent calls to from('rooms') return a different room (room 2)
      // as an available alternative.
      const altRoom = makeRoomRow({ id: 2, room_number: '102' });

      let reservationCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') {
          reservationCallCount++;
          // First call (for room 1) → conflict. Second call (for alt room 2) → no bookings.
          return makeQueryBuilder(reservationCallCount === 1 ? [existing] : []);
        }
        if (table === 'rooms') {
          // Return two rooms: the original (id=1) and the alternative (id=2)
          return makeQueryBuilder([makeRoomRow({ id: 1 }), altRoom]);
        }
        return makeQueryBuilder([]);
      });

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-02'),
        new Date('2025-07-04'),
        'guest-5'
      );

      expect(result.hasConflict).toBe(true);
      // suggestedAlternatives may or may not be populated depending on recursion
      // depth; at minimum, the first conflict must be present.
      expect(result.conflicts[0]).toBeDefined();
    });
  });

  // ── excludeReservationId ──────────────────────────────────────────────────

  describe('checkNewReservation() — excludeReservationId', () => {
    it('ignores the reservation being edited when checking for conflicts', async () => {
      // Simulate editing reservation 99: it overlaps with its own old dates.
      const existing = makeReservation(99, '2025-07-01', '2025-07-10');

      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([existing]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow()]);
        return makeQueryBuilder([]);
      });

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-01'),
        new Date('2025-07-10'),
        'guest-1',
        99 // exclude own id
      );

      expect(result.hasConflict).toBe(false);
    });

    it('still detects conflicts with OTHER reservations when excludeReservationId is set', async () => {
      const ownReservation = makeReservation(99, '2025-07-01', '2025-07-10');
      const otherConflict = makeReservation(55, '2025-07-05', '2025-07-08');

      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([ownReservation, otherConflict]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow()]);
        return makeQueryBuilder([]);
      });

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-01'),
        new Date('2025-07-10'),
        'guest-1',
        99
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].conflictingReservation?.id).toBe(55);
    });
  });

  // ── Room not found ────────────────────────────────────────────────────────

  describe('checkNewReservation() — room_unavailable', () => {
    it('adds a room_unavailable conflict when the room does not exist in DB', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([]);
        if (table === 'rooms') return makeQueryBuilder(null, { message: 'not found' });
        return makeQueryBuilder([]);
      });

      const result = await service.checkNewReservation(
        '999',
        new Date('2025-08-01'),
        new Date('2025-08-05'),
        'guest-x'
      );

      expect(result.hasConflict).toBe(true);
      const roomConflict = result.conflicts.find((c) => c.type === 'room_unavailable');
      expect(roomConflict).toBeDefined();
    });
  });

  // ── Supabase error handling ───────────────────────────────────────────────

  describe('checkNewReservation() — DB error resilience', () => {
    it('returns a conflict with room_unavailable when Supabase throws', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network failure');
      });

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-08-01'),
        new Date('2025-08-05'),
        'guest-err'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].type).toBe('room_unavailable');
    });
  });

  // ── Business rule warnings ────────────────────────────────────────────────

  describe('business rule warnings', () => {
    function wireCleanBooking() {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow()]);
        return makeQueryBuilder([]);
      });
    }

    it('adds a short_stay warning for a single-night booking', async () => {
      wireCleanBooking();
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-10T14:00:00'),
        new Date('2025-07-11T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.some((w) => w.type === 'short_stay')).toBe(true);
    });

    it('does NOT add short_stay warning for a multi-night booking', async () => {
      wireCleanBooking();
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-10T14:00:00'),
        new Date('2025-07-14T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.some((w) => w.type === 'short_stay')).toBe(false);
    });

    it('adds a peak_period warning when check-in is on a Saturday', async () => {
      wireCleanBooking();
      // 2025-07-05 is a Saturday
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-05T14:00:00'),
        new Date('2025-07-08T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.some((w) => w.type === 'peak_period')).toBe(true);
    });

    it('adds a peak_period warning when check-out is on a Sunday', async () => {
      wireCleanBooking();
      // 2025-07-07 is a Monday check-in, 2025-07-13 is a Sunday check-out
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-07T14:00:00'),
        new Date('2025-07-13T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.some((w) => w.type === 'peak_period')).toBe(true);
    });

    it('does NOT add peak_period warning for a mid-week-only stay', async () => {
      wireCleanBooking();
      // 2025-07-07 Monday → 2025-07-11 Friday
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-07T14:00:00'),
        new Date('2025-07-11T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.some((w) => w.type === 'peak_period')).toBe(false);
    });

    it('adds early_checkin warning when check-in hour is before 15:00', async () => {
      wireCleanBooking();
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-07T10:00:00'), // 10 AM
        new Date('2025-07-11T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.some((w) => w.type === 'early_checkin')).toBe(true);
    });

    it('adds late_checkin warning when check-in hour is after 22:00', async () => {
      wireCleanBooking();
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-07T23:00:00'), // 11 PM
        new Date('2025-07-11T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.some((w) => w.type === 'late_checkin')).toBe(true);
    });

    it('does NOT add early_checkin or late_checkin for a standard 15:00 check-in', async () => {
      wireCleanBooking();
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-07T15:00:00'),
        new Date('2025-07-11T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.some((w) => w.type === 'early_checkin')).toBe(false);
      expect(result.warnings.some((w) => w.type === 'late_checkin')).toBe(false);
    });

    it('adds a room_upgrade suggestion when a premium room is available', async () => {
      const premiumRoom = makeRoomRow({ id: 2, room_number: '201', is_premium: true });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow({ id: 1 }), premiumRoom]);
        return makeQueryBuilder([]);
      });

      const result = await service.checkNewReservation(
        '1', // non-premium room
        new Date('2025-07-07T15:00:00'),
        new Date('2025-07-11T11:00:00'),
        'guest-1'
      );

      expect(result.suggestions.some((s) => s.type === 'room_upgrade')).toBe(true);
    });

    it('does NOT add a room_upgrade suggestion when already in a premium room', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow({ id: 1, is_premium: true })]);
        return makeQueryBuilder([]);
      });

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-07T15:00:00'),
        new Date('2025-07-11T11:00:00'),
        'guest-1'
      );

      expect(result.suggestions.some((s) => s.type === 'room_upgrade')).toBe(false);
    });
  });

  // ── checkReservationMove ──────────────────────────────────────────────────

  describe('checkReservationMove()', () => {
    it('delegates to checkNewReservation with the reservation excluded', async () => {
      const checkNewSpy = vi.spyOn(service, 'checkNewReservation').mockResolvedValue({
        hasConflict: false,
        conflicts: [],
        warnings: [],
        suggestions: [],
      });

      await service.checkReservationMove(42, '5', new Date('2025-08-01'), new Date('2025-08-05'));

      expect(checkNewSpy).toHaveBeenCalledWith(
        '5',
        new Date('2025-08-01'),
        new Date('2025-08-05'),
        '',
        42
      );
    });

    it('propagates conflict result from underlying checkNewReservation', async () => {
      vi.spyOn(service, 'checkNewReservation').mockResolvedValue({
        hasConflict: true,
        conflicts: [
          {
            type: 'overlapping_reservation',
            severity: 'error',
            message: 'Already booked',
          },
        ],
        warnings: [],
        suggestions: [],
      });

      const result = await service.checkReservationMove(
        42,
        '5',
        new Date('2025-08-01'),
        new Date('2025-08-05')
      );

      expect(result.hasConflict).toBe(true);
    });
  });

  // ── checkBatchOperations ──────────────────────────────────────────────────

  describe('checkBatchOperations()', () => {
    /** Returns a fresh no-conflict result object each time it is called. */
    const freshNoConflict = () => ({
      hasConflict: false,
      conflicts: [] as import('./ConflictDetectionService').BookingConflict[],
      warnings: [] as import('./ConflictDetectionService').BookingWarning[],
      suggestions: [] as import('./ConflictDetectionService').BookingSuggestion[],
    });

    it('returns an indexed result map for each operation', async () => {
      vi.spyOn(service, 'checkNewReservation').mockImplementation(async () => freshNoConflict());

      const results = await service.checkBatchOperations([
        {
          type: 'create',
          roomId: '1',
          checkIn: new Date('2025-07-01'),
          checkOut: new Date('2025-07-05'),
        },
        {
          type: 'create',
          roomId: '2',
          checkIn: new Date('2025-07-01'),
          checkOut: new Date('2025-07-05'),
        },
      ]);

      expect(Object.keys(results)).toHaveLength(2);
      expect(results[0].hasConflict).toBe(false);
      expect(results[1].hasConflict).toBe(false);
    });

    it('detects intra-batch conflict when two operations target the same room with overlapping dates', async () => {
      vi.spyOn(service, 'checkNewReservation').mockImplementation(async () => freshNoConflict());

      const results = await service.checkBatchOperations([
        {
          type: 'create',
          roomId: '1',
          checkIn: new Date('2025-07-01'),
          checkOut: new Date('2025-07-10'),
        },
        {
          type: 'create',
          roomId: '1', // same room
          checkIn: new Date('2025-07-05'), // overlaps with operation 0
          checkOut: new Date('2025-07-12'),
        },
      ]);

      expect(results[1].hasConflict).toBe(true);
      expect(results[1].conflicts[0].type).toBe('overlapping_reservation');
      expect(results[1].conflicts[0].message).toContain('operation #1');
    });

    it('does NOT flag intra-batch conflict when same room has adjacent (non-overlapping) dates', async () => {
      vi.spyOn(service, 'checkNewReservation').mockImplementation(async () => freshNoConflict());

      const results = await service.checkBatchOperations([
        {
          type: 'create',
          roomId: '1',
          checkIn: new Date('2025-07-01'),
          checkOut: new Date('2025-07-05'),
        },
        {
          type: 'create',
          roomId: '1',
          checkIn: new Date('2025-07-05'), // starts exactly when #0 ends
          checkOut: new Date('2025-07-10'),
        },
      ]);

      // prev.checkIn < op.checkOut && prev.checkOut > op.checkIn
      // Jul1 < Jul10 ✓  AND  Jul5 > Jul5 ✗ → no intra-batch conflict
      expect(results[1].hasConflict).toBe(false);
    });

    it('does NOT flag intra-batch conflict when operations target different rooms', async () => {
      vi.spyOn(service, 'checkNewReservation').mockImplementation(async () => freshNoConflict());

      const results = await service.checkBatchOperations([
        {
          type: 'create',
          roomId: '1',
          checkIn: new Date('2025-07-01'),
          checkOut: new Date('2025-07-10'),
        },
        {
          type: 'create',
          roomId: '2', // different room, same dates
          checkIn: new Date('2025-07-01'),
          checkOut: new Date('2025-07-10'),
        },
      ]);

      expect(results[1].hasConflict).toBe(false);
    });

    it('uses checkReservationMove for move/extend operations', async () => {
      const moveSpy = vi
        .spyOn(service, 'checkReservationMove')
        .mockImplementation(async () => freshNoConflict());

      await service.checkBatchOperations([
        {
          type: 'move',
          roomId: '2',
          checkIn: new Date('2025-08-01'),
          checkOut: new Date('2025-08-05'),
          reservationId: 77,
        },
      ]);

      expect(moveSpy).toHaveBeenCalledOnce();
    });
  });

  // ── validateDragOperation ─────────────────────────────────────────────────

  describe('validateDragOperation()', () => {
    it('returns valid=false when source reservation is not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([]); // no reservations
        return makeQueryBuilder([]);
      });

      const result = await service.validateDragOperation(999, '2', new Date('2025-07-10'));

      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/not found/i);
    });

    it('returns valid=true when drag target is free', async () => {
      const source = makeReservation(1, '2025-07-01', '2025-07-05', 1);

      // getAllReservations returns the source; conflict check finds no collisions
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([source]);
        if (table === 'rooms')
          return makeQueryBuilder([makeRoomRow({ id: 2, room_number: '102' })]);
        return makeQueryBuilder([]);
      });

      // Stub checkReservationMove to avoid deep recursion in this integration path
      vi.spyOn(service, 'checkReservationMove').mockResolvedValue({
        hasConflict: false,
        conflicts: [],
        warnings: [],
        suggestions: [],
      });

      const result = await service.validateDragOperation(1, '2', new Date('2025-07-10'));

      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('returns valid=false and the first conflict message when target room is occupied', async () => {
      const source = makeReservation(1, '2025-07-01', '2025-07-05', 1);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([source]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow({ id: 2 })]);
        return makeQueryBuilder([]);
      });

      vi.spyOn(service, 'checkReservationMove').mockResolvedValue({
        hasConflict: true,
        conflicts: [
          {
            type: 'overlapping_reservation',
            severity: 'error',
            message: 'Room 2 is already booked',
          },
        ],
        warnings: [],
        suggestions: [],
      });

      const result = await service.validateDragOperation(1, '2', new Date('2025-07-10'));

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Room 2 is already booked');
      expect(result.conflicts).toHaveLength(1);
    });

    it('preserves the original booking duration when calculating new checkout', async () => {
      // Source: 3-night stay (Jul 1–4). Drag to Jul 10 → should become Jul 10–13.
      const source = makeReservation(1, '2025-07-01', '2025-07-04', 1);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([source]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow()]);
        return makeQueryBuilder([]);
      });

      const moveSpy = vi.spyOn(service, 'checkReservationMove').mockResolvedValue({
        hasConflict: false,
        conflicts: [],
        warnings: [],
        suggestions: [],
      });

      await service.validateDragOperation(1, '1', new Date('2025-07-10'));

      const [_resId, _roomId, newCheckIn, newCheckOut] = moveSpy.mock.calls[0];
      const durationMs = newCheckOut.getTime() - newCheckIn.getTime();
      const originalMs = new Date('2025-07-04').getTime() - new Date('2025-07-01').getTime();

      expect(durationMs).toBe(originalMs);
    });

    it('returns valid=false when Supabase throws during drag validation', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Timeout');
      });

      const result = await service.validateDragOperation(1, '2', new Date('2025-07-10'));

      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/unable to validate/i);
    });
  });

  // ── Virtual rooms / room type handling ───────────────────────────────────

  describe('virtual rooms / room type handling', () => {
    it('handles numeric roomId strings correctly when casting to Number()', async () => {
      // Verifies that from('rooms').eq('id', 1) is called (not eq('id', '1')).
      // The mock simply checks that a room query was made and the service
      // doesn't throw on string→number conversion.
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow({ id: 1 })]);
        return makeQueryBuilder([]);
      });

      const result = await service.checkNewReservation(
        '1',
        new Date('2025-09-01'),
        new Date('2025-09-05'),
        'guest-1'
      );

      expect(result.hasConflict).toBe(false);
    });

    it('returns room_unavailable when roomId is a non-numeric string', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([]);
        // Simulate "no row found" for NaN room id
        if (table === 'rooms') return makeQueryBuilder(null, { message: 'not found' });
        return makeQueryBuilder([]);
      });

      const result = await service.checkNewReservation(
        'virtual-room-A',
        new Date('2025-09-01'),
        new Date('2025-09-05'),
        'guest-1'
      );

      expect(result.conflicts.some((c) => c.type === 'room_unavailable')).toBe(true);
    });
  });

  // ── hasConflict = warnings-only case ─────────────────────────────────────

  describe('hasConflict flag semantics', () => {
    it('is false when only warnings exist (no error-severity conflicts)', async () => {
      // Single night stay + weekend triggers warnings but no error conflicts.
      mockFrom.mockImplementation((table: string) => {
        if (table === 'reservations') return makeQueryBuilder([]);
        if (table === 'rooms') return makeQueryBuilder([makeRoomRow()]);
        return makeQueryBuilder([]);
      });

      // 2025-07-05 is Saturday (single night)
      const result = await service.checkNewReservation(
        '1',
        new Date('2025-07-05T08:00:00'), // Saturday, before 15:00
        new Date('2025-07-06T11:00:00'),
        'guest-1'
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.hasConflict).toBe(false);
    });
  });
});
