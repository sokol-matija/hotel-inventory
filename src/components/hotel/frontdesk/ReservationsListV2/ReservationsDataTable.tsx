import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useReservationsListQuery } from '@/hooks/useReservationsListQuery';
import { useBatchReservationCharges } from '@/hooks/useBatchReservationCharges';
import {
  useUpdateReservationStatus,
  useDeleteReservation,
  useBatchDeleteReservations,
} from '@/lib/queries/hooks/useReservations';
import { getColumns, type ReservationsTableMeta } from './columns';
import { ReservationsToolbar } from './ReservationsToolbar';
import { ReservationsTablePagination } from './ReservationsTablePagination';
import type { ReservationListRow } from '@/hooks/useReservationsListQuery';

interface ReservationsDataTableProps {
  onViewDetails: (row: ReservationListRow) => void;
  onEdit: (id: number) => void;
}

export function ReservationsDataTable({ onViewDetails, onEdit }: ReservationsDataTableProps) {
  const { t } = useTranslation();

  // ── Table state ─────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // ── Search with debounce ────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page on filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [columnFilters]);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const {
    data: queryResult,
    isLoading,
    isError,
    error,
  } = useReservationsListQuery({
    sorting,
    columnFilters,
    pagination,
    search: debouncedSearch,
  });

  const rows = useMemo(() => queryResult?.data ?? [], [queryResult?.data]);
  const rowCount = queryResult?.rowCount ?? 0;

  // ── Batch charge totals ─────────────────────────────────────────────────────
  const reservationIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const { data: chargeTotals } = useBatchReservationCharges(reservationIds);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const updateStatus = useUpdateReservationStatus();
  const deleteReservation = useDeleteReservation();

  const handleStatusChange = useCallback(
    (id: number, status: string) => {
      updateStatus.mutate({ id, status });
    },
    [updateStatus]
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteReservation.mutate(id);
    },
    [deleteReservation]
  );

  const batchDelete = useBatchDeleteReservations();
  const handleBatchDelete = useCallback(() => {
    const selectedIds = Object.keys(rowSelection).map(Number).filter(Boolean);
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      t(
        'reservationsList.confirmBatchDelete',
        `Delete ${selectedIds.length} reservation(s)? This cannot be undone.`
      )
    );
    if (!confirmed) return;
    batchDelete.mutate(selectedIds, {
      onSuccess: () => {
        setRowSelection({});
      },
    });
  }, [rowSelection, batchDelete, t]);

  // ── Toolbar filter values ─────────────────────────────────────────────────
  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? '';
  const sourceFilter =
    (columnFilters.find((f) => f.id === 'booking_source')?.value as string) ?? '';

  const handleStatusFilterChange = useCallback((value: string) => {
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== 'status');
      if (value && value !== 'all') {
        next.push({ id: 'status', value });
      }
      return next;
    });
  }, []);

  const handleSourceFilterChange = useCallback((value: string) => {
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== 'booking_source');
      if (value && value !== 'all') {
        next.push({ id: 'booking_source', value });
      }
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setColumnFilters([]);
    setSearchInput('');
    setDebouncedSearch('');
  }, []);

  const hasActiveFilters = columnFilters.length > 0 || debouncedSearch.length > 0;

  // ── Table meta ──────────────────────────────────────────────────────────────
  const meta: ReservationsTableMeta = useMemo(
    () => ({
      chargeTotals: chargeTotals ?? {},
      onViewDetails,
      onEdit,
      onDelete: handleDelete,
      onStatusChange: handleStatusChange,
      t,
    }),
    [chargeTotals, onViewDetails, onEdit, handleDelete, handleStatusChange, t]
  );

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns = useMemo(() => getColumns(t), [t]);

  // ── Table instance ──────────────────────────────────────────────────────────
  const table = useReactTable({
    data: rows,
    columns,
    rowCount,
    state: {
      sorting,
      columnFilters,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    meta,
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <ReservationsToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        sourceFilter={sourceFilter}
        onSourceFilterChange={handleSourceFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        selectedCount={Object.keys(rowSelection).length}
        onBatchDelete={handleBatchDelete}
        isBatchDeleting={batchDelete.isPending}
        t={t}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {(error as Error)?.message ??
              t('reservationsList.error', 'Failed to load reservations')}
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' \u2191'}
                      {header.column.getIsSorted() === 'desc' && ' \u2193'}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                    <span className="text-muted-foreground">
                      {t('reservationsList.loading', 'Loading...')}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <span className="text-muted-foreground">
                    {t('reservationsList.noResults', 'No reservations found.')}
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ReservationsTablePagination table={table} t={t} />
    </div>
  );
}
