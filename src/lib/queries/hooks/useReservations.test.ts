import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import React from 'react';
import { createWrapper, createTestQueryClient, buildReservation } from '@/test/utils';

vi.mock('@/lib/supabase', () => {
  const mockOrderFn = vi.fn();
  const mockSelectFn = vi.fn().mockReturnValue({
    order: mockOrderFn,
  });
  const mockFromFn = vi.fn().mockReturnValue({
    select: mockSelectFn,
  });

  return {
    supabase: {
      from: mockFromFn,
    },
  };
});

vi.mock('@/lib/hotel/services/HotelDataService', () => ({
  hotelDataService: {
    updateReservation: vi.fn(),
    deleteReservation: vi.fn(),
    createReservation: vi.fn(),
    createGuest: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
import { hotelDataService } from '@/lib/hotel/services/HotelDataService';
import {
  useReservations,
  useUpdateReservationStatus,
  useDeleteReservation,
} from './useReservations';

/** Wrapper that exposes the queryClient for state inspection */
function wrapWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── useReservations ───────────────────────────────────────────────────────────

describe('useReservations', () => {
  it('returns reservation list on success', async () => {
    const now = new Date().toISOString();

    const mockThrowOnError = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          room_id: 1,
          guest_id: 1,
          check_in_date: '2026-04-01',
          check_out_date: '2026-04-05',
          number_of_guests: 2,
          adults: 2,
          status_id: 1,
          booking_source_id: 1,
          special_requests: '',
          internal_notes: '',
          booking_date: now,
          created_at: now,
          updated_at: now,
          last_modified: now,
          number_of_nights: 4,
          company_id: null,
          pricing_tier_id: null,
          has_pets: false,
          is_r1: false,
          checked_in_at: null,
          checked_out_at: null,
          label_id: null,
          reservation_statuses: { code: 'confirmed' },
          booking_sources: { code: 'direct' },
          guests: null,
          labels: null,
        },
        {
          id: 2,
          room_id: 2,
          guest_id: 2,
          check_in_date: '2026-04-10',
          check_out_date: '2026-04-15',
          number_of_guests: 3,
          adults: 3,
          status_id: 1,
          booking_source_id: 1,
          special_requests: '',
          internal_notes: '',
          booking_date: now,
          created_at: now,
          updated_at: now,
          last_modified: now,
          number_of_nights: 5,
          company_id: null,
          pricing_tier_id: null,
          has_pets: false,
          is_r1: false,
          checked_in_at: null,
          checked_out_at: null,
          label_id: null,
          reservation_statuses: { code: 'confirmed' },
          booking_sources: { code: 'direct' },
          guests: null,
          labels: null,
        },
      ],
    });

    const mockOrder = vi.fn().mockReturnValue({
      throwOnError: mockThrowOnError,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('surfaces error state when fetch fails', async () => {
    const mockThrowOnError = vi.fn().mockRejectedValue(new Error('DB error'));

    const mockOrder = vi.fn().mockReturnValue({
      throwOnError: mockThrowOnError,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('starts in loading state before data resolves', () => {
    const mockThrowOnError = vi.fn().mockReturnValue(new Promise(() => {}));

    const mockOrder = vi.fn().mockReturnValue({
      throwOnError: mockThrowOnError,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

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
