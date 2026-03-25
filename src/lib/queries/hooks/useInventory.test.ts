import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper, createTestQueryClient } from '@/test/utils';
import { useInventoryWithDetails, useUpdateInventoryQuantity } from './useInventory';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

// ── Mutable per-table mock ────────────────────────────────────────────────────
// vi.hoisted runs before vi.mock so the factory can close over the shared state.

const mockState = vi.hoisted(() => ({
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
  };
});

vi.mock('@/lib/auditLog', () => ({
  auditLog: { quantityUpdated: vi.fn().mockResolvedValue(undefined) },
}));

import { auditLog } from '@/lib/auditLog';

// ── Test data ─────────────────────────────────────────────────────────────────

const inventoryRows = [
  {
    id: 1,
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
  },
];

// ── useInventoryWithDetails ───────────────────────────────────────────────────

describe('useInventoryWithDetails', () => {
  beforeEach(() => {
    mockState.inventory = { data: inventoryRows, error: null };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns inventory entries with item and location data', async () => {
    const { result } = renderHook(() => useInventoryWithDetails(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].item?.name).toBe('Coffee');
    expect(result.current.data?.[0].location?.name).toBe('Main Storage');
    expect(result.current.data?.[0].quantity).toBe(10);
  });

  it('starts in pending/loading state before data resolves', () => {
    const { result } = renderHook(() => useInventoryWithDetails(), { wrapper: createWrapper() });
    expect(result.current.isPending).toBe(true);
  });

  it('surfaces error state when the query throws', async () => {
    mockState.inventory = { data: null, error: new Error('DB connection failed') };

    const { result } = renderHook(() => useInventoryWithDetails(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty array when inventory is empty', async () => {
    mockState.inventory = { data: [], error: null };

    const { result } = renderHook(() => useInventoryWithDetails(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── useUpdateInventoryQuantity ────────────────────────────────────────────────

describe('useUpdateInventoryQuantity', () => {
  beforeEach(() => {
    mockState.inventory = { data: inventoryRows, error: null };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects negative quantity without hitting the database', async () => {
    const { result } = renderHook(() => useUpdateInventoryQuantity(), { wrapper: createWrapper() });

    result.current.mutate({
      inventoryId: 1,
      newQuantity: -5,
      oldQuantity: 10,
      itemName: 'Coffee',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Quantity cannot be negative');
  });

  it('invalidates both inventory and locations caches on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateInventoryQuantity(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    result.current.mutate({ inventoryId: 1, newQuantity: 20, oldQuantity: 10, itemName: 'Coffee' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = spy.mock.calls.map((call) => call[0]);
    const flatKeys = invalidatedKeys.flatMap((k) => (k as { queryKey?: unknown[] }).queryKey ?? []);
    expect(flatKeys).toContain('inventory');
    expect(flatKeys).toContain('locations');
  });

  it('calls audit log after successful update', async () => {
    const { result } = renderHook(() => useUpdateInventoryQuantity(), { wrapper: createWrapper() });

    result.current.mutate({ inventoryId: 1, newQuantity: 15, oldQuantity: 10, itemName: 'Coffee' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(auditLog.quantityUpdated)).toHaveBeenCalledWith(
      1,
      'Coffee',
      10,
      15,
      'Dashboard'
    );
  });
});
