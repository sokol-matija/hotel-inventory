import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateBookingForm } from './useCreateBookingForm';
import type { UseCreateBookingFormParams } from './useCreateBookingForm';
import { buildRoom, buildGuest, createWrapper } from '@/test/utils';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  generateCharges: vi.fn().mockResolvedValue([]),
  createUnallocatedReservation: vi.fn().mockResolvedValue({ success: true }),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  notifyInfo: vi.fn(),
  sendRoom401: vi.fn().mockResolvedValue(true),
  rooms: [] as ReturnType<typeof buildRoom>[],
  companies: [] as unknown[],
}));

// Supabase: chainable proxy that resolves to { data: { id: 1 }, error: null }
vi.mock('@/lib/supabase', () => {
  const makeChain = (resolvedData: unknown = { id: 1 }) => {
    const proxy = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) => resolve({ data: resolvedData, error: null });
          }
          return () => proxy;
        },
      }
    );
    return proxy;
  };
  return {
    supabase: new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') return undefined;
          return () => makeChain();
        },
      }
    ),
  };
});

vi.mock('@/lib/queries/hooks/useRooms', () => ({
  useRooms: () => ({ data: mocks.rooms }),
}));

vi.mock('@/lib/queries/hooks/useCompanies', () => ({
  useCompanies: () => ({ data: mocks.companies }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  };
});

vi.mock('@/lib/hotel/services/UnifiedPricingService', () => ({
  unifiedPricingService: { generateCharges: mocks.generateCharges },
}));

vi.mock('@/lib/hotel/constants', () => ({ HOTEL_ID: 'test-hotel-id' }));

vi.mock('@/lib/hotel/services/VirtualRoomService', () => ({
  virtualRoomService: {
    createUnallocatedReservation: mocks.createUnallocatedReservation,
    isVirtualRoom: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('@/lib/notifications', () => ({
  default: {
    success: mocks.notifySuccess,
    error: mocks.notifyError,
    info: mocks.notifyInfo,
    warning: vi.fn(),
  },
}));

vi.mock('@/lib/ntfy', () => ({
  sendRoom401BookingNotification: mocks.sendRoom401,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeParams(
  overrides: Partial<UseCreateBookingFormParams> = {}
): UseCreateBookingFormParams {
  return {
    room: null,
    currentDate: new Date('2026-04-01'),
    preSelectedDates: null,
    allowRoomSelection: false,
    unallocatedMode: false,
    onClose: vi.fn(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCreateBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rooms = [];
    mocks.companies = [];
  });

  // ── Initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('creates one empty adult guest on mount', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      expect(result.current.bookingGuests).toHaveLength(1);
      expect(result.current.bookingGuests[0].type).toBe('adult');
    });

    it('initializes dates from preSelectedDates when provided', () => {
      const checkIn = new Date('2026-05-01');
      const checkOut = new Date('2026-05-05');
      const { result } = renderHook(
        () => useCreateBookingForm(makeParams({ preSelectedDates: { checkIn, checkOut } })),
        { wrapper: createWrapper() }
      );
      expect(result.current.checkInDate).toEqual(checkIn);
      expect(result.current.checkOutDate).toEqual(checkOut);
    });

    it('initializes isUnallocated from unallocatedMode prop', () => {
      const { result } = renderHook(
        () => useCreateBookingForm(makeParams({ unallocatedMode: true })),
        { wrapper: createWrapper() }
      );
      expect(result.current.isUnallocated).toBe(true);
    });

    it('sets selectedRoom from room prop', () => {
      const room = buildRoom({ room_number: '201' });
      const { result } = renderHook(() => useCreateBookingForm(makeParams({ room })), {
        wrapper: createWrapper(),
      });
      expect(result.current.selectedRoom).toEqual(room);
    });

    it('exposes hotelId constant', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      expect(result.current.hotelId).toBe('test-hotel-id');
    });
  });

  // ── Guest management ────────────────────────────────────────────────────────

  describe('addAdult', () => {
    it('appends an adult guest', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      act(() => result.current.addAdult());
      expect(result.current.bookingGuests).toHaveLength(2);
      expect(result.current.bookingGuests[1].type).toBe('adult');
    });

    it('does not exceed selectedRoom max_occupancy', () => {
      const room = buildRoom({ max_occupancy: 1 });
      const { result } = renderHook(() => useCreateBookingForm(makeParams({ room })), {
        wrapper: createWrapper(),
      });
      act(() => result.current.addAdult());
      // already at max (1 guest = max_occupancy 1)
      expect(result.current.bookingGuests).toHaveLength(1);
    });
  });

  describe('addChild', () => {
    it('appends a child guest with default age 12', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      act(() => result.current.addChild());
      const child = result.current.bookingGuests[1];
      expect(child.type).toBe('child');
      expect(child.age).toBe(12);
    });
  });

  describe('removeGuest', () => {
    it('removes a non-primary guest', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      act(() => result.current.addAdult());
      const secondGuestId = result.current.bookingGuests[1].id;
      act(() => result.current.removeGuest(secondGuestId));
      expect(result.current.bookingGuests).toHaveLength(1);
    });

    it('does not remove the last guest', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const firstId = result.current.bookingGuests[0].id;
      act(() => result.current.removeGuest(firstId));
      expect(result.current.bookingGuests).toHaveLength(1);
    });
  });

  describe('updateGuest', () => {
    it('updates a specific field on the guest', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'firstName', 'Anna'));
      expect(result.current.bookingGuests[0].firstName).toBe('Anna');
    });

    it('recomputes fullName when firstName or lastName changes', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'firstName', 'Anna'));
      act(() => result.current.updateGuest(guestId, 'lastName', 'Smith'));
      expect(result.current.bookingGuests[0].fullName).toBe('Anna Smith');
    });

    it('sets default age when guest type changes to child', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'type', 'child'));
      expect(result.current.bookingGuests[0].age).toBe(12);
    });

    it('clears age when guest type changes to adult', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'type', 'child'));
      act(() => result.current.updateGuest(guestId, 'type', 'adult'));
      expect(result.current.bookingGuests[0].age).toBeUndefined();
    });
  });

  describe('handleSelectExistingGuest', () => {
    it('replaces the guest at the specified index with existing guest data', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const existing = buildGuest({ first_name: 'Maria', last_name: 'Kovač', id: 42 });
      act(() => result.current.handleSelectExistingGuest(existing, 0));
      expect(result.current.bookingGuests[0].firstName).toBe('Maria');
      expect(result.current.bookingGuests[0].lastName).toBe('Kovač');
    });

    it('marks the replaced guest as isExisting with existingGuestId', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const existing = buildGuest({ id: 99 });
      act(() => result.current.handleSelectExistingGuest(existing, 0));
      expect(result.current.bookingGuests[0].isExisting).toBe(true);
      expect(result.current.bookingGuests[0].existingGuestId).toBe(99);
    });
  });

  // ── Derived values ──────────────────────────────────────────────────────────

  describe('derived values', () => {
    it('counts adults and children correctly', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      act(() => result.current.addChild());
      act(() => result.current.addAdult());
      expect(result.current.adultsCount).toBe(2);
      expect(result.current.childrenCount).toBe(1);
    });

    it('computes numberOfNights from dates', () => {
      const { result } = renderHook(
        () =>
          useCreateBookingForm(
            makeParams({
              preSelectedDates: {
                checkIn: new Date('2026-05-10'),
                checkOut: new Date('2026-05-15'),
              },
            })
          ),
        { wrapper: createWrapper() }
      );
      expect(result.current.numberOfNights).toBe(5);
    });
  });

  // ── validateForm ────────────────────────────────────────────────────────────

  describe('validateForm', () => {
    it('returns no errors for a valid allocation-free booking', () => {
      const { result } = renderHook(
        () => useCreateBookingForm(makeParams({ unallocatedMode: true })),
        { wrapper: createWrapper() }
      );
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'firstName', 'John'));
      act(() => result.current.updateGuest(guestId, 'lastName', 'Doe'));
      expect(result.current.validateForm()).toHaveLength(0);
    });

    it('errors when check-out is not after check-in', () => {
      const { result } = renderHook(
        () =>
          useCreateBookingForm(
            makeParams({
              preSelectedDates: {
                checkIn: new Date('2026-05-10'),
                checkOut: new Date('2026-05-08'),
              },
            })
          ),
        { wrapper: createWrapper() }
      );
      const errors = result.current.validateForm();
      expect(errors).toContain('Check-out date must be after check-in date');
    });

    it('errors when primary guest first name is missing', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      // last name only, no first name
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'lastName', 'Doe'));
      const errors = result.current.validateForm();
      expect(errors).toContain('Primary guest first name is required');
    });

    it('errors when primary guest last name is missing', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'firstName', 'John'));
      const errors = result.current.validateForm();
      expect(errors).toContain('Primary guest last name is required');
    });

    it('errors when no room selected and not unallocated', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'firstName', 'John'));
      act(() => result.current.updateGuest(guestId, 'lastName', 'Doe'));
      const errors = result.current.validateForm();
      expect(errors).toContain('Please select a room');
    });

    it('errors when guests exceed room max_occupancy', async () => {
      const room = buildRoom({ max_occupancy: 1 });
      const { result } = renderHook(() => useCreateBookingForm(makeParams({ room })), {
        wrapper: createWrapper(),
      });
      const guestId = result.current.bookingGuests[0].id;
      await act(async () => result.current.updateGuest(guestId, 'firstName', 'John'));
      await act(async () => result.current.updateGuest(guestId, 'lastName', 'Doe'));
      // Force a second guest without going through addAdult (which is blocked by max)
      await act(async () => result.current.setSelectedRoom(buildRoom({ max_occupancy: 5 })));
      await act(async () => result.current.addAdult());
      await act(async () => result.current.setSelectedRoom(room)); // restore tight room
      let errors: string[] = [];
      await act(async () => {
        errors = result.current.validateForm();
      });
      const capacityError = errors.find((e) => e.includes('exceeds room capacity'));
      expect(capacityError).toBeTruthy();
    });

    it('errors when company billing selected without a company', () => {
      const { result } = renderHook(() => useCreateBookingForm(makeParams()), {
        wrapper: createWrapper(),
      });
      const guestId = result.current.bookingGuests[0].id;
      act(() => result.current.updateGuest(guestId, 'firstName', 'John'));
      act(() => result.current.updateGuest(guestId, 'lastName', 'Doe'));
      act(() => result.current.setIsCompanyBilling(true));
      const errors = result.current.validateForm();
      expect(errors).toContain('Please select a company for R1 billing');
    });
  });
});
