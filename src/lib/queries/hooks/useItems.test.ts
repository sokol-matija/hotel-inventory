import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper, createTestQueryClient, buildItemWithCategory } from '@/test/utils';
import {
  useItemsWithCounts,
  useActiveItems,
  useCategories,
  useCreateItem,
  useDeleteItem,
  useUpdateItem,
} from './useItems';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  items: { data: [] as unknown, error: null as unknown },
  categories: { data: [] as unknown, error: null as unknown },
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

vi.mock('@/lib/auditLog', () => ({
  auditLog: {
    itemCreated: vi.fn().mockResolvedValue(undefined),
    itemUpdated: vi.fn().mockResolvedValue(undefined),
    itemDeleted: vi.fn().mockResolvedValue(undefined),
  },
}));

import { auditLog } from '@/lib/auditLog';

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapWith(queryClient: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── Test data ─────────────────────────────────────────────────────────────────

const categoryRow = {
  id: 1,
  name: 'Beverages',
  requires_expiration: false,
  created_at: '2026-01-01T00:00:00Z',
};

const itemRow = {
  id: 1,
  name: 'Coffee',
  description: null,
  unit: 'kg',
  price: 10,
  minimum_stock: 5,
  is_active: true,
  category_id: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
  category: categoryRow,
};

// ── useItemsWithCounts ────────────────────────────────────────────────────────

describe('useItemsWithCounts', () => {
  beforeEach(() => {
    mockState.items = { data: [itemRow], error: null };
    mockState.inventory = {
      data: [
        { item_id: 1, quantity: 8 },
        { item_id: 1, quantity: 5 },
      ],
      error: null,
    };
    mockState.categories = { data: [categoryRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns items with computed inventory_count and total_quantity', async () => {
    const { result } = renderHook(() => useItemsWithCounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].inventory_count).toBe(2); // 2 inventory rows for item_id 1
    expect(result.current.data?.[0].total_quantity).toBe(13); // 8 + 5
  });

  it('returns 0 counts when item has no inventory entries', async () => {
    mockState.inventory = { data: [], error: null };

    const { result } = renderHook(() => useItemsWithCounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].inventory_count).toBe(0);
    expect(result.current.data?.[0].total_quantity).toBe(0);
  });

  it('surfaces error state when fetch fails', async () => {
    mockState.items = { data: null, error: new Error('DB error') };

    const { result } = renderHook(() => useItemsWithCounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useActiveItems ────────────────────────────────────────────────────────────

describe('useActiveItems', () => {
  beforeEach(() => {
    mockState.items = {
      data: [
        {
          id: 1,
          name: 'Coffee',
          unit: 'kg',
          category: { name: 'Beverages', requires_expiration: false },
        },
      ],
      error: null,
    };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns active items with category', async () => {
    const { result } = renderHook(() => useActiveItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('Coffee');
    expect(result.current.data?.[0].category).toBeDefined();
  });

  it('does not run when enabled=false', () => {
    const { result } = renderHook(() => useActiveItems(false), { wrapper: createWrapper() });
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCategories ─────────────────────────────────────────────────────────────

describe('useCategories', () => {
  beforeEach(() => {
    mockState.categories = { data: [categoryRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns category list', async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Beverages');
  });
});

// ── useCreateItem ─────────────────────────────────────────────────────────────

describe('useCreateItem', () => {
  beforeEach(() => {
    mockState.items = {
      data: [{ id: 99, name: 'New Item', unit: 'kg', category_id: 1 }],
      error: null,
    };
  });

  afterEach(() => vi.clearAllMocks());

  it('fires mutation and calls audit log on success', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateItem(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({
      name: 'New Item',
      unit: 'kg',
      category_id: 1,
      minimum_stock: 5,
    } as Parameters<typeof result.current.mutate>[0]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(auditLog.itemCreated)).toHaveBeenCalled();
    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('items'))).toBe(true);
  });

  it('invalidates items cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateItem(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({
      name: 'Test',
      unit: 'kg',
      category_id: 1,
      minimum_stock: 1,
    } as Parameters<typeof result.current.mutate>[0]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalled();
  });
});

// ── useDeleteItem ─────────────────────────────────────────────────────────────

describe('useDeleteItem', () => {
  beforeEach(() => {
    mockState.items = { data: [], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('soft-deletes by setting is_active=false and calls audit log', async () => {
    const item = buildItemWithCategory({ id: 5, name: 'Old Coffee' });
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useDeleteItem(), { wrapper: wrapWith(queryClient) });

    result.current.mutate(item);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(auditLog.itemDeleted)).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ name: 'Old Coffee' })
    );
  });

  it('invalidates items cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const item = buildItemWithCategory();

    const { result } = renderHook(() => useDeleteItem(), { wrapper: wrapWith(queryClient) });

    result.current.mutate(item);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalled();
  });
});

// ── useUpdateItem ─────────────────────────────────────────────────────────────

describe('useUpdateItem', () => {
  beforeEach(() => {
    mockState.items = { data: [], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('calls audit log with old and new data', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useUpdateItem(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({
      id: 1,
      data: { name: 'Updated Coffee', unit: 'kg', minimum_stock: 10 },
      oldData: { name: 'Coffee', unit: 'kg', minimum_stock: 5 },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(auditLog.itemUpdated)).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Coffee' }),
      expect.objectContaining({ name: 'Updated Coffee' })
    );
  });

  it('invalidates items cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateItem(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({ id: 1, data: { name: 'Updated' }, oldData: { name: 'Old' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalled();
  });
});
