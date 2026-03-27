// ReservationsTable - Comprehensive table with sorting, selection, and actions
// Enterprise-grade table component with responsive design

import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit2,
  Trash2,
  Receipt,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { Reservation } from '../../../../lib/hotel/types';
import { SortState } from '../../../../hooks/useReservationsList';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import { useReservationCharges } from '../../../../lib/queries/hooks/useReservationCharges';

// Inline total cell that fetches charges per reservation
function ChargesTotal({ reservationId }: { reservationId: number }) {
  const { data: charges = [], isLoading } = useReservationCharges(reservationId);
  if (isLoading) return <span className="text-gray-400">...</span>;
  if (!charges.length) return <span className="text-gray-400">&mdash;</span>;
  const total = charges.reduce((sum, c) => sum + c.total, 0);
  return <span>{`\u20AC${total.toFixed(2)}`}</span>;
}

interface ReservationsTableProps {
  reservations: Reservation[];
  sortState: SortState;
  onSort: (column: SortState['sortBy']) => void;
  selectedIds: Set<number>;
  onToggleSelection: (id: number) => void;
  onToggleSelectAll: () => void;
  onViewDetails: (reservation: Reservation) => void;
  onEdit?: (reservation: Reservation) => void;
  onDelete?: (reservation: Reservation) => void;
  isLoading?: boolean;
}

// Sortable column header — defined at module scope to avoid re-mounting on every render
function SortableHeader({
  column,
  label,
  className = '',
  sortState,
  onSort,
}: {
  column: SortState['sortBy'];
  label: string;
  className?: string;
  sortState: SortState;
  onSort: (column: SortState['sortBy']) => void;
}) {
  const isSorted = sortState.sortBy === column;
  const isAsc = sortState.sortOrder === 'asc';

  return (
    <th className={`px-4 py-3 text-left ${className}`}>
      <button
        onClick={() => onSort(column)}
        className="group flex items-center gap-2 text-sm font-semibold text-gray-700 transition-colors hover:text-gray-900"
      >
        <span>{label}</span>
        {isSorted ? (
          isAsc ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-50" />
        )}
      </button>
    </th>
  );
}

