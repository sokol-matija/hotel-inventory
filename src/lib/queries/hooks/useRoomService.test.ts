import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper, createTestQueryClient } from '@/test/utils';
import {
  useFoodAndBeverageItems,
  useProcessRoomServiceOrder,
  useFridgeItems,
} from './useRoomService';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

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

vi.mock('@/lib/hotel/orderService', () => ({
  processRoomServiceOrder: vi.fn().mockResolvedValue({
    id: 'order-1',
    orderNumber: 'RS20260101120000001',
    orderedAt: new Date(),
  }),
}));

import { processRoomServiceOrder } from '@/lib/hotel/orderService';

// ── Test data ─────────────────────────────────────────────────────────────────

const itemWithStock = {
  id: 1,
  name: 'Pasta',
  description: null,
  unit: 'portion',
  price: 8.5,
  minimum_stock: 5,
  is_active: true,
  category: { id: 3, name: 'Food & Beverage', requires_expiration: false },
  inventory: [
    {
      location_id: 1,
      quantity: 15,
      expiration_date: null,
      location: { id: 1, name: 'Kitchen' },
    },
  ],
};

// ── useFoodAndBeverageItems ───────────────────────────────────────────────────

describe('useFoodAndBeverageItems', () => {
  beforeEach(() => {
    mockState.items = { data: [itemWithStock], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns food and beverage items with stock on success', async () => {
    const { result } = renderHook(() => useFoodAndBeverageItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Pasta');
    expect(result.current.data?.[0].totalStock).toBe(15);
    expect(result.current.data?.[0].category.name).toBe('Food & Beverage');
  });

  it('filters out items with zero stock', async () => {
    mockState.items = {
      data: [
        {
          ...itemWithStock,
          id: 2,
          name: 'Empty Item',
          inventory: [
            {
              location_id: 1,
              quantity: 0,
              expiration_date: null,
              location: { id: 1, name: 'Kitchen' },
            },
          ],
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useFoodAndBeverageItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('surfaces error state when fetch fails (throwOnError)', async () => {
    mockState.items = { data: null, error: new Error('DB error') };

    const { result } = renderHook(() => useFoodAndBeverageItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ── useProcessRoomServiceOrder ────────────────────────────────────────────────

describe('useProcessRoomServiceOrder', () => {
  beforeEach(() => {
    mockState.items = { data: [itemWithStock], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('calls processRoomServiceOrder and invalidates both caches on settled', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useProcessRoomServiceOrder(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    const orderData = {
      roomId: 'room-101',
      roomNumber: '101',
      guestName: 'Marko Marković',
      items: [
        {
          id: 'item-1',
          itemId: 1,
          itemName: 'Pasta',
          category: 'Food & Beverage',
          price: 8.5,
          quantity: 2,
          totalPrice: 17.0,
          unit: 'portion',
          availableStock: 15,
        },
      ],
      subtotal: 15.04,
      tax: 1.96,
      totalAmount: 17.0,
      paymentMethod: 'immediate_cash' as const,
      paymentStatus: 'paid' as const,
      orderStatus: 'delivered' as const,
      notes: '',
      orderedBy: 'Staff',
      printedReceipt: false,
    };

    result.current.mutate(orderData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(processRoomServiceOrder)).toHaveBeenCalledWith(orderData);

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey?: unknown[] }).queryKey
    );
    const flatKeys = invalidatedKeys.flatMap((k) => k ?? []);
    expect(flatKeys).toContain('roomService');
    expect(flatKeys).toContain('inventory');
  });
});

// ── useFridgeItems ────────────────────────────────────────────────────────────

const fridgeItem = {
  id: 10,
  name: 'Mineral Water',
  description: 'Still water',
  unit: 'bottle',
  price: 2.5,
  minimum_stock: 10,
  is_active: true,
  category: { id: 4, name: 'Drinks', requires_expiration: false },
  inventory: [
    {
      id: 1,
      location_id: 2,
      quantity: 24,
      expiration_date: null,
      location: { id: 2, name: 'Bar Fridge', is_refrigerated: true },
    },
  ],
};

describe('useFridgeItems', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns items that have refrigerated inventory with stock', async () => {
    mockState.items = { data: [fridgeItem], error: null };

    const { result } = renderHook(() => useFridgeItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Mineral Water');
    expect(result.current.data?.[0].totalStock).toBe(24);
  });

  it('excludes items with only non-refrigerated inventory', async () => {
    mockState.items = {
      data: [
        {
          ...fridgeItem,
          id: 11,
          name: 'Olive Oil',
          inventory: [
            {
              id: 2,
              location_id: 1,
              quantity: 5,
              expiration_date: null,
              location: { id: 1, name: 'Main Storage', is_refrigerated: false },
            },
          ],
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useFridgeItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('excludes refrigerated entries with zero quantity', async () => {
    mockState.items = {
      data: [
        {
          ...fridgeItem,
          inventory: [
            {
              id: 1,
              location_id: 2,
              quantity: 0,
              expiration_date: null,
              location: { id: 2, name: 'Bar Fridge', is_refrigerated: true },
            },
          ],
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useFridgeItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('counts only refrigerated stock in totalStock when mixed locations', async () => {
    mockState.items = {
      data: [
        {
          ...fridgeItem,
          inventory: [
            {
              id: 1,
              location_id: 1,
              quantity: 10,
              expiration_date: null,
              location: { id: 1, name: 'Storage', is_refrigerated: false },
            },
            {
              id: 2,
              location_id: 2,
              quantity: 8,
              expiration_date: null,
              location: { id: 2, name: 'Bar Fridge', is_refrigerated: true },
            },
          ],
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useFridgeItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].totalStock).toBe(8);
  });

  it('returns empty array when no items have refrigerated stock', async () => {
    mockState.items = { data: [], error: null };

    const { result } = renderHook(() => useFridgeItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('does not run query when enabled is false', () => {
    mockState.items = { data: [fridgeItem], error: null };

    const { result } = renderHook(() => useFridgeItems(false), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces error state when fetch fails', async () => {
    mockState.items = { data: null, error: new Error('Fridge fetch failed') };

    const { result } = renderHook(() => useFridgeItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
