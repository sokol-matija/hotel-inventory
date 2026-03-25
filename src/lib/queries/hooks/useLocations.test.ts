import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper, createTestQueryClient } from '@/test/utils';
import {
  useLocationsWithStats,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from './useLocations';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  locations: { data: [] as unknown, error: null as unknown },
  inventory: { data: [] as unknown, error: null as unknown },
}));

vi.mock('@/lib/supabase', () => {
  function makeProxy(table: string): unknown {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string | symbol) {
        if (prop === 'then') {
          const record = (mockState as Record<string, { data: unknown; error: unknown }>)[
            table
          ] ?? {
            data: [],
            error: null,
          };
          if (record.error !== null) {
            return (_resolve: unknown, reject?: (e: unknown) => void) => {
              if (typeof reject === 'function') reject(record.error);
            };
          }
          return (resolve: (v: unknown) => void) => resolve({ data: record.data });
        }
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    return new Proxy({}, handler);
  }

  return {
    supabase: { from: vi.fn((table: string) => makeProxy(table)) },
    TablesInsert: undefined,
    TablesUpdate: undefined,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapWith(queryClient: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── Test data ─────────────────────────────────────────────────────────────────

const locationRow = {
  id: 1,
  name: 'Main Storage',
  type: 'storage',
  description: null,
  is_refrigerated: false,
  created_at: '2026-01-01T00:00:00Z',
};

const sevenDaysFromNow = new Date();
sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 6); // within 7 days

const inventoryRows = [
  { location_id: 1, quantity: 10, expiration_date: null, item: { minimum_stock: 5 } },
  { location_id: 1, quantity: 3, expiration_date: null, item: { minimum_stock: 5 } },
  {
    location_id: 1,
    quantity: 1,
    expiration_date: sevenDaysFromNow.toISOString(),
    item: { minimum_stock: 2 },
  },
];

// ── useLocationsWithStats ─────────────────────────────────────────────────────

describe('useLocationsWithStats', () => {
  beforeEach(() => {
    mockState.locations = { data: [locationRow], error: null };
    mockState.inventory = { data: inventoryRows, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns location with computed stats', async () => {
    const { result } = renderHook(() => useLocationsWithStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const loc = result.current.data![0];
    expect(loc.name).toBe('Main Storage');
    expect(loc.inventory_count).toBe(3); // 3 inventory rows for location 1
    expect(loc.total_items).toBe(14); // 10 + 3 + 1
  });

  it('computes low_stock_count for items below minimum', async () => {
    const { result } = renderHook(() => useLocationsWithStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // quantity 3 <= minimum_stock 5, quantity 1 <= minimum_stock 2 → 2 low stock
    expect(result.current.data![0].low_stock_count).toBe(2);
  });

  it('computes expiring_count for items expiring within 7 days', async () => {
    const { result } = renderHook(() => useLocationsWithStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 1 item has expiration within 7 days
    expect(result.current.data![0].expiring_count).toBe(1);
  });

  it('returns empty array when no locations', async () => {
    mockState.locations = { data: [], error: null };
    mockState.inventory = { data: [], error: null };

    const { result } = renderHook(() => useLocationsWithStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns zero stats for location with no inventory', async () => {
    mockState.locations = { data: [locationRow], error: null };
    mockState.inventory = { data: [], error: null };

    const { result } = renderHook(() => useLocationsWithStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const loc = result.current.data![0];
    expect(loc.inventory_count).toBe(0);
    expect(loc.low_stock_count).toBe(0);
    expect(loc.expiring_count).toBe(0);
    expect(loc.total_items).toBe(0);
  });

  it('surfaces error when fetch fails', async () => {
    mockState.locations = { data: null, error: new Error('Connection failed') };

    const { result } = renderHook(() => useLocationsWithStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useCreateLocation ─────────────────────────────────────────────────────────

describe('useCreateLocation', () => {
  beforeEach(() => {
    mockState.locations = { data: [], error: null };
    mockState.inventory = { data: [], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('fires mutation and invalidates locations cache', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateLocation(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({ name: 'New Storage', type: 'storage', description: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalled();
  });
});

// ── useUpdateLocation ─────────────────────────────────────────────────────────

describe('useUpdateLocation', () => {
  beforeEach(() => {
    mockState.locations = { data: [], error: null };
    mockState.inventory = { data: [], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('fires mutation and invalidates locations cache', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateLocation(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({ id: 1, updates: { name: 'Updated Storage' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalled();
  });
});

// ── useDeleteLocation ─────────────────────────────────────────────────────────

describe('useDeleteLocation', () => {
  beforeEach(() => {
    mockState.locations = { data: [], error: null };
    mockState.inventory = { data: [], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('fires mutation with location id and invalidates cache', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteLocation(), { wrapper: wrapWith(queryClient) });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalled();
  });
});
