import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper, createTestQueryClient } from '@/test/utils';
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from './useCompanies';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  companies: { data: [] as unknown, error: null as unknown },
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

const companyRow = {
  id: 1,
  name: 'Acme Corp',
  oib: '12345678901',
  address: 'Main Street 1',
  city: 'Zagreb',
  postal_code: '10000',
  country: 'Croatia',
  contact_person: 'John Doe',
  email: 'john@acme.com',
  phone: '+385991234567',
  fax: null,
  pricing_tier_id: null,
  room_allocation_guarantee: null,
  is_active: true,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── useCompanies ──────────────────────────────────────────────────────────────

describe('useCompanies', () => {
  beforeEach(() => {
    mockState.companies = { data: [companyRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns companies mapped to domain model on success', async () => {
    const { result } = renderHook(() => useCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Acme Corp');
    expect(result.current.data?.[0].city).toBe('Zagreb');
    expect(result.current.data?.[0].id).toBe(1);
  });

  it('surfaces error state when query fails (proves throwOnError works)', async () => {
    mockState.companies = { data: null, error: new Error('DB error') };

    const { result } = renderHook(() => useCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty array when no companies exist', async () => {
    mockState.companies = { data: [], error: null };

    const { result } = renderHook(() => useCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── useCreateCompany ──────────────────────────────────────────────────────────

describe('useCreateCompany', () => {
  beforeEach(() => {
    mockState.companies = { data: companyRow, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('invalidates companies cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCompany(), { wrapper: wrapWith(queryClient) });

    // useCreateCompany now accepts raw DB insert shape (flat fields)
    result.current.mutate({
      name: 'New Corp',
      oib: '98765432100',
      address: 'Side Street 2',
      city: 'Split',
      postal_code: '21000',
      country: 'Croatia',
      contact_person: 'Jane Smith',
      email: 'jane@newcorp.com',
      phone: '',
      is_active: true,
      notes: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('companies'))).toBe(true);
  });
});

// ── useUpdateCompany ──────────────────────────────────────────────────────────

describe('useUpdateCompany', () => {
  beforeEach(() => {
    mockState.companies = { data: companyRow, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('invalidates companies cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateCompany(), { wrapper: wrapWith(queryClient) });

    // useUpdateCompany now accepts numeric id
    result.current.mutate({ id: 1, updates: { name: 'Updated Corp' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('companies'))).toBe(true);
  });
});

// ── useDeleteCompany ──────────────────────────────────────────────────────────

describe('useDeleteCompany', () => {
  beforeEach(() => {
    mockState.companies = { data: null, error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('invalidates companies cache on settled', async () => {
    const queryClient = createTestQueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteCompany(), { wrapper: wrapWith(queryClient) });

    // useDeleteCompany now accepts numeric id
    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown[] }).queryKey);
    expect(keys.some((k) => k?.includes('companies'))).toBe(true);
  });

  it('rolls back optimistic update on error', async () => {
    mockState.companies = { data: null, error: new Error('Delete failed') };

    const queryClient = createTestQueryClient();
    // Pre-populate cache with two companies (using numeric ids matching new DB row type)
    queryClient.setQueryData(
      ['companies'],
      [
        { id: 1, name: 'Acme Corp', is_active: true },
        { id: 2, name: 'Beta Corp', is_active: true },
      ]
    );

    const { result } = renderHook(() => useDeleteCompany(), {
      wrapper: wrapWith(queryClient),
    });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be restored to previous state
    const cached = queryClient.getQueryData(['companies']) as Array<{ id: string }>;
    expect(cached).toHaveLength(2);
  });
});
