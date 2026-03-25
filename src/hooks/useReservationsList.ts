// useReservationsList - Custom hook for managing reservations list state
// Handles filtering, search, pagination, and sorting with debouncing.
// Data fetching is managed by TanStack Query for caching and consistency.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Reservation } from '../lib/queries/hooks/useReservations';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queries/queryKeys';

export interface ReservationsFilters {
  // Search
  searchQuery: string;

  // Status filters
  statuses: string[];
  bookingSources: string[];
  paymentStatuses: string[];

  // Advanced filters
  roomTypes: string[];
  nationalities: string[];
  vipOnly: boolean;
  hasSpecialRequests: boolean;

  // Date filters
  checkInFrom?: Date;
  checkInTo?: Date;
  checkOutFrom?: Date;
  checkOutTo?: Date;
  bookingDateFrom?: Date;
  bookingDateTo?: Date;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface SortState {
  sortBy: 'check_in_date' | 'check_out_date' | 'booking_date' | 'guest_name';
  sortOrder: 'asc' | 'desc';
}

export interface UseReservationsListReturn {
  // Data
  reservations: Reservation[];
  isLoading: boolean;
  error: string | null;

  // Filters
  filters: ReservationsFilters;
  updateFilters: (updates: Partial<ReservationsFilters>) => void;
  clearFilters: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearchQuery: string;

  // Pagination
  pagination: PaginationState;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;

  // Sorting
  sort: SortState;
  updateSort: (sortBy: SortState['sortBy']) => void;

  // Actions
  refetch: () => void;

