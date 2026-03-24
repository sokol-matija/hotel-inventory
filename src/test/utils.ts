import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { Room, Reservation } from '@/lib/hotel/types';

// ── TanStack Query ────────────────────────────────────────────────────────────

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

export function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  const { rerender, ...result } = render(
    React.createElement(QueryClientProvider, { client: queryClient }, ui)
  );
  return {
    ...result,
    queryClient,
    rerender: (rerenderUi: React.ReactElement) =>
      rerender(React.createElement(QueryClientProvider, { client: queryClient }, rerenderUi)),
  };
}

// ── User Event ────────────────────────────────────────────────────────────────

export function renderWithUser(ui: React.ReactElement, options?: RenderOptions) {
  const user = userEvent.setup();
  return { user, ...render(ui, options) };
}

// ── Supabase Proxy Mock ───────────────────────────────────────────────────────

export function createSupabaseMock(resolvedValue: { data: unknown; error: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(resolvedValue);
      }
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

// ── Type-safe Factories ───────────────────────────────────────────────────────

let _id = 0;

export function buildRoom(overrides: Partial<Room> = {}): Room {
  _id++;
  return {
    id: `room-${_id}`,
    number: `10${_id}`,
    floor: 1,
    type: 'double',
    nameCroatian: `Soba 10${_id}`,
    nameEnglish: `Room 10${_id}`,
    seasonalRates: { A: 80, B: 100, C: 120, D: 150 },
    maxOccupancy: 2,
    isPremium: false,
    amenities: [],
    is_clean: true,
    ...overrides,
  };
}

export function buildReservation(overrides: Partial<Reservation> = {}): Reservation {
  _id++;
  return {
    id: `res-${_id}`,
    roomId: 'room-1',
    guestId: 'guest-1',
    checkIn: new Date('2026-04-01'),
    checkOut: new Date('2026-04-05'),
    numberOfGuests: 2,
    adults: 2,
    children: [],
    status: 'confirmed',
    bookingSource: 'direct',
    specialRequests: '',
    seasonalPeriod: 'A',
    baseRoomRate: 100,
    numberOfNights: 4,
    subtotal: 400,
    childrenDiscounts: 0,
    tourismTax: 8,
    vatAmount: 100,
    petFee: 0,
    parkingFee: 0,
    shortStaySuplement: 0,
    ...overrides,
  } as Reservation;
}
