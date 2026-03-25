import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

// ─── Query builder ───────────────────────────────────────────────────────────

function buildGuestsQuery() {
  return supabase.from('guests').select('*').order('last_name');
}

// ─── Derived type ─────────────────────────────────────────────────────────────
// QueryData<> stays in sync with migrations automatically — no manual interface.
// display_name is a computed field: full_name fallback to first_name + last_name.

export type Guest = QueryData<ReturnType<typeof buildGuestsQuery>>[number] & {
  display_name: string;
};

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useGuests() {
  return useQuery({
    queryKey: queryKeys.guests.all(),
    queryFn: async () => {
      const { data } = await buildGuestsQuery().throwOnError();
      return (data ?? []).map((row) => ({
        ...row,
        display_name: row.full_name || `${row.first_name} ${row.last_name}`.trim(),
      }));
    },
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
