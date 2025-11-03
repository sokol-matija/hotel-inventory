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
  Mail,
  Receipt,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign
} from 'lucide-react';
import { Reservation } from '../../../../lib/hotel/types';
import { SortState } from '../../../../hooks/useReservationsList';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';

interface ReservationsTableProps {
  reservations: Reservation[];
  sortState: SortState;
  onSort: (column: SortState['sortBy']) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onViewDetails: (reservation: Reservation) => void;
  onEdit?: (reservation: Reservation) => void;
  onDelete?: (reservation: Reservation) => void;
  isLoading?: boolean;
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
  isLoading = false
}: ReservationsTableProps) {
  const { t } = useTranslation();

  // Status badge color mapping
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      'confirmed': { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
      'checked-in': { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
      'checked-out': { variant: 'secondary', icon: <CheckCircle className="w-3 h-3" /> },
      'cancelled': { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
      'no-show': { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
      'room-closure': { variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      'unallocated': { variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      'incomplete-payment': { variant: 'outline', icon: <DollarSign className="w-3 h-3" /> }
    };

    const config = statusMap[status] || statusMap['confirmed'];

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        <span>{status}</span>
      </Badge>
    );
  };

  // Payment status badge
  const getPaymentBadge = (status?: string) => {
    if (!status) return null;

    const statusMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'paid': 'default',
      'partial': 'secondary',
      'pending': 'secondary',
      'refunded': 'destructive',
      'cancelled': 'destructive'
    };

    return (
      <Badge variant={statusMap[status] || 'secondary'} className="text-xs">
        {status}
      </Badge>
    );
  };

  // Sortable column header
  const SortableHeader = ({
    column,
    label,
    className = ''
  }: {
    column: SortState['sortBy'];
    label: string;
    className?: string;
  }) => {
    const isSorted = sortState.sortBy === column;
    const isAsc = sortState.sortOrder === 'asc';

    return (
      <th className={`px-4 py-3 text-left ${className}`}>
        <button
          onClick={() => onSort(column)}
          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 transition-colors group"
        >
          <span>{label}</span>
          {isSorted ? (
            isAsc ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
          ) : (
            <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
        </button>
      </th>
    );
  };

  // Format date helper
  const formatDate = (date: Date) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Mobile card view for responsive design
  const MobileCard = ({ reservation }: { reservation: Reservation }) => (
    <Card className="p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.has(reservation.id)}
            onChange={() => onToggleSelection(reservation.id)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <div>
            <h3 className="font-semibold text-gray-900">
              {reservation.guest?.firstName} {reservation.guest?.lastName}
            </h3>
            <p className="text-sm text-gray-600">
              Room {reservation.roomId} • {formatDate(reservation.checkIn)}
            </p>
          </div>
        </div>
        {getStatusBadge(reservation.status)}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-600">{t('reservationsList.columns.checkIn')}:</span>
          <p className="font-medium">{formatDate(reservation.checkIn)}</p>
        </div>
        <div>
          <span className="text-gray-600">{t('reservationsList.columns.checkOut')}:</span>
          <p className="font-medium">{formatDate(reservation.checkOut)}</p>
        </div>
        <div>
          <span className="text-gray-600">{t('reservationsList.columns.totalAmount')}:</span>
          <p className="font-medium">{formatCurrency(reservation.totalAmount)}</p>
        </div>
        <div>
          <span className="text-gray-600">{t('reservationsList.columns.paymentStatus')}:</span>
          <div>{getPaymentBadge(reservation.paymentStatus)}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onViewDetails(reservation)}>
          <Eye className="w-4 h-4 mr-1" />
          {t('reservationsList.actions.view')}
        </Button>
        {onEdit && (
          <Button size="sm" variant="outline" onClick={() => onEdit(reservation)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (reservations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Receipt className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('reservationsList.noReservationsFound')}
        </h3>
        <p className="text-gray-600">
          {t('reservationsList.noReservationsYet')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden">
        {reservations.map((reservation) => (
          <MobileCard key={reservation.id} reservation={reservation} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === reservations.length && reservations.length > 0}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <SortableHeader column="guest_name" label={t('reservationsList.columns.guest')} />
              <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">
                {t('reservationsList.columns.room')}
              </th>
              <SortableHeader column="check_in_date" label={t('reservationsList.columns.checkIn')} />
              <SortableHeader column="check_out_date" label={t('reservationsList.columns.checkOut')} />
              <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">
                {t('reservationsList.columns.status')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">
                {t('reservationsList.columns.bookingSource')}
              </th>
              <SortableHeader column="total_amount" label={t('reservationsList.columns.totalAmount')} />
              <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">
                {t('reservationsList.columns.paymentStatus')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700">
                {t('reservationsList.columns.guests')}
              </th>
              <SortableHeader column="booking_date" label={t('reservationsList.columns.bookingDate')} />
              <th className="px-4 py-3 text-right font-semibold text-sm text-gray-700">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reservations.map((reservation) => (
              <tr
                key={reservation.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(reservation.id)}
                    onChange={() => onToggleSelection(reservation.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-900">
                    {reservation.guest?.firstName} {reservation.guest?.lastName}
                  </div>
                  {reservation.guest?.email && (
                    <div className="text-sm text-gray-600">{reservation.guest.email}</div>
                  )}
                </td>
                <td className="px-4 py-4 text-gray-900">
                  Room {reservation.roomId}
                </td>
                <td className="px-4 py-4 text-gray-900">
                  {formatDate(reservation.checkIn)}
                </td>
                <td className="px-4 py-4 text-gray-900">
                  {formatDate(reservation.checkOut)}
                </td>
                <td className="px-4 py-4">
                  {getStatusBadge(reservation.status)}
                </td>
                <td className="px-4 py-4 text-gray-900">
                  {reservation.bookingSource}
                </td>
                <td className="px-4 py-4 font-semibold text-gray-900">
                  {formatCurrency(reservation.totalAmount)}
                </td>
                <td className="px-4 py-4">
                  {getPaymentBadge(reservation.paymentStatus)}
                </td>
                <td className="px-4 py-4 text-gray-900">
                  {reservation.numberOfGuests || reservation.adults} {t('reservationsList.columns.guests')}
                </td>
                <td className="px-4 py-4 text-gray-600 text-sm">
                  {formatDate(reservation.bookingDate)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetails(reservation)}
                      title={t('reservationsList.actions.view')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(reservation)}
                        title={t('reservationsList.actions.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(reservation)}
                        title={t('reservationsList.actions.delete')}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      title={t('common.actions')}
                    >
                      <MoreHorizontal className="w-4 h-4" />
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
