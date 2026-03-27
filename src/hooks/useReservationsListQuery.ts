import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { supabase } from '@/lib/supabase';
import type { SortingState, ColumnFiltersState, PaginationState } from '@tanstack/react-table';
// ─── Query select & type ─────────────────────────────────────────────────────────

const RESERVATIONS_LIST_SELECT = `*,
    reservation_statuses!status_id(code),
    booking_sources!booking_source_id(code),
    guests!guest_id(id, first_name, last_name, full_name, email, phone, nationality, has_pets, is_vip, vip_level),
    labels!label_id(id, name, color, bg_color),
    rooms!room_id(id, room_number, room_types!room_type_id(code))` as const;

export interface ReservationListRow {
  id: number;
  room_id: number;
  guest_id: number;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children_count: number | null;
  number_of_guests: number;
  status_id: number | null;
  booking_source_id: number | null;
  special_requests: string | null;
  internal_notes: string | null;
  has_pets: boolean | null;
  parking_required: boolean | null;
  company_id: number | null;
  label_id: string | null;
  is_r1: boolean | null;
  booking_date: string | null;
  booking_reference: string | null;
  confirmation_number: string | null;
  number_of_nights: number | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  pricing_tier_id: number | null;
  reservation_statuses: { code: string } | null;
  booking_sources: { code: string } | null;
  guests: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    has_pets: boolean | null;
    is_vip: boolean | null;
    vip_level: number | null;
  } | null;
  labels: { id: number; name: string; color: string | null; bg_color: string | null } | null;
  rooms: {
    id: number;
    room_number: string;
    room_types: { code: string } | null;
  } | null;
}

// ─── Status / source lookup helpers ─────────────────────────────────────────────

async function lookupStatusId(code: string): Promise<number | null> {
  const { data } = await supabase
    .from('reservation_statuses')
    .select('id')
    .eq('code', code)
    .single();
  return data?.id ?? null;
}

async function lookupSourceId(code: string): Promise<number | null> {
  const { data } = await supabase.from('booking_sources').select('id').eq('code', code).single();
  return data?.id ?? null;
}

// ─── Params ─────────────────────────────────────────────────────────────────────

export interface ReservationsListParams {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
  search: string;
}

// ─── Column-to-DB mapping ───────────────────────────────────────────────────────

const SORT_COLUMN_MAP: Record<string, string> = {
  check_in_date: 'check_in_date',
  check_out_date: 'check_out_date',
  created_at: 'created_at',
  guests_count: 'adults',
};

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useReservationsListQuery(params: ReservationsListParams) {
  return useQuery({
    queryKey: queryKeys.reservations.list(params),
    queryFn: async (): Promise<{ data: ReservationListRow[]; rowCount: number }> => {
      let query = supabase
        .from('reservations')
        .select(RESERVATIONS_LIST_SELECT, { count: 'exact' });

      // ── Column filters ──────────────────────────────────────────────────────
      for (const filter of params.columnFilters) {
        if (filter.id === 'status' && typeof filter.value === 'string') {
          const statusId = await lookupStatusId(filter.value);
          if (statusId !== null) {
            query = query.eq('status_id', statusId);
          }
        }
        if (filter.id === 'booking_source' && typeof filter.value === 'string') {
          const sourceId = await lookupSourceId(filter.value);
          if (sourceId !== null) {
            query = query.eq('booking_source_id', sourceId);
          }
        }
      }

      // ── Search (across guests, rooms, booking ref, and reservation ID) ────
      if (params.search.trim()) {
        const term = params.search.trim();
        const likeTerm = `%${term}%`;

        // Collect matching reservation IDs from multiple sources
        const matchingIds = new Set<number>();
        let hasSubResults = false;

        // 1. Search guests by name
        const { data: matchingGuests } = await supabase
          .from('guests')
          .select('id')
          .or(
            `first_name.ilike.${likeTerm},last_name.ilike.${likeTerm},full_name.ilike.${likeTerm}`
          )
          .limit(200);
        if (matchingGuests?.length) {
          const guestIds = matchingGuests.map((g) => g.id);
          const { data: guestReservations } = await supabase
            .from('reservations')
            .select('id')
            .in('guest_id', guestIds);
          guestReservations?.forEach((r) => matchingIds.add(r.id));
          hasSubResults = true;
        }

        // 2. Search rooms by room_number
        const { data: matchingRooms } = await supabase
          .from('rooms')
          .select('id')
          .ilike('room_number', likeTerm)
          .limit(50);
        if (matchingRooms?.length) {
          const roomIds = matchingRooms.map((r) => r.id);
          const { data: roomReservations } = await supabase
            .from('reservations')
            .select('id')
            .in('room_id', roomIds);
          roomReservations?.forEach((r) => matchingIds.add(r.id));
          hasSubResults = true;
        }

        // 3. Search by booking_reference, confirmation_number, or ID
        const { data: directMatches } = await supabase
          .from('reservations')
          .select('id')
          .or(`booking_reference.ilike.${likeTerm},confirmation_number.ilike.${likeTerm}`);
        directMatches?.forEach((r) => matchingIds.add(r.id));

        // 4. Search by reservation ID if numeric
        const numericId = parseInt(term);
        if (!isNaN(numericId)) {
          matchingIds.add(numericId);
        }

        if (matchingIds.size > 0) {
          query = query.in('id', Array.from(matchingIds));
        } else if (hasSubResults || directMatches?.length === 0) {
          // No matches found — force empty result
          query = query.eq('id', -1);
        }
      }

      // ── Sorting ─────────────────────────────────────────────────────────────
      if (params.sorting.length > 0) {
        for (const sort of params.sorting) {
          const dbColumn = SORT_COLUMN_MAP[sort.id];
          if (dbColumn) {
            query = query.order(dbColumn, { ascending: !sort.desc });
          }
        }
      } else {
        query = query.order('check_in_date', { ascending: false });
      }

      // ── Pagination ──────────────────────────────────────────────────────────
      const { pageIndex, pageSize } = params.pagination;
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        data: (data ?? []) as ReservationListRow[],
        rowCount: count ?? 0,
      };
    },
    placeholderData: keepPreviousData,
  });
}