// Status badge color mapping — module scope to avoid re-creating on every render
function getStatusBadge(status: string) {
  const statusMap: Record<
    string,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
  > = {
    confirmed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    'checked-in': { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    'checked-out': { variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
    cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
    'no-show': { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
    'room-closure': { variant: 'outline', icon: <Clock className="h-3 w-3" /> },
    unallocated: { variant: 'outline', icon: <Clock className="h-3 w-3" /> },
    'incomplete-payment': { variant: 'outline', icon: <DollarSign className="h-3 w-3" /> },
  };

  const config = statusMap[status] || statusMap['confirmed'];

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      <span>{status}</span>
    </Badge>
  );
}

function getPaymentBadge(status?: string) {
  if (!status) return null;

  const statusMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
    paid: 'default',
    partial: 'secondary',
    pending: 'secondary',
    refunded: 'destructive',
    cancelled: 'destructive',
  };

  return (
    <Badge variant={statusMap[status] || 'secondary'} className="text-xs">
      {status}
    </Badge>
  );
}

function formatDate(date: Date | string) {
  try {
    return format(new Date(date), 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
}

interface MobileCardProps {
  reservation: Reservation;
  selectedIds: Set<number>;
  onToggleSelection: (id: number) => void;
  onViewDetails: (reservation: Reservation) => void;
  onEdit?: (reservation: Reservation) => void;
}

function MobileCard({
  reservation,
  selectedIds,
  onToggleSelection,
  onViewDetails,
  onEdit,
}: MobileCardProps) {
  const { t } = useTranslation();
  return (
    <Card className="mb-3 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.has(reservation.id)}
            onChange={() => onToggleSelection(reservation.id)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <div>
            <h3 className="font-semibold text-gray-900">
              {reservation.guests?.first_name} {reservation.guests?.last_name}
            </h3>
            <p className="text-sm text-gray-600">
              Room {reservation.room_id} • {formatDate(reservation.check_in_date)}
            </p>
          </div>
        </div>
        {getStatusBadge(reservation.reservation_statuses?.code ?? 'confirmed')}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-600">{t('reservationsList.columns.checkIn')}:</span>
          <p className="font-medium">{formatDate(reservation.check_in_date)}</p>
        </div>
        <div>
          <span className="text-gray-600">{t('reservationsList.columns.checkOut')}:</span>
          <p className="font-medium">{formatDate(reservation.check_out_date)}</p>
        </div>
        <div>
          <span className="text-gray-600">{t('reservationsList.columns.totalAmount')}:</span>
          <p className="font-medium">
            <ChargesTotal reservationId={reservation.id} />
          </p>
        </div>
        <div>
          <span className="text-gray-600">{t('reservationsList.columns.paymentStatus')}:</span>
          <div>{getPaymentBadge(reservation.reservation_statuses?.code ?? '')}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onViewDetails(reservation)}
        >
          <Eye className="mr-1 h-4 w-4" />
          {t('reservationsList.actions.view')}
        </Button>
        {onEdit && (
          <Button size="sm" variant="outline" onClick={() => onEdit(reservation)}>
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function ReservationsTable({
  reservations,
  sortState,
  onSort,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  onViewDetails,
  onEdit,
  onDelete,
  isLoading = false,
}: ReservationsTableProps) {
  const { t } = useTranslation();

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 rounded bg-gray-200"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (reservations.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-gray-400">
          <Receipt className="mx-auto h-16 w-16" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          {t('reservationsList.noReservationsFound')}
        </h3>
        <p className="text-gray-600">{t('reservationsList.noReservationsYet')}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden">
        {reservations.map((reservation) => (
          <MobileCard
            key={reservation.id}
            reservation={reservation}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            onViewDetails={onViewDetails}
            onEdit={onEdit}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === reservations.length && reservations.length > 0}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <SortableHeader
                column="guest_name"
                label={t('reservationsList.columns.guest')}
                sortState={sortState}
                onSort={onSort}
              />
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {t('reservationsList.columns.room')}
              </th>
              <SortableHeader
                column="check_in_date"
                label={t('reservationsList.columns.checkIn')}
                sortState={sortState}
                onSort={onSort}
              />
              <SortableHeader
                column="check_out_date"
                label={t('reservationsList.columns.checkOut')}
                sortState={sortState}
                onSort={onSort}
              />
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {t('reservationsList.columns.status')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {t('reservationsList.columns.bookingSource')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {t('reservationsList.columns.totalAmount')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {t('reservationsList.columns.paymentStatus')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {t('reservationsList.columns.guests')}
              </th>
              <SortableHeader
                column="booking_date"
                label={t('reservationsList.columns.bookingDate')}
                sortState={sortState}
                onSort={onSort}
              />
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="transition-colors hover:bg-gray-50">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(reservation.id)}
                    onChange={() => onToggleSelection(reservation.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-900">
                    {reservation.guests?.first_name} {reservation.guests?.last_name}
                  </div>
                  {reservation.guests?.email && (
                    <div className="text-sm text-gray-600">{reservation.guests.email}</div>
                  )}
                </td>
                <td className="px-4 py-4 text-gray-900">Room {reservation.room_id}</td>
                <td className="px-4 py-4 text-gray-900">{formatDate(reservation.check_in_date)}</td>
                <td className="px-4 py-4 text-gray-900">
                  {formatDate(reservation.check_out_date)}
                </td>
                <td className="px-4 py-4">
                  {getStatusBadge(reservation.reservation_statuses?.code ?? 'confirmed')}
                </td>
                <td className="px-4 py-4 text-gray-900">{reservation.booking_sources?.code}</td>
                <td className="px-4 py-4 font-semibold text-gray-900">
                  <ChargesTotal reservationId={reservation.id} />
                </td>
                <td className="px-4 py-4">
                  {getPaymentBadge(reservation.reservation_statuses?.code ?? '')}
                </td>
                <td className="px-4 py-4 text-gray-900">
                  {reservation.number_of_guests || reservation.adults}{' '}
                  {t('reservationsList.columns.guests')}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {formatDate(reservation.booking_date ?? '')}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetails(reservation)}
                      title={t('reservationsList.actions.view')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(reservation)}
                        title={t('reservationsList.actions.edit')}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(reservation)}
                        title={t('reservationsList.actions.delete')}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" title={t('common.actions')}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
