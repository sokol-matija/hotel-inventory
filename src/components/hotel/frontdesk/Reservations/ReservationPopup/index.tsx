// ReservationPopup - UI-only component; all logic delegated to useReservationPopup

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../ui/dialog';
import { Button } from '../../../../ui/button';
import { Badge } from '../../../../ui/badge';
import { Edit, X } from 'lucide-react';
import { CalendarEvent } from '../../../../../lib/hotel/types';
import { useReservationPopup } from '../useReservationPopup';
import PaymentDetailsModal from '../PaymentDetailsModal';
import CheckInWorkflow from '../../CheckInOut/CheckInWorkflow';
import CheckOutWorkflow from '../../CheckInOut/CheckOutWorkflow';
import { StatusActions } from './StatusActions';
import { MaintenanceReservationView } from './MaintenanceReservationView';
import { ReservationPopupContent } from './ReservationPopupContent';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReservationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onStatusChange?: (reservationId: string, newStatus: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReservationPopup({
  isOpen,
  onClose,
  event,
  onStatusChange,
}: ReservationPopupProps) {
  const {
    state,
    reservationData,
    isUpdating,
    handleEditToggle,
    handleSaveEdit,
    handleStatusUpdate,
    handleSendWelcomeEmail,
    handleSendReminderEmail,
    handleGenerateFiscalInvoice,
    handleEmailFiscalReceipt,
    handlePrintThermalReceipt,
    togglePaymentDetails,
    toggleCheckInWorkflow,
    toggleCheckOutWorkflow,
    clearError,
    getStatusActions,
    formatDates,
    updateState,
    chargesTotalAmount,
    company,
  } = useReservationPopup(event, onClose, onStatusChange);

  if (!event) return null;

  if (!reservationData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reservation Not Found</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Could not load reservation details.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const { reservation, guest, room, statusColors, isMaintenanceReservation } = reservationData;

  if (isMaintenanceReservation) {
    return (
      <MaintenanceReservationView
        isOpen={isOpen}
        onClose={onClose}
        reservation={reservation}
        room={room}
        formatDates={formatDates}
      />
    );
  }

  const statusActions = getStatusActions();
  const reservationStatusCode = reservation.reservation_statuses?.code ?? '';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span>Room {room.room_number}</span>
                <Badge
                  style={{
                    backgroundColor: statusColors.backgroundColor,
                    color: statusColors.textColor,
                    borderColor: statusColors.borderColor,
                  }}
                  className="border"
                >
                  {statusColors.label}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleEditToggle}>
                  {state.isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  {state.isEditing ? 'Cancel' : 'Edit'}
                </Button>
                <StatusActions
                  statusActions={statusActions}
                  isUpdating={isUpdating}
                  onStatusUpdate={handleStatusUpdate}
                />
              </div>
            </DialogTitle>
          </DialogHeader>

          <ReservationPopupContent
            reservation={reservation}
            guest={guest}
            room={room}
            state={state}
            reservationStatusCode={reservationStatusCode}
            company={company}
            chargesTotalAmount={chargesTotalAmount}
            clearError={clearError}
            handleSendWelcomeEmail={handleSendWelcomeEmail}
            handleSendReminderEmail={handleSendReminderEmail}
            handleGenerateFiscalInvoice={handleGenerateFiscalInvoice}
            handlePrintThermalReceipt={handlePrintThermalReceipt}
            handleEmailFiscalReceipt={handleEmailFiscalReceipt}
            handleSaveEdit={handleSaveEdit}
            handleEditToggle={handleEditToggle}
            togglePaymentDetails={togglePaymentDetails}
            updateState={updateState}
          />
        </DialogContent>
      </Dialog>

      <PaymentDetailsModal
        isOpen={state.showPaymentDetails}
        onClose={togglePaymentDetails}
        reservation={reservation}
        guest={guest}
        room={room}
      />

      <CheckInWorkflow
        isOpen={state.showCheckInWorkflow}
        onClose={() => {
          toggleCheckInWorkflow();
          setTimeout(() => onClose(), 1000);
        }}
        reservation={reservation}
      />

      <CheckOutWorkflow
        isOpen={state.showCheckOutWorkflow}
        onClose={() => {
          toggleCheckOutWorkflow();
          setTimeout(() => onClose(), 1000);
        }}
        reservation={reservation}
      />
    </>
  );
}
