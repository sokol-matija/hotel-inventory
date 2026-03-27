import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Table } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

interface ReservationsTablePaginationProps<TData> {
  table: Table<TData>;
  t: TFunction;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function ReservationsTablePagination<TData>({
  table,
  t,
}: ReservationsTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getRowCount();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-4">
      {/* Selection info */}
      <div className="text-muted-foreground text-sm">
        {selectedCount > 0
          ? t('reservationsList.pagination.selected', '{{count}} of {{total}} selected', {
              count: selectedCount,
              total: totalCount,
            })
          : t('reservationsList.pagination.total', '{{total}} reservations', {
              total: totalCount,
            })}
      </div>

      <div className="flex items-center gap-4">
        {/* Page size */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {t('reservationsList.pagination.rowsPerPage', 'Rows per page')}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <span className="text-muted-foreground text-sm">
          {t('reservationsList.pagination.page', 'Page {{current}} of {{total}}', {
            current: pageIndex + 1,
            total: pageCount || 1,
          })}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label={t('reservationsList.pagination.first', 'First page')}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={t('reservationsList.pagination.previous', 'Previous page')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label={t('reservationsList.pagination.next', 'Next page')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label={t('reservationsList.pagination.last', 'Last page')}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
