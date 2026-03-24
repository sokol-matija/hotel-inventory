import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import React from 'react';
import { createWrapper, createTestQueryClient, buildReservation } from '@/test/utils';
import {
  useReservations,
  useUpdateReservationStatus,
  useDeleteReservation,
} from './useReservations';

vi.mock('@/lib/hotel/services/HotelDataService', () => ({
  hotelDataService: {
    getReservations: vi.fn(),
    updateReservation: vi.fn(),
    deleteReservation: vi.fn(),
    createReservation: vi.fn(),
    createGuest: vi.fn(),
  },
}));

import { hotelDataService } from '@/lib/hotel/services/HotelDataService';

/** Wrapper that exposes the queryClient for state inspection */
function wrapWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── useReservations ───────────────────────────────────────────────────────────

describe('useReservations', () => {
  it('returns reservation list on success', async () => {
    const reservations = [buildReservation(), buildReservation()];
    vi.mocked(hotelDataService.getReservations).mockResolvedValue(reservations);

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('surfaces error state when fetch fails', async () => {
    vi.mocked(hotelDataService.getReservations).mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('starts in loading state before data resolves', () => {
    vi.mocked(hotelDataService.getReservations).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── useUpdateReservationStatus (optimistic updates) ───────────────────────────

describe('useUpdateReservationStatus', () => {
  it('applies optimistic update before server confirms', async () => {
    const reservation = buildReservation({ id: 'res-1', status: 'confirmed' });
    vi.mocked(hotelDataService.updateReservation).mockReturnValue(new Promise(() => {}));

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reservations'], [reservation]);

    const { result } = renderHook(() => useUpdateReservationStatus(), {
      wrapper: wrapWith(queryClient),
    });

    result.current.mutate({ id: 'res-1', status: 'checked-in' });

    await waitFor(() => {
      const cached = queryClient.getQueryData<(typeof reservation)[]>(['reservations']);
      expect(cached?.[0].status).toBe('checked-in');
    });
  });

  it('rolls back optimistic update on error', async () => {
    const reservation = buildReservation({ id: 'res-1', status: 'confirmed' });
    vi.mocked(hotelDataService.updateReservation).mockRejectedValue(new Error('Update failed'));

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reservations'], [reservation]);

    const { result } = renderHook(() => useUpdateReservationStatus(), {
      wrapper: wrapWith(queryClient),
    });

    result.current.mutate({ id: 'res-1', status: 'checked-in' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<(typeof reservation)[]>(['reservations']);
    expect(cached?.[0].status).toBe('confirmed');
  });
});

// ── useDeleteReservation (optimistic delete) ──────────────────────────────────

describe('useDeleteReservation', () => {
  it('optimistically removes reservation before server confirms', async () => {
    const r1 = buildReservation({ id: 'res-1' });
    const r2 = buildReservation({ id: 'res-2' });
    vi.mocked(hotelDataService.deleteReservation).mockReturnValue(new Promise(() => {}));

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reservations'], [r1, r2]);

    const { result } = renderHook(() => useDeleteReservation(), {
      wrapper: wrapWith(queryClient),
    });

    result.current.mutate('res-1');

    await waitFor(() => {
      const cached = queryClient.getQueryData<(typeof r1)[]>(['reservations']);
      expect(cached).toHaveLength(1);
      expect(cached?.[0].id).toBe('res-2');
    });
  });

  it('rolls back optimistic delete on error', async () => {
    const r1 = buildReservation({ id: 'res-1' });
    const r2 = buildReservation({ id: 'res-2' });
    vi.mocked(hotelDataService.deleteReservation).mockRejectedValue(new Error('Delete failed'));

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reservations'], [r1, r2]);

    const { result } = renderHook(() => useDeleteReservation(), {
      wrapper: wrapWith(queryClient),
    });

    result.current.mutate('res-1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<(typeof r1)[]>(['reservations']);
    expect(cached).toHaveLength(2);
  });
});
