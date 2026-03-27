// ReservationPopup - UI-only component; all logic delegated to useReservationPopup

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Textarea } from '../../../ui/textarea';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  FileText,
  CreditCard,
  Check,
  LogIn,
  LogOut,
  Edit,
  Save,
  X,
  Send,
  Receipt,
  Printer,
  Download,
  Building2,
  CheckCircle,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { CalendarEvent, Company } from '../../../../lib/hotel/types';
import type { Reservation } from '../../../../lib/queries/hooks/useReservations';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { useReservationPopup } from './useReservationPopup';
import { ReservationState } from '../../../../lib/hotel/hooks/useReservationState';
import { FiscalData } from '../../../../lib/hotel/services/ReservationService';
import PaymentDetailsModal from './PaymentDetailsModal';
import CheckInWorkflow from '../CheckInOut/CheckInWorkflow';
import CheckOutWorkflow from '../CheckInOut/CheckOutWorkflow';
import { convertToDisplayName } from '../../../../lib/hotel/countryCodeUtils';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatusActionsProps {
  statusActions: Array<{
    status: string;
    label: string;
    icon: string;
    variant: 'default' | 'outline' | 'destructive';
  }>;
  isUpdating: boolean;
  onStatusUpdate: (status: string) => void;
}

const StatusActions = ({ statusActions, isUpdating, onStatusUpdate }: StatusActionsProps) => (
  <>
    {statusActions.map((action) => (
      <Button
        key={action.status}
        variant={action.variant}
        size="sm"
        onClick={() => onStatusUpdate(action.status)}
        disabled={isUpdating}
      >
        {action.icon === 'log-in' && <LogIn className="mr-1 h-4 w-4" />}
        {action.icon === 'log-out' && <LogOut className="mr-1 h-4 w-4" />}
        {action.icon === 'check' && <Check className="mr-1 h-4 w-4" />}
        {action.icon === 'x' && <X className="mr-1 h-4 w-4" />}
        {action.label}
      </Button>
    ))}
  </>
);

interface CompanyCardProps {
  company: Company;
}

