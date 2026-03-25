import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper, createTestQueryClient } from '@/test/utils';
import {
  usePricingTiers,
  useCreatePricingTier,
  useUpdatePricingTier,
  useDeletePricingTier,
} from './usePricingTiers';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  pricing_tiers: { data: [] as unknown, error: null as unknown },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapWith(queryClient: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── Test data ─────────────────────────────────────────────────────────────────

const pricingTierRow = {
  id: 1,
  name: 'Standard',
  description: 'Standard pricing',
  discount_percentage: 0,
  is_default: true,
  is_active: true,
  minimum_stay: null,
  valid_from: '2026-01-01',
  valid_to: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── usePricingTiers ───────────────────────────────────────────────────────────

describe('usePricingTiers', () => {
  beforeEach(() => {
    mockState.pricing_tiers = { data: [pricingTierRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns pricing tiers mapped to domain model on success', async () => {
    const { result } = renderHook(() => usePricingTiers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Standard');
    expect(result.current.data?.[0].isDefault).toBe(true);
    expect(result.current.data?.[0].id).toBe(1);
  });

  it('surfaces error state when query fails (proves throwOnError works)', async () => {
    mockState.pricing_tiers = { data: null, error: new Error('DB error') };

    const { result } = renderHook(() => usePricingTiers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty array when no pricing tiers exist', async () => {
    mockState.pricing_tiers = { data: [], error: null };

    const { result } = renderHook(() => usePricingTiers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── useCreatePricingTier ──────────────────────────────────────────────────────

describe('useCreatePricingTier', () => {
  beforeEach(() => {
    mockState.pricing_tiers = { data: pricingTierRow, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('invalidates pricing tiers cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePricingTier(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({
      name: 'Premium',
      description: 'Premium tier',
      discountPercentage: 10,
      isDefault: false,
      isActive: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('pricingTiers'))).toBe(true);
  });
});

// ── useUpdatePricingTier ──────────────────────────────────────────────────────

describe('useUpdatePricingTier', () => {
  beforeEach(() => {
    mockState.pricing_tiers = { data: pricingTierRow, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('invalidates pricing tiers cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdatePricingTier(), {
      wrapper: wrapWith(queryClient),
    });

    result.current.mutate({ id: 1, updates: { name: 'Updated Standard' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('pricingTiers'))).toBe(true);
  });
});

// ── useDeletePricingTier ──────────────────────────────────────────────────────

describe('useDeletePricingTier', () => {
  beforeEach(() => {
    mockState.pricing_tiers = { data: null, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('invalidates pricing tiers cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeletePricingTier(), {
      wrapper: wrapWith(queryClient),
    });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('pricingTiers'))).toBe(true);
  });

  it('rolls back optimistic update on error', async () => {
    mockState.pricing_tiers = { data: null, error: new Error('Delete failed') };

    const queryClient = createTestQueryClient();
    // Pre-populate cache with two tiers
    queryClient.setQueryData(
      ['pricingTiers'],
      [
        { id: 1, name: 'Standard' },
        { id: 2, name: 'Premium' },
      ]
    );

    const { result } = renderHook(() => useDeletePricingTier(), {
      wrapper: wrapWith(queryClient),
    });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be restored
    const cached = queryClient.getQueryData(['pricingTiers']) as Array<{ id: number }>;
    expect(cached).toHaveLength(2);
  });
});
