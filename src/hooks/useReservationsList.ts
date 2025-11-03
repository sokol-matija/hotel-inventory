// useReservationsList - Custom hook for managing reservations list state
// Handles filtering, search, pagination, and sorting with debouncing

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Reservation } from '../lib/hotel/types';
import { databaseAdapter } from '../lib/hotel/services/DatabaseAdapter';

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

const initialPagination: PaginationState = {
  page: 1,
  pageSize: 25,
  totalCount: 0,
  totalPages: 0,
};

const initialSort: SortState = {
  sortBy: 'check_in_date',
  sortOrder: 'desc',
};

export function useReservationsList(): UseReservationsListReturn {
  // State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ReservationsFilters>(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [pagination, setPagination] = useState<PaginationState>(initialPagination);
  const [sort, setSort] = useState<SortState>(initialSort);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch reservations when filters/pagination/sort change
  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await databaseAdapter.getReservationsWithFilters({
        searchQuery: debouncedSearchQuery,
        statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
        bookingSources: filters.bookingSources.length > 0 ? filters.bookingSources : undefined,
        paymentStatuses: filters.paymentStatuses.length > 0 ? filters.paymentStatuses : undefined,
        roomTypes: filters.roomTypes.length > 0 ? filters.roomTypes : undefined,
        nationalities: filters.nationalities.length > 0 ? filters.nationalities : undefined,
        vipOnly: filters.vipOnly,
        hasSpecialRequests: filters.hasSpecialRequests,
        checkInFrom: filters.checkInFrom,
        checkInTo: filters.checkInTo,
        checkOutFrom: filters.checkOutFrom,
        checkOutTo: filters.checkOutTo,
        bookingDateFrom: filters.bookingDateFrom,
        bookingDateTo: filters.bookingDateTo,
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      });

      setReservations(result.reservations);
      setPagination(prev => ({
        ...prev,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reservations');
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchQuery, filters, pagination.page, pagination.pageSize, sort]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Filter management
  const updateFilters = useCallback((updates: Partial<ReservationsFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Pagination management
  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination(prev => ({ ...prev, pageSize: size, page: 1 }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination(prev => {
      if (prev.page < prev.totalPages) {
        return { ...prev, page: prev.page + 1 };
      }
      return prev;
    });
  }, []);

  const previousPage = useCallback(() => {
    setPagination(prev => {
      if (prev.page > 1) {
        return { ...prev, page: prev.page - 1 };
      }
      return prev;
    });
  }, []);

  const goToFirstPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const goToLastPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: prev.totalPages }));
  }, []);

  // Sorting management
  const updateSort = useCallback((sortBy: SortState['sortBy']) => {
    setSort(prev => {
      // Toggle order if same column
      if (prev.sortBy === sortBy) {
        return {
          sortBy,
          sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
        };
      }
      // Default to desc for new column
      return {
        sortBy,
        sortOrder: 'desc',
      };
    });
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Selection management
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
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
    if (selectedIds.size === reservations.length && reservations.length > 0) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all current page
      setSelectedIds(new Set(reservations.map(r => r.id)));
    }
  }, [reservations, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    // Data
    reservations,
    isLoading,
    error,

    // Filters
    filters,
    updateFilters,
    clearFilters,

    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,

    // Pagination
    pagination,
    goToPage,
    setPageSize,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,

    // Sorting
    sort,
    updateSort,

    // Actions
    refetch: fetchReservations,

    // Selection
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
  };
}
