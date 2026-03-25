import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper } from '@/test/utils';
import { useAvailableOrderItems } from './useOrders';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  items: { data: [] as unknown, error: null as unknown },
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
  };
});

// ── Test data ─────────────────────────────────────────────────────────────────

const itemWithStock = {
  id: 1,
  name: 'Beer',
  description: null,
  unit: 'bottle',
  price: 3.5,
  minimum_stock: 10,
  is_active: true,
  category: { id: 2, name: 'Food & Beverage', requires_expiration: false },
  inventory: [
    {
      location_id: 1,
      quantity: 20,
      expiration_date: null,
      location: { id: 1, name: 'Bar Storage' },
    },
  ],
};

const itemWithNoStock = {
  ...itemWithStock,
  id: 2,
  name: 'Juice',
  inventory: [
    {
      location_id: 1,
      quantity: 0,
      expiration_date: null,
      location: { id: 1, name: 'Bar Storage' },
    },
  ],
};

// ── useAvailableOrderItems ────────────────────────────────────────────────────

describe('useAvailableOrderItems', () => {
  beforeEach(() => {
    mockState.items = { data: [itemWithStock], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns items with computed totalStock and locations on success', async () => {
    const { result } = renderHook(() => useAvailableOrderItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Beer');
    expect(result.current.data?.[0].totalStock).toBe(20);
    expect(result.current.data?.[0].locations).toHaveLength(1);
    expect(result.current.data?.[0].locations[0].locationName).toBe('Bar Storage');
  });

  it('filters out items with zero stock', async () => {
    mockState.items = { data: [itemWithStock, itemWithNoStock], error: null };

    const { result } = renderHook(() => useAvailableOrderItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Only Beer (stock=20) should be returned; Juice (stock=0) should be filtered
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Beer');
  });

  it('returns empty array when no items in stock', async () => {
    mockState.items = { data: [], error: null };

    const { result } = renderHook(() => useAvailableOrderItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('surfaces error state when fetch fails (throwOnError)', async () => {
    mockState.items = { data: null, error: new Error('DB timeout') };

    const { result } = renderHook(() => useAvailableOrderItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
