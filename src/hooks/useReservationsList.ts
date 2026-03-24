// useReservationsList - Custom hook for managing reservations list state
// Handles filtering, search, pagination, and sorting with debouncing.
// Data fetching is managed by TanStack Query for caching and consistency.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Reservation } from '../lib/hotel/types';
import { databaseAdapter } from '../lib/hotel/services/DatabaseAdapter';
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
  sortBy: 'check_in_date' | 'check_out_date' | 'booking_date' | 'total_amount' | 'guest_name';
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
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    queryFn: () => databaseAdapter.getReservationsWithFilters(queryParams),
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
  const toggleSelection = useCallback((id: string) => {
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
