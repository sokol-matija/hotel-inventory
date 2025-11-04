// ReservationPopup - Simplified UI-only component using services and hooks
// Reduced from 810 lines to ~400 lines with clean architecture

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';
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
  Building2
} from 'lucide-react';
import { CalendarEvent, Company } from '../../../../lib/hotel/types';
import { useReservationState } from '../../../../lib/hotel/hooks/useReservationState';
import PaymentDetailsModal from './PaymentDetailsModal';
import CheckInWorkflow from '../CheckInOut/CheckInWorkflow';
import CheckOutWorkflow from '../CheckInOut/CheckOutWorkflow';
import { supabase } from '../../../../lib/supabase';
import { convertToDisplayName } from '../../../../lib/hotel/countryCodeUtils';

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
  onStatusChange
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
    updateState
  } = useReservationState(event, onClose, onStatusChange);

  // State for company data (R1 billing)
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);

  // Fetch company data if this is an R1 reservation
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!reservationData) return;

      const res = reservationData.reservation as any;
      if (res.is_r1 && res.company_id) {
        setLoadingCompany(true);
        try {
          const { data: companyData, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', res.company_id)
            .single();

          if (error) {
            console.error('Error fetching company:', error);
          } else if (companyData) {
            // Transform to Company type
            setCompany({
              id: companyData.id,
              name: companyData.name,
              oib: companyData.oib,
              address: {
                street: companyData.address,
                city: companyData.city,
                postalCode: companyData.postal_code,
                country: companyData.country
              },
              contactPerson: companyData.contact_person,
              email: companyData.email,
              phone: companyData.phone,
              fax: companyData.fax,
              pricingTierId: companyData.pricing_tier_id,
              roomAllocationGuarantee: companyData.room_allocation_guarantee,
              isActive: companyData.is_active,
              notes: companyData.notes,
              createdAt: companyData.created_at,
              updatedAt: companyData.updated_at
            });
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
              <span>🔧 Room {room.number} - Maintenance</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Out of Service
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Room {room.number}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {formatDates()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {reservation.specialRequests}
                  </span>
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

  // Render status action buttons
  const renderStatusActions = () => {
    return statusActions.map(action => (
      <Button
        key={action.status}
        variant={action.variant}
        size="sm"
        onClick={() => handleStatusUpdate(action.status)}
        disabled={isUpdating}
      >
        {action.icon === 'log-in' && <LogIn className="h-4 w-4 mr-1" />}
        {action.icon === 'log-out' && <LogOut className="h-4 w-4 mr-1" />}
        {action.icon === 'check' && <Check className="h-4 w-4 mr-1" />}
        {action.icon === 'x' && <X className="h-4 w-4 mr-1" />}
        {action.label}
      </Button>
    ));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span>Room {room.number}</span>
                <Badge
                  style={{ 
                    backgroundColor: statusColors.backgroundColor,
                    color: statusColors.textColor,
                    borderColor: statusColors.borderColor
                  }}
                  className="border"
                >
                  {statusColors.label}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                >
                  {state.isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  {state.isEditing ? 'Cancel' : 'Edit'}
                </Button>
                {renderStatusActions()}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Error Display */}
            {state.statusUpdateError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {state.statusUpdateError}
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={clearError}
                      className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                    >
                      <X className="w-3 h-3" />
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
                    <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-300">
                      Corporate
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <Building2 className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900">{company.name}</p>
                          <p className="text-xs text-gray-500">Company Name</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{company.oib}</p>
                          <p className="text-xs text-gray-500">OIB (Tax Number)</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-700">{company.address.street}</p>
                          <p className="text-sm text-gray-700">
                            {company.address.postalCode} {company.address.city}
                          </p>
                          <p className="text-sm text-gray-700">
                            {convertToDisplayName(company.address.country)}
                          </p>
                          <p className="text-xs text-gray-500">Address</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {company.contactPerson && (
                        <div className="flex items-start space-x-2">
                          <User className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-700">{company.contactPerson}</p>
                            <p className="text-xs text-gray-500">Contact Person</p>
                          </div>
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-start space-x-2">
                          <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-700">{company.email}</p>
                            <p className="text-xs text-gray-500">Email</p>
                          </div>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-start space-x-2">
                          <Phone className="h-4 w-4 text-blue-600 mt-0.5" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{guest.fullName}</span>
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
                        {reservation.adults} Adults{guest.children.length > 0 && `, ${guest.children.length} Children`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Actions - Only for confirmed or checked-in reservations */}
                {(reservation.status === 'confirmed' || reservation.status === 'checked-in') && (
                  <div className="pt-4 border-t">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleSendWelcomeEmail}
                        disabled={state.isSendingEmail || !guest.email}
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        {state.isSendingEmail ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
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
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
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
            {reservation.status === 'checked-out' && (
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleGenerateFiscalInvoice}
                      disabled={state.isFiscalizing}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {state.isFiscalizing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                      ) : (
                        <Printer className="h-4 w-4 mr-2" />
                      )}
                      Print Thermal Receipt
                    </Button>

                    <Button
                      onClick={handleEmailFiscalReceipt}
                      disabled={state.isSendingEmail || state.isFiscalizing || !guest?.email}
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      {(state.isSendingEmail || state.isFiscalizing) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Email Fiscal Receipt
                    </Button>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-600">
                    <p>🧾 <strong>Fiscal Invoice:</strong> Croatian Tax Authority compliant PDF with QR code and JIR</p>
                    <p className="mt-1">🖨️ <strong>Thermal Receipt:</strong> 80mm format for receipt printers with fiscal data</p>
                    <p className="mt-1">📧 <strong>Email Receipt:</strong> Send professional fiscal invoice to guest automatically</p>
                    {state.fiscalData && (
                      <div className="mt-2 p-2 bg-green-50 rounded-lg">
                        <p className="text-green-800 font-medium">✅ Fiscalized with Croatian Tax Authority</p>
                        <p className="text-green-700 text-xs">JIR: {state.fiscalData.jir}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Check-in</div>
                    <div className="font-medium">{reservation.checkIn.toLocaleDateString()}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Check-out</div>
                    <div className="font-medium">{reservation.checkOut.toLocaleDateString()}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Nights</div>
                    <div className="font-medium">{reservation.numberOfNights}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Room Type</div>
                    <div className="font-medium">{room.nameEnglish}</div>
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
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleEditToggle}>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-medium">{reservation.specialRequests || 'None'}</div>
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
                    <div className="text-lg font-bold">
                      €{reservation.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Amount • {reservation.numberOfNights} nights
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={togglePaymentDetails}
                  >
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