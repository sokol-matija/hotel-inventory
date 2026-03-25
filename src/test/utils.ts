import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { Reservation } from '@/lib/hotel/types';
import type { Room } from '@/lib/queries/hooks/useRooms';
import type { ItemWithCategory, Category, ActiveItem } from '@/lib/queries/hooks/useItems';
import type { LocationWithStats } from '@/lib/queries/hooks/useLocations';
import type { InventoryWithDetails } from '@/lib/queries/hooks/useInventory';

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

// ── Inventory Factories ───────────────────────────────────────────────────────

export function buildCategory(overrides: Partial<Category> = {}): Category {
  _id++;
  return {
    id: _id,
    name: `Category ${_id}`,
    requires_expiration: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Category;
}

export function buildItemWithCategory(overrides: Partial<ItemWithCategory> = {}): ItemWithCategory {
  _id++;
  return {
    id: _id,
    name: `Item ${_id}`,
    description: null,
    unit: 'pieces',
    price: null,
    minimum_stock: 5,
    is_active: true,
    category_id: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    category: { id: 1, name: 'Food & Beverage', requires_expiration: false },
    inventory_count: 0,
    total_quantity: 0,
    ...overrides,
  } as ItemWithCategory;
}

export function buildActiveItem(overrides: Partial<ActiveItem> = {}): ActiveItem {
  _id++;
  return {
    id: _id,
    name: `Item ${_id}`,
    unit: 'pieces',
    category: { name: 'Food & Beverage', requires_expiration: false },
    ...overrides,
  } as ActiveItem;
}

export function buildInventoryEntry(
  overrides: Partial<InventoryWithDetails> = {}
): InventoryWithDetails {
  _id++;
  return {
    id: _id,
    quantity: 10,
    expiration_date: null,
    cost_per_unit: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    item: {
      id: 1,
      name: 'Coffee',
      description: null,
      unit: 'kg',
      minimum_stock: 5,
      category: { id: 1, name: 'Beverages', requires_expiration: false },
    },
    location: { id: 1, name: 'Main Storage', type: 'storage', is_refrigerated: false },
    ...overrides,
  } as InventoryWithDetails;
}

export function buildLocationWithStats(
  overrides: Partial<LocationWithStats> = {}
): LocationWithStats {
  _id++;
  return {
    id: _id,
    name: `Location ${_id}`,
    type: 'storage',
    description: null,
    is_refrigerated: false,
    inventory_count: 0,
    low_stock_count: 0,
    expiring_count: 0,
    total_items: 0,
    ...overrides,
  };
}

export function buildRoom(overrides: Partial<Room> = {}): Room {
  _id++;
  return {
    id: _id,
    room_number: `10${_id}`,
    floor_number: 1,
    room_types: { code: 'double' },
    name_croatian: `Soba 10${_id}`,
    name_english: `Room 10${_id}`,
    seasonal_rates: { A: 80, B: 100, C: 120, D: 150 },
    max_occupancy: 2,
    is_premium: false,
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
