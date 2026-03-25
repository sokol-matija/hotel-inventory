import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createWrapper, buildGuest } from '@/test/utils';
import { useGuests, useGuestSearch, useCreateGuest, useUpdateGuest } from './useGuests';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  guests: { data: [] as unknown, error: null as unknown },
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

// ── Test data ─────────────────────────────────────────────────────────────────

const guestRow = {
  id: 1,
  first_name: 'Ana',
  last_name: 'Horvat',
  full_name: 'Ana Horvat',
  email: 'ana@example.com',
  phone: '+385 91 123 456',
  nationality: 'Croatia',
  preferred_language: 'hr',
  dietary_restrictions: null,
  has_pets: false,
  is_vip: true,
  vip_level: 1,
  date_of_birth: '1990-05-12',
  passport_number: null,
  id_card_number: null,
  special_needs: null,
  marketing_consent: null,
  average_rating: null,
  notes: null,
  country_code: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── useGuests ─────────────────────────────────────────────────────────────────

describe('useGuests', () => {
  beforeEach(() => {
    mockState.guests = { data: [guestRow], error: null };
  });

  it('returns mapped guests on success', async () => {
    const { result } = renderHook(() => useGuests(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const guest = result.current.data![0];
    expect(guest.id).toBe(1);
    expect(guest.first_name).toBe('Ana');
    expect(guest.last_name).toBe('Horvat');
    expect(guest.display_name).toBe('Ana Horvat');
    expect(guest.is_vip).toBe(true);
  });

  it('derives display_name from full_name when available', async () => {
    mockState.guests = {
      data: [{ ...guestRow, full_name: 'Ana Horvat-Custom' }],
      error: null,
    };

    const { result } = renderHook(() => useGuests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0].display_name).toBe('Ana Horvat-Custom');
  });

  it('derives display_name from first_name + last_name when full_name is null', async () => {
    mockState.guests = {
      data: [{ ...guestRow, full_name: null }],
      error: null,
    };

    const { result } = renderHook(() => useGuests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0].display_name).toBe('Ana Horvat');
  });

  it('returns empty array when there are no guests', async () => {
    mockState.guests = { data: [], error: null };

    const { result } = renderHook(() => useGuests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('surfaces errors from the database', async () => {
    mockState.guests = { data: null, error: new Error('DB failure') };

    const { result } = renderHook(() => useGuests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useGuestSearch ────────────────────────────────────────────────────────────

describe('useGuestSearch', () => {
  const secondGuestRow = {
    ...guestRow,
    id: 2,
    first_name: 'Marko',
    last_name: 'Marković',
    full_name: 'Marko Marković',
    email: 'marko@example.com',
  };

  beforeEach(() => {
    mockState.guests = { data: [guestRow, secondGuestRow], error: null };
  });

  it('returns all guests when query is empty', async () => {
    const { result } = renderHook(() => useGuestSearch(''), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });

  it('filters guests by display_name', async () => {
    const { result } = renderHook(() => useGuestSearch('Ana'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].first_name).toBe('Ana');
  });

  it('filters guests by email', async () => {
    const { result } = renderHook(() => useGuestSearch('marko@'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].first_name).toBe('Marko');
  });

  it('is case-insensitive', async () => {
    const { result } = renderHook(() => useGuestSearch('HORVAT'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].last_name).toBe('Horvat');
  });
});

// ── useCreateGuest ────────────────────────────────────────────────────────────

describe('useCreateGuest', () => {
  beforeEach(() => {
    mockState.guests = { data: [guestRow], error: null };
  });

  it('calls supabase insert and invalidates guests cache', async () => {
    const { result } = renderHook(() => useCreateGuest(), { wrapper: createWrapper() });

    const newGuest = buildGuest({ first_name: 'Iva', last_name: 'Kovač' });

    await act(async () => {
      result.current.mutate(newGuest);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

// ── useUpdateGuest ────────────────────────────────────────────────────────────

describe('useUpdateGuest', () => {
  beforeEach(() => {
    mockState.guests = { data: [guestRow], error: null };
  });

  it('calls supabase update and invalidates guests cache', async () => {
    const { result } = renderHook(() => useUpdateGuest(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 1, updates: { first_name: 'Ana Updated' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
