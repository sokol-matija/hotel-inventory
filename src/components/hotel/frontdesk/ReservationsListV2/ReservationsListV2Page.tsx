import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/queries/queryKeys';
import ReservationPopup from '@/components/hotel/frontdesk/Reservations/ReservationPopup';
import { EditReservationSheet } from '@/components/hotel/frontdesk/EditReservation/EditReservationSheet';
import type { CalendarEvent, ReservationStatus } from '@/lib/hotel/types';
import type { ReservationListRow } from '@/hooks/useReservationsListQuery';
import { ReservationsDataTable } from './ReservationsDataTable';

function toCalendarEvent(row: ReservationListRow): CalendarEvent {
  const guestName =
    row.guests?.full_name ??
    `${row.guests?.first_name ?? ''} ${row.guests?.last_name ?? ''}`.trim() ??
    'Unknown';
  const roomNumber = row.rooms?.room_number ?? '';
  const statusCode = (row.reservation_statuses?.code ?? 'confirmed') as ReservationStatus;

  return {
    id: String(row.id),
    reservationId: String(row.id),
    roomId: String(row.room_id),
    title: `${guestName} - ${roomNumber}`,
    start: new Date(row.check_in_date),
    end: new Date(row.check_out_date),
    resource: {
      status: statusCode,
      guestName,
      roomNumber,
      numberOfGuests: (row.adults ?? 0) + (row.children_count ?? 0),
      hasPets: row.has_pets ?? false,
    },
  };
}

export default function ReservationsListV2Page() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editReservationId, setEditReservationId] = useState<number | null>(null);

  const handleViewDetails = useCallback((row: ReservationListRow) => {
    setSelectedEvent(toCalendarEvent(row));
    setIsPopupOpen(true);
  }, []);

  const handleClosePopup = useCallback(() => {
    setIsPopupOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
  }, [queryClient]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('reservationsList.title', 'Reservations')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('reservationsList.subtitle', 'View and manage all hotel reservations')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('reservationsList.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Data table */}
      <ReservationsDataTable onViewDetails={handleViewDetails} onEdit={setEditReservationId} />

      {/* Reservation popup */}
      <ReservationPopup isOpen={isPopupOpen} onClose={handleClosePopup} event={selectedEvent} />

      {/* Edit reservation sheet */}
      <EditReservationSheet
        reservationId={editReservationId}
        onClose={() => setEditReservationId(null)}
        onSaved={handleRefresh}
      />
    </div>
  );
}
