import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper, createTestQueryClient } from '@/test/utils';
import {
  useReservationCharges,
  useCreateCharge,
  useDeleteCharge,
  useReplaceCharges,
} from './useReservationCharges';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  reservation_charges: { data: [] as unknown, error: null as unknown },
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

const chargeRow = {
  id: 1,
  reservation_id: 42,
  charge_type: 'accommodation',
  description: 'Room charge',
  quantity: 3,
  unit_price: 100,
  total: 300,
  vat_rate: 0.13,
  stay_date: '2026-04-01',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
};

// ── useReservationCharges ─────────────────────────────────────────────────────

describe('useReservationCharges', () => {
  beforeEach(() => {
    mockState.reservation_charges = { data: [chargeRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns charges mapped to domain model on success', async () => {
    const { result } = renderHook(() => useReservationCharges(42), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].reservationId).toBe(42);
    expect(result.current.data?.[0].chargeType).toBe('accommodation');
    expect(result.current.data?.[0].total).toBe(300);
  });

  it('surfaces error state when query fails (proves throwOnError works)', async () => {
    mockState.reservation_charges = { data: null, error: new Error('DB error') };

    const { result } = renderHook(() => useReservationCharges(42), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('does not run when reservationId is undefined', () => {
    const { result } = renderHook(() => useReservationCharges(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('does not run when reservationId is 0', () => {
    const { result } = renderHook(() => useReservationCharges(0), { wrapper: createWrapper() });
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCreateCharge ───────────────────────────────────────────────────────────

describe('useCreateCharge', () => {
  beforeEach(() => {
    mockState.reservation_charges = { data: chargeRow, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('invalidates reservation charges cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCharge(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({
      reservation_id: 42,
      charge_type: 'accommodation',
      description: 'Room charge',
      quantity: 3,
      unit_price: 100,
      total: 300,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('reservationCharges'))).toBe(true);
  });

  it('also invalidates reservations cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCharge(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({
      reservation_id: 42,
      charge_type: 'accommodation',
      description: 'Room charge',
      quantity: 1,
      unit_price: 100,
      total: 100,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('reservations'))).toBe(true);
  });
});

// ── useDeleteCharge ───────────────────────────────────────────────────────────

describe('useDeleteCharge', () => {
  beforeEach(() => {
    mockState.reservation_charges = { data: null, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('invalidates charges and reservations cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteCharge(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({ id: 1, reservationId: 42 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('reservationCharges'))).toBe(true);
    expect(keys.some((k) => k?.includes('reservations'))).toBe(true);
  });
});

// ── useReplaceCharges ─────────────────────────────────────────────────────────

describe('useReplaceCharges', () => {
  beforeEach(() => {
    mockState.reservation_charges = { data: [chargeRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('replaces charges and invalidates cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReplaceCharges(), { wrapper: wrapWith(queryClient) });

    result.current.mutate({
      reservationId: 42,
      charges: [
        {
          charge_type: 'accommodation',
          description: 'Room charge',
          quantity: 2,
          unit_price: 150,
          total: 300,
        },
      ],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('reservationCharges'))).toBe(true);
  });

  it('handles empty charges list without error', async () => {
    const { result } = renderHook(() => useReplaceCharges(), { wrapper: createWrapper() });

    result.current.mutate({ reservationId: 42, charges: [] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
