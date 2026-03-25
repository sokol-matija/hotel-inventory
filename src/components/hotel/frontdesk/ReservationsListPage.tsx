// Reservations List Page - Enterprise-grade list view with advanced filtering
// Full implementation with table, search, filters, pagination

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, List, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { useReservationsList } from '../../../hooks/useReservationsList';
import ReservationsTable from './ReservationsList/ReservationsTable';
import ReservationsSearch from './ReservationsList/ReservationsSearch';
import ReservationsFilters from './ReservationsList/ReservationsFilters';
import ReservationsPagination from './ReservationsList/ReservationsPagination';
import ReservationPopup from './Reservations/ReservationPopup';
import { Reservation } from '../../../lib/hotel/types';
import { CalendarEvent } from '../../../lib/hotel/types';

export default function ReservationsListPage() {
  const { t } = useTranslation();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<CalendarEvent | null>(null);

  // Use our powerful custom hook
  const {
    reservations,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    searchQuery,
    setSearchQuery,
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
  } = useReservationsList();

  // Convert Reservation to CalendarEvent for the popup
  const handleViewDetails = (reservation: Reservation) => {
    const guestName =
      reservation.guests?.full_name ||
      `${reservation.guests?.first_name ?? ''} ${reservation.guests?.last_name ?? ''}`.trim() ||
      'Guest';
    const event: CalendarEvent = {
      id: String(reservation.id),
      reservationId: String(reservation.id),
      roomId: String(reservation.room_id),
      title: guestName,
      start: new Date(reservation.check_in_date),
      end: new Date(reservation.check_out_date),
      resource: {
        status: (reservation.reservation_statuses?.code ??
          'confirmed') as import('../../../lib/hotel/types').ReservationStatus,
        guestName,
        roomNumber: String(reservation.room_id),
        numberOfGuests: reservation.number_of_guests ?? reservation.adults ?? 1,
        hasPets: reservation.has_pets || false,
      },
    };
    setSelectedReservation(event);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              <List className="h-8 w-8 text-blue-600" />
              {t('reservationsList.title')}
            </h1>
            <p className="mt-1 text-gray-600">{t('reservationsList.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>

            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              {t('common.export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar and Filters */}
      <div className="mb-6">
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-start gap-4 lg:flex-row">
              <div className="flex-1">
                <ReservationsSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  isSearching={isLoading}
                />
              </div>
              <div className="shrink-0">
                <ReservationsFilters
                  filters={filters}
                  onUpdateFilters={updateFilters}
                  onClearFilters={clearFilters}
                  isOpen={isFiltersOpen}
                  onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('reservationsList.allReservations')}</span>
            <span className="text-sm font-normal text-gray-500">
              {t('reservationsList.totalReservations', { count: pagination.totalCount })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationsTable
            reservations={reservations}
            sortState={sort}
            onSort={updateSort}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleSelectAll={toggleSelectAll}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />

          {/* Pagination */}
          {!isLoading && reservations.length > 0 && (
            <ReservationsPagination
              pagination={pagination}
              onPageChange={goToPage}
              onPageSizeChange={setPageSize}
              onFirst={goToFirstPage}
              onPrevious={previousPage}
              onNext={nextPage}
              onLast={goToLastPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Reservation Details Modal */}
      <ReservationPopup
        isOpen={selectedReservation !== null}
        onClose={() => setSelectedReservation(null)}
        event={selectedReservation}
      />
    </div>
  );
}
