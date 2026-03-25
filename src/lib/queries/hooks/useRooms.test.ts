import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper } from '@/test/utils';
import { useRooms, useRoomsByFloor, useRoomLookup } from './useRooms';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  rooms: { data: [] as unknown, error: null as unknown },
  room_pricing: { data: [] as unknown, error: null as unknown },
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

// ── Test data ─────────────────────────────────────────────────────────────────

const roomRows = [
  {
    id: 1,
    room_number: '101',
    floor_number: 1,
    max_occupancy: 2,
    is_premium: false,
    amenities: ['WiFi', 'TV'],
    is_active: true,
    is_clean: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    room_types: { code: 'D' },
    room_pricing: [
      { base_rate: 55, pricing_seasons: { code: 'A', year_pattern: 2026 } },
      { base_rate: 65, pricing_seasons: { code: 'B', year_pattern: 2026 } },
      { base_rate: 85, pricing_seasons: { code: 'C', year_pattern: 2026 } },
      { base_rate: 105, pricing_seasons: { code: 'D', year_pattern: 2026 } },
    ],
  },
  {
    id: 2,
    room_number: '201',
    floor_number: 2,
    max_occupancy: 3,
    is_premium: true,
    amenities: ['WiFi', 'TV', 'Balcony'],
    is_active: true,
    is_clean: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    room_types: { code: 'T' },
    room_pricing: [],
  },
];

// ── useRooms ──────────────────────────────────────────────────────────────────

describe('useRooms', () => {
  beforeEach(() => {
    mockState.rooms = { data: roomRows, error: null };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps DB rows to Room domain objects', async () => {
    const { result } = renderHook(() => useRooms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);

    const room1 = result.current.data![0];
    expect(room1.id).toBe(1);
    expect(room1.room_number).toBe('101');
    expect(room1.floor_number).toBe(1);
    expect(room1.room_types).toEqual({ code: 'D' });
    expect(room1.name_croatian).toBe('Dvokrevetna soba');
    expect(room1.name_english).toBe('Double Room');
    expect(room1.max_occupancy).toBe(2);
    expect(room1.is_premium).toBe(false);
    expect(room1.amenities).toEqual(['WiFi', 'TV']);
    expect(room1.is_clean).toBe(true);
  });

  it('maps seasonal rates from room_pricing join', async () => {
    const { result } = renderHook(() => useRooms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const room1 = result.current.data![0];
    expect(room1.seasonal_rates).toEqual({ A: 55, B: 65, C: 85, D: 105 });
  });

  it('uses defaults when room_pricing is empty', async () => {
    const { result } = renderHook(() => useRooms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const room2 = result.current.data![1];
    expect(room2.seasonal_rates).toEqual({ A: 50, B: 60, C: 80, D: 100 });
  });

  it('surfaces error state when query throws', async () => {
    mockState.rooms = { data: null, error: new Error('DB error') };

    const { result } = renderHook(() => useRooms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty array when no rooms exist', async () => {
    mockState.rooms = { data: [], error: null };

    const { result } = renderHook(() => useRooms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── useRoomsByFloor ───────────────────────────────────────────────────────────

describe('useRoomsByFloor', () => {
  beforeEach(() => {
    mockState.rooms = { data: roomRows, error: null };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('groups rooms by floor number', async () => {
    const { result } = renderHook(() => useRoomsByFloor(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.roomsByFloor[1]).toHaveLength(1);
    expect(result.current.roomsByFloor[1][0].room_number).toBe('101');
    expect(result.current.roomsByFloor[2]).toHaveLength(1);
    expect(result.current.roomsByFloor[2][0].room_number).toBe('201');
  });
});

// ── useRoomLookup ─────────────────────────────────────────────────────────────

describe('useRoomLookup', () => {
  beforeEach(() => {
    mockState.rooms = { data: roomRows, error: null };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a map keyed by room id', async () => {
    const { result } = renderHook(() => useRoomLookup(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.roomLookup[1]).toBeDefined();
    expect(result.current.roomLookup[1].room_number).toBe('101');
    expect(result.current.roomLookup[2]).toBeDefined();
    expect(result.current.roomLookup[2].room_number).toBe('201');
  });
});