  // Selection
  selectedIds: Set<number>;
  toggleSelection: (id: number) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
}

interface QueryParams {
  searchQuery?: string;
  statuses?: string[];
  bookingSources?: string[];
  paymentStatuses?: string[];
  roomTypes?: string[];
  nationalities?: string[];
  vipOnly?: boolean;
  hasSpecialRequests?: boolean;
  checkInFrom?: Date;
  checkInTo?: Date;
  checkOutFrom?: Date;
  checkOutTo?: Date;
  bookingDateFrom?: Date;
  bookingDateTo?: Date;
  page: number;
  pageSize: number;
  sortBy: SortState['sortBy'];
  sortOrder: 'asc' | 'desc';
}

async function fetchReservationsWithFilters(params: QueryParams): Promise<{
  reservations: Reservation[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const {
    searchQuery,
    statuses,
    bookingSources,
    nationalities,
    vipOnly,
    hasSpecialRequests,
    checkInFrom,
    checkInTo,
    checkOutFrom,
    checkOutTo,
    bookingDateFrom,
    bookingDateTo,
    page = 1,
    pageSize = 25,
    sortBy = 'check_in_date',
    sortOrder = 'desc',
  } = params;

  let query = supabase.from('reservations').select(
    `*,
      reservation_statuses!status_id(code),
      booking_sources!booking_source_id(code),
      guests!guest_id(id, first_name, last_name, full_name, display_name, email, phone, nationality, has_pets, is_vip, vip_level),
      labels!label_id(id, name, color, bg_color),
      rooms!room_id(id, room_number, room_types!room_type_id(code))`,
    { count: 'exact' }
  );

  // Status filter — join via reservation_statuses code
  if (statuses && statuses.length > 0) {
    const { data: statusRows } = await supabase
      .from('reservation_statuses')
      .select('id')
      .in('code', statuses);
    if (statusRows && statusRows.length > 0) {
      query = query.in(
        'status_id',
        statusRows.map((s) => s.id)
      );
    }
  }

  // Booking source filter
  if (bookingSources && bookingSources.length > 0) {
    const { data: sourceRows } = await supabase
      .from('booking_sources')
      .select('id')
      .in('code', bookingSources);
    if (sourceRows && sourceRows.length > 0) {
      query = query.in(
        'booking_source_id',
        sourceRows.map((s) => s.id)
      );
    }
  }

  // Date range filters
  if (checkInFrom) {
    query = query.gte('check_in_date', checkInFrom.toISOString().split('T')[0]);
  }
  if (checkInTo) {
    query = query.lte('check_in_date', checkInTo.toISOString().split('T')[0]);
  }
  if (checkOutFrom) {
    query = query.gte('check_out_date', checkOutFrom.toISOString().split('T')[0]);
  }
  if (checkOutTo) {
    query = query.lte('check_out_date', checkOutTo.toISOString().split('T')[0]);
  }
  if (bookingDateFrom) {
    query = query.gte('booking_date', bookingDateFrom.toISOString());
  }
  if (bookingDateTo) {
    query = query.lte('booking_date', bookingDateTo.toISOString());
  }

  if (hasSpecialRequests) {
    query = query.not('special_requests', 'is', null);
    query = query.neq('special_requests', '');
  }

  // Guest-level filters via foreign table filter syntax
  if (nationalities && nationalities.length > 0) {
    query = query.in('guests.nationality', nationalities);
  }
  if (vipOnly) {
    query = query.eq('guests.is_vip', true);
  }

  // Sorting
  const orderColumn = sortBy === 'guest_name' ? 'guests(last_name)' : sortBy;
  query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = (data as any[]) ?? [];

  // Client-side search filter
  if (searchQuery) {
    const searchLower = searchQuery.toLowerCase();
    rows = rows.filter((row) => {
      const guest = row.guests;
      const room = row.rooms;
      return (
        guest?.first_name?.toLowerCase().includes(searchLower) ||
        guest?.last_name?.toLowerCase().includes(searchLower) ||
        guest?.display_name?.toLowerCase().includes(searchLower) ||
        String(row.id).includes(searchLower) ||
        room?.room_number?.toLowerCase().includes(searchLower)
      );
    });
  }

  // Client-side room type filter (params.roomTypes)
  if (params.roomTypes && params.roomTypes.length > 0) {
    rows = rows.filter((row) => {
      const roomTypeCode = row.rooms?.room_types?.code ?? 'double';
      return params.roomTypes!.includes(roomTypeCode);
    });
  }

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    reservations: rows as Reservation[],
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

const initialFilters: ReservationsFilters = {
  searchQuery: '',
  statuses: [],
  bookingSources: [],
  paymentStatuses: [],
  roomTypes: [],
  nationalities: [],
  vipOnly: false,
  hasSpecialRequests: false,
};

const initialSort: SortState = {
  sortBy: 'check_in_date',
  sortOrder: 'desc',
};

export function useReservationsList(): UseReservationsListReturn {
  const [filters, setFilters] = useState<ReservationsFilters>(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);
  const [sort, setSort] = useState<SortState>(initialSort);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query params — stable reference so TQ key is consistent
  const queryParams = useMemo(
    () => ({
      searchQuery: debouncedSearchQuery || undefined,
      statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
      bookingSources: filters.bookingSources.length > 0 ? filters.bookingSources : undefined,
      paymentStatuses: filters.paymentStatuses.length > 0 ? filters.paymentStatuses : undefined,
      roomTypes: filters.roomTypes.length > 0 ? filters.roomTypes : undefined,
      nationalities: filters.nationalities.length > 0 ? filters.nationalities : undefined,
      vipOnly: filters.vipOnly || undefined,
      hasSpecialRequests: filters.hasSpecialRequests || undefined,
      checkInFrom: filters.checkInFrom,
      checkInTo: filters.checkInTo,
      checkOutFrom: filters.checkOutFrom,
      checkOutTo: filters.checkOutTo,
      bookingDateFrom: filters.bookingDateFrom,
      bookingDateTo: filters.bookingDateTo,
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
    }),
    [debouncedSearchQuery, filters, page, pageSize, sort]
  );

  const {
    data,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reservations.list(queryParams),
    queryFn: () => fetchReservationsWithFilters(queryParams),
    placeholderData: (prev) => prev, // keep previous data while fetching next page
  });

  const reservations = useMemo(() => data?.reservations ?? [], [data?.reservations]);
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const pagination: PaginationState = { page, pageSize, totalCount, totalPages };

  // Filter management
  const updateFilters = useCallback((updates: Partial<ReservationsFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchQuery('');
    setPage(1);
  }, []);

  // Pagination management
  const goToPage = useCallback((p: number) => setPage(p), []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => (p < totalPages ? p + 1 : p));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setPage((p) => (p > 1 ? p - 1 : p));
  }, []);

  const goToFirstPage = useCallback(() => setPage(1), []);

  const goToLastPage = useCallback(() => setPage(totalPages), [totalPages]);

  // Sorting management
  const updateSort = useCallback((sortBy: SortState['sortBy']) => {
    setSort((prev) => ({
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'desc',
    }));
    setPage(1);
  }, []);

  // Selection management
  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === reservations.length && reservations.length > 0
        ? new Set()
        : new Set(reservations.map((r) => r.id))
    );
  }, [reservations]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    reservations,
    isLoading: isFetching,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : 'Failed to fetch reservations'
      : null,

    filters,
    updateFilters,
    clearFilters,

    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,

    pagination,
    goToPage,
    setPageSize,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,

    sort,
    updateSort,

    refetch,

    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
  };
}