const CompanyCard = ({ company }: CompanyCardProps) => (
  <Card className="border-blue-200 bg-blue-50/30">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Building2 className="h-5 w-5 text-blue-600" />
        <span>Company Billing (R1)</span>
        <Badge variant="outline" className="ml-2 border-blue-300 bg-blue-100 text-blue-800">
          Corporate
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Building2 className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">{company.name}</p>
              <p className="text-xs text-gray-500">Company Name</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <FileText className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">{company.oib}</p>
              <p className="text-xs text-gray-500">OIB (Tax Number)</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <MapPin className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm text-gray-700">{company.address}</p>
              <p className="text-sm text-gray-700">
                {company.postal_code} {company.city}
              </p>
              <p className="text-sm text-gray-700">{convertToDisplayName(company.country ?? '')}</p>
              <p className="text-xs text-gray-500">Address</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {company.contact_person && (
            <div className="flex items-start space-x-2">
              <User className="mt-0.5 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-700">{company.contact_person}</p>
                <p className="text-xs text-gray-500">Contact Person</p>
              </div>
            </div>
          )}
          {company.email && (
            <div className="flex items-start space-x-2">
              <Mail className="mt-0.5 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-700">{company.email}</p>
                <p className="text-xs text-gray-500">Email</p>
              </div>
            </div>
          )}
          {company.phone && (
            <div className="flex items-start space-x-2">
              <Phone className="mt-0.5 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-700">{company.phone}</p>
                <p className="text-xs text-gray-500">Phone</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface GuestCardProps {
  guest: Guest;
  reservation: Reservation;
  reservationStatusCode: string;
  isSendingEmail: boolean;
  onSendWelcome: () => void;
  onSendReminder: () => void;
}

const GuestCard = ({
  guest,
  reservation,
  reservationStatusCode,
  isSendingEmail,
  onSendWelcome,
  onSendReminder,
}: GuestCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <User className="h-5 w-5" />
        <span>Guest Information</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{guest.display_name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{guest.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{guest.phone}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{guest.nationality}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {reservation.adults} Adults
              {(reservation.children_count ?? 0) > 0 && `, ${reservation.children_count} Children`}
            </span>
          </div>
        </div>
      </div>
      {(reservationStatusCode === 'confirmed' || reservationStatusCode === 'checked-in') && (
        <div className="border-t pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={onSendWelcome}
              disabled={isSendingEmail || !guest.email}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {isSendingEmail ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Welcome Email
            </Button>
            <Button
              onClick={onSendReminder}
              disabled={isSendingEmail || !guest.email}
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              {isSendingEmail ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-orange-600" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Reminder
            </Button>
          </div>
          {!guest.email && (
            <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
              <X className="h-3.5 w-3.5" /> No email address on file
            </p>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

interface FiscalCardProps {
  fiscalData: FiscalData | null;
  isFiscalizing: boolean;
  isSendingEmail: boolean;
  guestEmail: string | null | undefined;
  onGenerateInvoice: () => void;
  onPrintReceipt: () => void;
  onEmailReceipt: () => void;
}

const FiscalCard = ({
  fiscalData,
  isFiscalizing,
  isSendingEmail,
  guestEmail,
  onGenerateInvoice,
  onPrintReceipt,
  onEmailReceipt,
}: FiscalCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Receipt className="h-5 w-5" />
        <span>Croatian Fiscal Invoices</span>
        {fiscalData && (
          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
            Fiscalized
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={onGenerateInvoice}
          disabled={isFiscalizing}
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {isFiscalizing ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Generate Fiscal Invoice
        </Button>
        <Button
          onClick={onPrintReceipt}
          disabled={isFiscalizing}
          variant="outline"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          {isFiscalizing ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-600" />
          ) : (
            <Printer className="mr-2 h-4 w-4" />
          )}
          Print Thermal Receipt
        </Button>
        <Button
          onClick={onEmailReceipt}
          disabled={isSendingEmail || isFiscalizing || !guestEmail}
          variant="outline"
          className="border-green-200 text-green-700 hover:bg-green-50"
        >
          {isSendingEmail || isFiscalizing ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-green-600" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Email Fiscal Receipt
        </Button>
      </div>
      <div className="mt-3 space-y-1 text-sm text-gray-600">
        <p className="flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5 text-gray-500" />
          <strong>Fiscal Invoice:</strong> Croatian Tax Authority compliant PDF with QR code and JIR
        </p>
        <p className="flex items-center gap-1.5">
          <Printer className="h-3.5 w-3.5 text-gray-500" />
          <strong>Thermal Receipt:</strong> 80mm format for receipt printers with fiscal data
        </p>
        <p className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-gray-500" />
          <strong>Email Receipt:</strong> Send professional fiscal invoice to guest automatically
        </p>
        {fiscalData && (
          <div className="mt-2 rounded-lg bg-green-50 p-2">
            <p className="flex items-center gap-1 font-medium text-green-800">
              <CheckCircle className="h-4 w-4" /> Fiscalized with Croatian Tax Authority
            </p>
            <p className="text-xs text-green-700">JIR: {fiscalData.jir}</p>
          </div>
        )}
        {!guestEmail && (
          <p className="mt-2 flex items-center gap-1 text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" /> No email address on file for guest
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

interface ReservationDetailsCardProps {
  reservation: Reservation;
  room: Room;
  state: ReservationState;
  onNoteChange: (note: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
}

const ReservationDetailsCard = ({
  reservation,
  room,
  state,
  onNoteChange,
  onSave,
  onCancelEdit,
}: ReservationDetailsCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Calendar className="h-5 w-5" />
        <span>Reservation Details</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Check-in</div>
          <div className="font-medium">
            {new Date(reservation.check_in_date).toLocaleDateString()}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Check-out</div>
          <div className="font-medium">
            {new Date(reservation.check_out_date).toLocaleDateString()}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Nights</div>
          <div className="font-medium">{reservation.number_of_nights ?? 1}</div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Room Type</div>
          <div className="font-medium">{room.name_english}</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm text-gray-500">Special Requests</div>
        {state.isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={state.editedNotes}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Enter special requests..."
              rows={3}
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={onSave}>
                <Save className="mr-1 h-4 w-4" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="font-medium">{reservation.special_requests || 'None'}</div>
        )}
      </div>
    </CardContent>
  </Card>
);

interface PaymentCardProps {
  chargesTotalAmount: number;
  nights: number;
  onViewBreakdown: () => void;
}

const PaymentCard = ({ chargesTotalAmount, nights, onViewBreakdown }: PaymentCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <CreditCard className="h-5 w-5" />
        <span>Payment Information</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">€{chargesTotalAmount.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Total Amount • {nights} nights</div>
        </div>
        <Button variant="outline" onClick={onViewBreakdown}>
          View Breakdown
        </Button>
      </div>
    </CardContent>
  </Card>
);

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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-yellow-600" />
              <span>Room {room.room_number} - Maintenance</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Out of Service
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Room {room.room_number}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{formatDates()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{reservation.special_requests}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
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

          <div className="space-y-6">
            {state.statusUpdateError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <div className="flex">
                  <X className="h-5 w-5 flex-shrink-0 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">{state.statusUpdateError}</div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={clearError}
                      className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {company && <CompanyCard company={company} />}

            <GuestCard
              guest={guest}
              reservation={reservation}
              reservationStatusCode={reservationStatusCode}
              isSendingEmail={state.isSendingEmail}
              onSendWelcome={handleSendWelcomeEmail}
              onSendReminder={handleSendReminderEmail}
            />

            {reservationStatusCode === 'checked-out' && (
              <FiscalCard
                fiscalData={state.fiscalData}
                isFiscalizing={state.isFiscalizing}
                isSendingEmail={state.isSendingEmail}
                guestEmail={guest.email}
                onGenerateInvoice={handleGenerateFiscalInvoice}
                onPrintReceipt={handlePrintThermalReceipt}
                onEmailReceipt={handleEmailFiscalReceipt}
              />
            )}

            <ReservationDetailsCard
              reservation={reservation}
              room={room}
              state={state}
              onNoteChange={(note) => updateState({ editedNotes: note })}
              onSave={handleSaveEdit}
              onCancelEdit={handleEditToggle}
            />

            <PaymentCard
              chargesTotalAmount={chargesTotalAmount}
              nights={reservation.number_of_nights ?? 1}
              onViewBreakdown={togglePaymentDetails}
            />
          </div>
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
