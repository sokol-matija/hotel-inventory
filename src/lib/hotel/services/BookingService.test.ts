import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingService, createFullBooking, type CreateFullBookingInput } from './BookingService';
import type { Reservation } from '@/lib/queries/hooks/useReservations';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '@/lib/supabase';

// ── Proxy chain builder ────────────────────────────────────────────────────────
// Every chained method call returns a new proxy; .then() terminates with result.
function makeChain(result: { data: unknown; error: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string | symbol) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

function makeTableMock(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
  const defaults: Record<string, { data: unknown; error: unknown }> = {
    guests: { data: { id: 101 }, error: null },
    reservation_statuses: { data: { id: 1 }, error: null },
    booking_sources: { data: { id: 1 }, error: null },
    reservations: { data: { id: 42 }, error: null },
    reservation_charges: { data: null, error: null },
    reservation_guests: { data: null, error: null },
    guest_stays: { data: null, error: null },
    guest_children: { data: null, error: null },
    ...overrides,
  };
  return (table: string) => makeChain(defaults[table] ?? { data: null, error: null }) as never;
}

const baseInput: CreateFullBookingInput = {
  roomId: 1,
  checkInDate: new Date('2026-05-01'),
  checkOutDate: new Date('2026-05-05'),
  adultsCount: 2,
  childrenCount: 0,
  guests: [{ firstName: 'Ivan', lastName: 'Horvat', type: 'adult' }],
  hasPets: false,
  parkingRequired: false,
  isR1: false,
  companyId: null,
  labelId: null,
  charges: [],
};

function buildMinimalReservation(
  fields: Pick<Reservation, 'room_id' | 'check_in_date' | 'check_out_date'>
): Reservation {
  return fields as unknown as Reservation;
}

// ── BookingService.validateBooking ────────────────────────────────────────────

describe('BookingService.validateBooking', () => {
  const service = BookingService.getInstance();

  it('returns no errors for valid booking data', () => {
    const errors = service.validateBooking({
      room: { id: 1 } as never,
      guest: { firstName: 'Ivan', lastName: 'Horvat' } as never,
      checkIn: new Date('2026-05-01'),
      checkOut: new Date('2026-05-05'),
    });
    expect(errors).toHaveLength(0);
  });

  it('requires a room', () => {
    const errors = service.validateBooking({
      guest: { firstName: 'Ivan' } as never,
      checkIn: new Date('2026-05-01'),
      checkOut: new Date('2026-05-05'),
    });
    expect(errors.map((e) => e.field)).toContain('room');
  });

  it('requires a guest when isNewGuest is falsy', () => {
    const errors = service.validateBooking({
      room: { id: 1 } as never,
      checkIn: new Date('2026-05-01'),
      checkOut: new Date('2026-05-05'),
      isNewGuest: false,
    });
    expect(errors.map((e) => e.field)).toContain('guest');
  });

  it('accepts missing guest when isNewGuest is true', () => {
    const errors = service.validateBooking({
      room: { id: 1 } as never,
      checkIn: new Date('2026-05-01'),
      checkOut: new Date('2026-05-05'),
      isNewGuest: true,
    });
    expect(errors.map((e) => e.field)).not.toContain('guest');
  });

  it('rejects check-out equal to check-in', () => {
    const errors = service.validateBooking({
      room: { id: 1 } as never,
      guest: { firstName: 'Ivan' } as never,
      checkIn: new Date('2026-05-05'),
      checkOut: new Date('2026-05-05'),
    });
    expect(errors.some((e) => e.type === 'form_invalid' && e.field === 'dates')).toBe(true);
  });

  it('detects date conflict on the same room', () => {
    const existing = [
      buildMinimalReservation({
        room_id: 1,
        check_in_date: '2026-05-03',
        check_out_date: '2026-05-07',
      }),
    ];
    const errors = service.validateBooking(
      {
        room: { id: 1 } as never,
        guest: { firstName: 'Ivan' } as never,
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-05'),
      },
      existing
    );
    expect(errors.some((e) => e.type === 'date_conflict')).toBe(true);
  });

  it('ignores conflict when the overlapping reservation is for a different room', () => {
    const existing = [
      buildMinimalReservation({
        room_id: 2,
        check_in_date: '2026-05-03',
        check_out_date: '2026-05-07',
      }),
    ];
    const errors = service.validateBooking(
      {
        room: { id: 1 } as never,
        guest: { firstName: 'Ivan' } as never,
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-05'),
      },
      existing
    );
    expect(errors.some((e) => e.type === 'date_conflict')).toBe(false);
  });

  it('allows back-to-back bookings (checkout == next checkin)', () => {
    const existing = [
      buildMinimalReservation({
        room_id: 1,
        check_in_date: '2026-04-28',
        check_out_date: '2026-05-01',
      }),
    ];
    const errors = service.validateBooking(
      {
        room: { id: 1 } as never,
        guest: { firstName: 'Ivan' } as never,
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-05'),
      },
      existing
    );
    expect(errors.some((e) => e.type === 'date_conflict')).toBe(false);
  });
});

// ── createFullBooking ─────────────────────────────────────────────────────────

describe('createFullBooking', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(supabase.from).mockImplementation(makeTableMock());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns reservationId on success with a new primary guest', async () => {
    const result = await createFullBooking(baseInput);
    expect(result.reservationId).toBe(42);
  });

  it('skips guest insert when primary guest has existingGuestId', async () => {
    const input: CreateFullBookingInput = {
      ...baseInput,
      guests: [{ firstName: 'Ana', lastName: 'Anić', type: 'adult', existingGuestId: 99 }],
    };

    const result = await createFullBooking(input);
    expect(result.reservationId).toBe(42);

    const calledTables = vi.mocked(supabase.from).mock.calls.map(([t]) => t);
    expect(calledTables).not.toContain('guests');
  });

  it('throws when reservation insert returns an error', async () => {
    const reservationError = { message: 'Duplicate key', code: '23505' };
    vi.mocked(supabase.from).mockImplementation(
      makeTableMock({ reservations: { data: null, error: reservationError } })
    );

    await expect(createFullBooking(baseInput)).rejects.toMatchObject({ message: 'Duplicate key' });
  });

  it('calls reservation_charges insert when charges are non-empty', async () => {
    const chargesInsertSpy = vi.fn().mockReturnValue(makeChain({ data: null, error: null }));
    const defaultMock = makeTableMock();

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reservation_charges') {
        return { insert: chargesInsertSpy } as never;
      }
      return defaultMock(table);
    });

    const inputWithCharges: CreateFullBookingInput = {
      ...baseInput,
      charges: [
        {
          chargeType: 'accommodation',
          description: 'Nightly rate',
          quantity: 4,
          unitPrice: 80,
          total: 320,
          vatRate: 13,
          sortOrder: 1,
        },
      ],
    };

    await createFullBooking(inputWithCharges);
    expect(chargesInsertSpy).toHaveBeenCalledOnce();
  });

  it('skips reservation_charges insert when charges array is empty', async () => {
    await createFullBooking(baseInput); // charges: []

    const calledTables = vi.mocked(supabase.from).mock.calls.map(([t]) => t);
    expect(calledTables).not.toContain('reservation_charges');
  });

  it('creates guest_children entry for a child guest with an age', async () => {
    const childrenInsertSpy = vi.fn().mockReturnValue(makeChain({ data: null, error: null }));
    const defaultMock = makeTableMock();

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'guest_children') {
        return { insert: childrenInsertSpy } as never;
      }
      return defaultMock(table);
    });

    const inputWithChild: CreateFullBookingInput = {
      ...baseInput,
      adultsCount: 1,
      childrenCount: 1,
      guests: [
        { firstName: 'Ivan', lastName: 'Horvat', type: 'adult' },
        { firstName: 'Luka', lastName: 'Horvat', type: 'child', age: 5 },
      ],
    };

    await createFullBooking(inputWithChild);
    expect(childrenInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Luka Horvat', age: 5 })
    );
  });

  it('charges failure is non-fatal — reservation is still returned', async () => {
    const defaultMock = makeTableMock({
      reservation_charges: { data: null, error: { message: 'Charges failed', code: '500' } },
    });
    vi.mocked(supabase.from).mockImplementation(defaultMock);

    // Should resolve, not throw
    const result = await createFullBooking({
      ...baseInput,
      charges: [
        {
          chargeType: 'accommodation',
          description: 'Room',
          quantity: 1,
          unitPrice: 100,
          total: 100,
          vatRate: 13,
          sortOrder: 1,
        },
      ],
    });
    expect(result.reservationId).toBe(42);
  });
});
