import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

// ─── Query builder ───────────────────────────────────────────────────────────

function buildRoomsQuery() {
  return supabase
    .from('rooms')
    .select(
      '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
    )
    .eq('is_active', true)
    .order('room_number');
}

// ─── Derived type ─────────────────────────────────────────────────────────────
// QueryData<> stays in sync with migrations automatically — no manual interface.
// name_english, name_croatian, seasonal_rates are computed from joined data.

type RoomRow = QueryData<ReturnType<typeof buildRoomsQuery>>[number];

export type Room = Omit<RoomRow, 'is_premium' | 'is_clean' | 'amenities' | 'max_occupancy'> & {
  // mapRoom normalizes these nullable DB columns to non-nullable
  is_premium: boolean;
  is_clean: boolean;
  amenities: string[];
  max_occupancy: number;
  // Computed from joined room_pricing + room_types
  name_english: string;
  name_croatian: string;
  seasonal_rates: { A: number; B: number; C: number; D: number };
};

// ─── Name lookup tables ───────────────────────────────────────────────────────

const ROOM_TYPE_CROATIAN_NAMES: Record<string, string> = {
  BD: 'Velika dvokrevetna soba',
  BS: 'Velika jednokrevetna soba',
  D: 'Dvokrevetna soba',
  T: 'Trokrevetna soba',
  S: 'Jednokrevetna soba',
  F: 'Obiteljska soba',
  A: 'Apartman',
  RA: '401 ROOFTOP APARTMAN',
};

const ROOM_TYPE_ENGLISH_NAMES: Record<string, string> = {
  // Legacy single-letter codes
  BD: 'Big Double Room',
  BS: 'Big Single Room',
  D: 'Double Room',
  T: 'Triple Room',
  S: 'Single Room',
  F: 'Family Room',
  A: 'Apartment',
  RA: '401 Rooftop Apartment',
  // Current database room types (lowercase)
  single: 'Single Room',
  double: 'Double Room',
  triple: 'Triple Room',
  family: 'Family Room',
  apartment: 'Apartment',
};

function getRoomCroatianName(code: string): string {
  return ROOM_TYPE_CROATIAN_NAMES[code] ?? 'Dvokrevetna soba';
}

function getRoomEnglishName(code: string): string {
  return ROOM_TYPE_ENGLISH_NAMES[code] ?? `${code.charAt(0).toUpperCase()}${code.slice(1)} Room`;
}

// ─── Mapping helper ───────────────────────────────────────────────────────────

function mapRoom(row: RoomRow): Room {
  const code = row.room_types?.code ?? 'double';
  const pricing = row.room_pricing as Array<{
    base_rate: number;
    pricing_seasons: { code: string; year_pattern: number } | null;
  }> | null;

  return {
    ...row,
    max_occupancy: row.max_occupancy ?? 2,
    is_premium: row.is_premium ?? false,
    amenities: (row.amenities as string[]) ?? [],
    is_clean: row.is_clean ?? false,
    name_english: getRoomEnglishName(code),
    name_croatian: getRoomCroatianName(code),
    seasonal_rates: {
      A: pricing?.find((rp) => rp.pricing_seasons?.code === 'A')?.base_rate ?? 50,
      B: pricing?.find((rp) => rp.pricing_seasons?.code === 'B')?.base_rate ?? 60,
      C: pricing?.find((rp) => rp.pricing_seasons?.code === 'C')?.base_rate ?? 80,
      D: pricing?.find((rp) => rp.pricing_seasons?.code === 'D')?.base_rate ?? 100,
    },
  };
}

// ─── Service function ─────────────────────────────────────────────────────────

async function fetchRooms(): Promise<Room[]> {
  const { data } = await buildRoomsQuery().throwOnError();
  return (data ?? []).map(mapRoom);
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useRooms() {
  return useQuery({
    queryKey: queryKeys.rooms.all(),
    queryFn: fetchRooms,
  });
}

/** Derived view: rooms grouped by floor_number. Shares the same query as useRooms(). */
export function useRoomsByFloor() {
  const { data: rooms = [], ...rest } = useRooms();

  const roomsByFloor = useMemo(() => {
    const map: Record<number, Room[]> = {};
    rooms.forEach((room) => {
      if (!map[room.floor_number]) map[room.floor_number] = [];
      map[room.floor_number].push(room);
    });
    return map;
  }, [rooms]);

  return { roomsByFloor, ...rest };
}

/** Derived view: rooms keyed by id (number). Shares the same query as useRooms(). */
export function useRoomLookup() {
  const { data: rooms = [], ...rest } = useRooms();

  const roomLookup = useMemo(() => {
    const map: Record<number, Room> = {};
    rooms.forEach((room) => {
      map[room.id] = room;
    });
    return map;
  }, [rooms]);

  return { roomLookup, ...rest };
}
