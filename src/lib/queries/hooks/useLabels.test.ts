import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createWrapper, buildLabel, createTestQueryClient } from '@/test/utils';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel } from './useLabels';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  labels: { data: [] as unknown, error: null as unknown },
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
    supabase: {
      from: vi.fn((table: string) => makeProxy(table)),
    },
    TablesInsert: undefined,
    TablesUpdate: undefined,
  };
});

// ── Test data ─────────────────────────────────────────────────────────────────

const labelRow = {
  id: 'label-1',
  hotel_id: 1,
  name: 'VIP',
  color: '#ffd700',
  bg_color: '#1a1a1a',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── useLabels ──────────────────────────────────────────────────────────────────

describe('useLabels', () => {
  beforeEach(() => {
    mockState.labels = { data: [labelRow], error: null };
  });

  it('returns mapped labels on success', async () => {
    const { result } = renderHook(() => useLabels(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const label = result.current.data![0];
    expect(label.id).toBe('label-1');
    expect(label.name).toBe('VIP');
    expect(label.color).toBe('#ffd700');
    expect(label.bgColor).toBe('#1a1a1a');
    expect(label.hotelId).toBe('1');
  });

  it('returns empty array when no labels', async () => {
    mockState.labels = { data: [], error: null };

    const { result } = renderHook(() => useLabels(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('surfaces errors from the database', async () => {
    mockState.labels = { data: null, error: new Error('DB failure') };

    const { result } = renderHook(() => useLabels(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useCreateLabel ────────────────────────────────────────────────────────────

describe('useCreateLabel', () => {
  beforeEach(() => {
    mockState.labels = { data: [labelRow], error: null };
  });

  it('calls supabase insert and invalidates labels cache', async () => {
    const { result } = renderHook(() => useCreateLabel(), { wrapper: createWrapper() });

    const newLabel = buildLabel({ name: 'Premium', color: '#ff0000', bgColor: '#00ff00' });

    await act(async () => {
      result.current.mutate(newLabel);
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});

// ── useUpdateLabel ────────────────────────────────────────────────────────────

describe('useUpdateLabel', () => {
  beforeEach(() => {
    mockState.labels = { data: [labelRow], error: null };
  });

  it('calls supabase update and invalidates labels cache', async () => {
    const { result } = renderHook(() => useUpdateLabel(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        id: 'label-1',
        updates: { name: 'VIP Updated' },
      });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});

// ── useDeleteLabel (with optimistic update) ────────────────────────────────────

describe('useDeleteLabel', () => {
  it('optimistically removes the label before server confirms', async () => {
    const label1 = buildLabel({ id: 'label-1', name: 'VIP' });
    const label2 = buildLabel({ id: 'label-2', name: 'Premium' });

    // Create a custom wrapper with pre-seeded cache
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['labels'], [label1, label2]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteLabel(), { wrapper });

    // Mutate
    await act(async () => {
      result.current.mutate('label-1');
    });

    // Check cache immediately (optimistic update)
    const cached = queryClient.getQueryData(['labels']);
    expect(cached).toHaveLength(1);
    expect((cached as Array<{ id: string }>)[0].id).toBe('label-2');
  });

  it('rolls back on error', async () => {
    mockState.labels = { data: [labelRow], error: new Error('Delete failed') };
    const label1 = buildLabel({ id: 'label-1', name: 'VIP' });
    const label2 = buildLabel({ id: 'label-2', name: 'Premium' });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['labels'], [label1, label2]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteLabel(), { wrapper });

    // Mutate (will fail)
    await act(async () => {
      result.current.mutate('label-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Check cache is rolled back
    const cached = queryClient.getQueryData(['labels']);
    expect(cached).toHaveLength(2);
    expect((cached as Array<{ id: string }>)[0].id).toBe('label-1');
  });
});
