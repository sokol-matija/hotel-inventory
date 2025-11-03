// ReservationsPagination - Comprehensive pagination controls
// Provides page navigation, page size selection, and results summary

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { PaginationState } from '../../../../hooks/useReservationsList';
import { Button } from '../../../ui/button';
import { Select } from '../../../ui/select';

interface ReservationsPaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
}

export default function ReservationsPagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  onFirst,
  onPrevious,
  onNext,
  onLast
}: ReservationsPaginationProps) {
  const { t } = useTranslation();
  const [jumpPage, setJumpPage] = useState('');

  const { page, pageSize, totalCount, totalPages } = pagination;

  // Calculate result range
  const startResult = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endResult = Math.min(page * pageSize, totalCount);

  // Handle jump to page
  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpPage('');
    }
  };

  // Page size options
  const pageSizeOptions = [10, 25, 50, 100];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        {t('reservationsList.showingResults', {
          start: startResult,
          end: endResult,
          total: totalCount
        })}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2 mr-4">
          <span className="text-sm text-gray-600">
            {t('reservationsList.pagination.rowsPerPage')}
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* First Page */}
        <Button
          size="sm"
          variant="outline"
          onClick={onFirst}
          disabled={page === 1}
          title={t('reservationsList.pagination.first')}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Previous Page */}
        <Button
          size="sm"
          variant="outline"
          onClick={onPrevious}
          disabled={page === 1}
          title={t('reservationsList.pagination.previous')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page Indicator */}
        <div className="flex items-center gap-2 px-2">
          <span className="text-sm text-gray-600">
            {t('reservationsList.pagination.page')} {page} {t('reservationsList.pagination.of')} {totalPages}
          </span>
        </div>

        {/* Next Page */}
        <Button
          size="sm"
          variant="outline"
          onClick={onNext}
          disabled={page >= totalPages}
          title={t('reservationsList.pagination.next')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Last Page */}
        <Button
          size="sm"
          variant="outline"
          onClick={onLast}
          disabled={page >= totalPages}
          title={t('reservationsList.pagination.last')}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>

        {/* Jump to Page */}
        {totalPages > 5 && (
          <form onSubmit={handleJumpToPage} className="flex items-center gap-2 ml-4">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder={t('reservationsList.pagination.jumpToPage')}
              className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!jumpPage}
            >
              Go
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
