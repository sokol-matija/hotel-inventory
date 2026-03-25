// ReservationPopup - Simplified UI-only component using services and hooks
// Reduced from 810 lines to ~400 lines with clean architecture

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { CalendarEvent, Company } from '../../../../lib/hotel/types';
import { useReservationState } from '../../../../lib/hotel/hooks/useReservationState';
import { useReservationCharges } from '../../../../lib/queries/hooks/useReservationCharges';
import PaymentDetailsModal from './PaymentDetailsModal';
import CheckInWorkflow from '../CheckInOut/CheckInWorkflow';
import CheckOutWorkflow from '../CheckInOut/CheckOutWorkflow';
import { supabase } from '../../../../lib/supabase';
import { convertToDisplayName } from '../../../../lib/hotel/countryCodeUtils';

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

const StatusActions = ({ statusActions, isUpdating, onStatusUpdate }: StatusActionsProps) => {
  return (
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
};

interface ReservationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onStatusChange?: (reservationId: string, newStatus: string) => void;
}

export default function ReservationPopup({
  isOpen,
  onClose,
  event,
  onStatusChange,
}: ReservationPopupProps) {
  const {
    // State
    state,
    reservationData,
    isUpdating,

    // Operations
    handleEditToggle,
    handleSaveEdit,
    handleStatusUpdate,
    handleSendWelcomeEmail,
    handleSendReminderEmail,
    handleGenerateFiscalInvoice,
    handleEmailFiscalReceipt,
    handlePrintThermalReceipt,

    // Dialog management
    togglePaymentDetails,
    toggleCheckInWorkflow,
    toggleCheckOutWorkflow,

    // Helpers
    clearError,
    getStatusActions,
    formatDates,

    // Direct state updates
    updateState,
  } = useReservationState(event, onClose, onStatusChange);

  // Fetch charges to derive total from reservation_charges
  const numericReservationId = reservationData?.reservation
    ? typeof reservationData.reservation.id === 'string'
      ? parseInt(reservationData.reservation.id, 10)
      : reservationData.reservation.id
    : undefined;
  const { data: charges = [] } = useReservationCharges(numericReservationId as number | undefined);
  const chargesTotalAmount = charges.reduce((sum, c) => sum + c.total, 0);

  // State for company data (R1 billing)
  const [company, setCompany] = useState<Company | null>(null);
  const [, setLoadingCompany] = useState(false);

  // Fetch company data if this is an R1 reservation
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!reservationData) return;

      const res = reservationData.reservation as unknown as Record<string, unknown>;
      if (res.is_r1 && res.company_id) {
        setLoadingCompany(true);
        try {
          const { data: companyData, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', Number(res.company_id))
            .single();

          if (error) {
            console.error('Error fetching company:', error);
          } else if (companyData) {
            // Company type is now the DB row type directly
            setCompany(companyData);
          }
        } catch (error) {
          console.error('Error loading company data:', error);
        } finally {
          setLoadingCompany(false);
        }
      }
    };

    fetchCompanyData();
  }, [reservationData]);

  if (!event) return null;

  // Handle case where reservation data couldn't be loaded
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

  // Handle maintenance reservations differently
  if (isMaintenanceReservation) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>🔧 Room {room.room_number} - Maintenance</span>
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

  // Get available status actions
  const statusActions = getStatusActions();

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
            {/* Error Display */}
            {state.statusUpdateError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
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

            {/* Company Information (R1 Billing) */}
            {company && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <span>Company Billing (R1)</span>
                    <Badge
                      variant="outline"
                      className="ml-2 border-blue-300 bg-blue-100 text-blue-800"
                    >
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
                          <p className="text-sm text-gray-700">
                            {convertToDisplayName(company.country ?? '')}
                          </p>
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
            )}

            {/* Guest Information */}
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
                        {(reservation.children_count ?? 0) > 0 &&
                          `, ${reservation.children_count} Children`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Actions - Only for confirmed or checked-in reservations */}
                {((reservation.reservation_statuses?.code ?? '') === 'confirmed' ||
                  (reservation.reservation_statuses?.code ?? '') === 'checked-in') && (
                  <div className="border-t pt-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        onClick={handleSendWelcomeEmail}
                        disabled={state.isSendingEmail || !guest.email}
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        {state.isSendingEmail ? (
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Send Welcome Email
                      </Button>

                      <Button
                        onClick={handleSendReminderEmail}
                        disabled={state.isSendingEmail || !guest.email}
                        variant="outline"
                        className="border-orange-200 text-orange-700 hover:bg-orange-50"
                      >
                        {state.isSendingEmail ? (
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-orange-600"></div>
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Send Reminder
                      </Button>
                    </div>
                    {!guest.email && (
                      <p className="mt-2 text-sm text-red-600">⚠️ No email address on file</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Croatian Fiscal Invoices - Only show for checked-out reservations */}
            {(reservation.reservation_statuses?.code ?? '') === 'checked-out' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Receipt className="h-5 w-5" />
                    <span>Croatian Fiscal Invoices</span>
                    {state.fiscalData && (
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                        Fiscalized
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={handleGenerateFiscalInvoice}
                      disabled={state.isFiscalizing}
                      className="bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      {state.isFiscalizing ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Generate Fiscal Invoice
                    </Button>

                    <Button
                      onClick={handlePrintThermalReceipt}
                      disabled={state.isFiscalizing}
                      variant="outline"
                      className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      {state.isFiscalizing ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                      ) : (
                        <Printer className="mr-2 h-4 w-4" />
                      )}
                      Print Thermal Receipt
                    </Button>

                    <Button
                      onClick={handleEmailFiscalReceipt}
                      disabled={state.isSendingEmail || state.isFiscalizing || !guest?.email}
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      {state.isSendingEmail || state.isFiscalizing ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-green-600"></div>
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Email Fiscal Receipt
                    </Button>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    <p>
                      🧾 <strong>Fiscal Invoice:</strong> Croatian Tax Authority compliant PDF with
                      QR code and JIR
                    </p>
                    <p className="mt-1">
                      🖨️ <strong>Thermal Receipt:</strong> 80mm format for receipt printers with
                      fiscal data
                    </p>
                    <p className="mt-1">
                      📧 <strong>Email Receipt:</strong> Send professional fiscal invoice to guest
                      automatically
                    </p>
                    {state.fiscalData && (
                      <div className="mt-2 rounded-lg bg-green-50 p-2">
                        <p className="font-medium text-green-800">
                          ✅ Fiscalized with Croatian Tax Authority
                        </p>
                        <p className="text-xs text-green-700">JIR: {state.fiscalData.jir}</p>
                      </div>
                    )}
                    {!guest?.email && (
                      <p className="mt-2 text-red-600">⚠️ No email address on file for guest</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reservation Details */}
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

                {/* Special Requests */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Special Requests</div>
                  {state.isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={state.editedNotes}
                        onChange={(e) => updateState({ editedNotes: e.target.value })}
                        placeholder="Enter special requests..."
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="mr-1 h-4 w-4" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleEditToggle}>
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

            {/* Payment Information */}
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
                    <div className="text-sm text-gray-500">
                      Total Amount • {reservation.number_of_nights ?? 1} nights
                    </div>
                  </div>
                  <Button variant="outline" onClick={togglePaymentDetails}>
                    View Breakdown
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        isOpen={state.showPaymentDetails}
        onClose={togglePaymentDetails}
        reservation={reservation}
        guest={guest}
        room={room}
      />

      {/* Check-In Workflow */}
      <CheckInWorkflow
        isOpen={state.showCheckInWorkflow}
        onClose={() => {
          toggleCheckInWorkflow();
          // Close the main popup after successful check-in
          setTimeout(() => onClose(), 1000);
        }}
        reservation={reservation}
      />

      {/* Check-Out Workflow */}
      <CheckOutWorkflow
        isOpen={state.showCheckOutWorkflow}
        onClose={() => {
          toggleCheckOutWorkflow();
          // Close the main popup after successful check-out
          setTimeout(() => onClose(), 1000);
        }}
        reservation={reservation}
      />
    </>
  );
}
