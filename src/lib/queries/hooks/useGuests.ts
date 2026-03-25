import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

// ─── Query definition ────────────────────────────────────────────────────────

const guestsQuery = supabase.from('guests').select('*').order('last_name');

// ─── Derived types ────────────────────────────────────────────────────────────

type GuestRow = QueryData<typeof guestsQuery>[number];

export interface Guest {
  // DB columns (snake_case — same as DB)
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  id_card_number: string | null;
  preferred_language: string | null;
  dietary_restrictions: string[] | null;
  special_needs: string | null;
  has_pets: boolean | null;
  is_vip: boolean | null;
  vip_level: number | null;
  marketing_consent: boolean | null;
  average_rating: number | null;
  notes: string | null;
  country_code: string | null;
  full_name: string | null;
  created_at: string | null;
  updated_at: string | null;

  // Computed (not in DB — derived from first_name + last_name)
  display_name: string;
}

// ─── Mapping helper ───────────────────────────────────────────────────────────

function mapGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    nationality: row.nationality,
    date_of_birth: row.date_of_birth,
    passport_number: row.passport_number,
    id_card_number: row.id_card_number,
    preferred_language: row.preferred_language,
    dietary_restrictions: row.dietary_restrictions,
    special_needs: row.special_needs,
    has_pets: row.has_pets,
    is_vip: row.is_vip,
    vip_level: row.vip_level,
    marketing_consent: row.marketing_consent,
    average_rating: row.average_rating,
    notes: row.notes,
    country_code: row.country_code,
    full_name: row.full_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    display_name: row.full_name || `${row.first_name} ${row.last_name}`.trim(),
  };
}

// ─── Service function ─────────────────────────────────────────────────────────

async function fetchGuests(): Promise<Guest[]> {
  const { data } = await guestsQuery.throwOnError();
  return (data ?? []).map(mapGuest);
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useGuests() {
  return useQuery({
    queryKey: queryKeys.guests.all(),
    queryFn: fetchGuests,
  });
}

/** Client-side search over cached guests — no extra network request. */
export function useGuestSearch(query: string) {
  const { data: guests = [], ...rest } = useGuests();

  const results = useMemo(() => {
    if (!query.trim()) return guests;
    const q = query.toLowerCase();
    return guests.filter(
      (g) =>
        g.display_name.toLowerCase().includes(q) ||
        (g.email ?? '').toLowerCase().includes(q) ||
        (g.phone ?? '').includes(q) ||
        (g.nationality ?? '').toLowerCase().includes(q)
    );
  }, [guests, query]);

  return { data: results, ...rest };
}

export function useCreateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guestData: TablesInsert<'guests'>) => {
      await supabase.from('guests').insert(guestData).throwOnError();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() }),
  });
}

export function useUpdateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: TablesUpdate<'guests'> }) => {
      await supabase.from('guests').update(updates).eq('id', id).throwOnError();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() }),
  });
}
