import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
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
  Send
} from 'lucide-react';
import { CalendarEvent, Reservation, Guest } from '../../../../lib/hotel/types';
import { SAMPLE_GUESTS } from '../../../../lib/hotel/sampleData';
import { HOTEL_POREC_ROOMS } from '../../../../lib/hotel/hotelData';
import { RESERVATION_STATUS_COLORS } from '../../../../lib/hotel/calendarUtils';
import { useHotel } from '../../../../lib/hotel/state/HotelContext';
import { HotelEmailService } from '../../../../lib/emailService';
import hotelNotification from '../../../../lib/notifications';
import PaymentDetailsModal from './PaymentDetailsModal';
import CheckInWorkflow from '../CheckInOut/CheckInWorkflow';
import CheckOutWorkflow from '../CheckInOut/CheckOutWorkflow';

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
  const { reservations, updateReservationStatus, updateReservationNotes, isUpdating } = useHotel();
  const [isEditing, setIsEditing] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showCheckInWorkflow, setShowCheckInWorkflow] = useState(false);
  const [showCheckOutWorkflow, setShowCheckOutWorkflow] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  if (!event) return null;

  // Find the reservation and guest data
  const reservation = reservations.find(r => r.id === event.reservationId);
  const guest = SAMPLE_GUESTS.find(g => g.id === reservation?.guestId);
  const room = HOTEL_POREC_ROOMS.find(r => r.id === event.roomId);
  
  if (!reservation || !guest || !room) {
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

  const statusColors = RESERVATION_STATUS_COLORS[reservation.status];
  const isMaintenanceReservation = reservation.guestId === 'system-maintenance';

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedNotes('');
    } else {
      setEditedNotes(reservation.specialRequests || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveEdit = async () => {
    try {
      setStatusUpdateError(null);
      await updateReservationNotes(reservation.id, editedNotes);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
      setStatusUpdateError('Failed to save notes. Please try again.');
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setStatusUpdateError(null);
      await updateReservationStatus(reservation.id, newStatus as any);
      
      // Also call the original callback if provided
      if (onStatusChange) {
        onStatusChange(reservation.id, newStatus);
      }
      
      // Close popup after successful status change
      setTimeout(() => {
        onClose();
      }, 1000); // Give user time to see the update
      
    } catch (error) {
      console.error('Failed to update status:', error);
      setStatusUpdateError('Failed to update reservation status. Please try again.');
    }
  };

  const handleSendWelcomeEmail = async () => {
    if (!reservation) return;
    
    try {
      setIsSendingEmail(true);
      const result = await HotelEmailService.sendWelcomeEmail(reservation);
      
      if (result.success) {
        hotelNotification.success(
          'Welcome Email Sent!',
          `Guest information sent to ${guest?.email || 'guest'}`,
          4
        );
      } else {
        hotelNotification.error(
          'Email Failed',
          result.message,
          5
        );
      }
    } catch (error) {
      console.error('Error sending email:', error);
      hotelNotification.error(
        'Email Error',
        'Failed to send welcome email. Please try again.',
        5
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendReminderEmail = async () => {
    if (!reservation) return;
    
    try {
      setIsSendingEmail(true);
      const result = await HotelEmailService.sendReminderEmail(reservation);
      
      if (result.success) {
        hotelNotification.success(
          'Reminder Email Sent!',
          `Reminder sent to ${guest?.email || 'guest'}`,
          4
        );
      } else {
        hotelNotification.error(
          'Email Failed',
          result.message,
          5
        );
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      hotelNotification.error(
        'Email Error',
        'Failed to send reminder email. Please try again.',
        5
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusActions = () => {
    switch (reservation.status) {
      case 'confirmed':
        return (
          <Button
            onClick={() => setShowCheckInWorkflow(true)}
            className="bg-green-600 hover:bg-green-700"
            disabled={isUpdating}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Start Check-In
          </Button>
        );
      case 'checked-in':
        return (
          <Button
            onClick={() => setShowCheckOutWorkflow(true)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isUpdating}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Start Check-Out
          </Button>
        );
      case 'incomplete-payment':
        return (
          <Button
            onClick={() => handleStatusUpdate('confirmed')}
            className="bg-orange-600 hover:bg-orange-700"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {isUpdating ? 'Updating...' : 'Mark Paid'}
          </Button>
        );
      default:
        return null;
    }
  };

  if (isMaintenanceReservation) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>🔧</span>
              <span>Room Maintenance</span>
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
                    {reservation.checkIn.toLocaleDateString()} - {reservation.checkOut.toLocaleDateString()}
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
                  {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
                {getStatusActions()}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Error Display */}
            {statusUpdateError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {statusUpdateError}
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        onClick={() => setStatusUpdateError(null)}
                        className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
                      <span className="font-medium">{guest.name}</span>
                      {guest.isVip && (
                        <Badge variant="secondary" className="text-xs">VIP</Badge>
                      )}
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
                      <span className="text-sm text-gray-600">
                        🌍 {guest.nationality} • {guest.preferredLanguage.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {reservation.numberOfGuests} guests
                        {guest.children.length > 0 && ` (${guest.children.length} children)`}
                      </span>
                    </div>
                    {guest.hasPets && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">🐕 Pet-friendly booking</span>
                      </div>
                    )}
                  </div>
                </div>

                {guest.children.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-sm text-blue-900 mb-2">Children</h4>
                    <div className="space-y-1">
                      {guest.children.map((child, index) => (
                        <div key={index} className="text-sm text-blue-800">
                          {child.name} (Age {child.age})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guest Communication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Guest Communication</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSendWelcomeEmail}
                    disabled={isSendingEmail || !guest?.email}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSendingEmail ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Welcome Email
                  </Button>
                  
                  <Button
                    onClick={handleSendReminderEmail}
                    disabled={isSendingEmail || !guest?.email}
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    {isSendingEmail ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Reminder
                  </Button>
                </div>
                
                <div className="mt-3 text-sm text-gray-600">
                  <p>📧 <strong>Welcome Email:</strong> Includes breakfast times, WiFi details, check-in instructions, and local recommendations</p>
                  <p className="mt-1">⏰ <strong>Reminder Email:</strong> Simple reminder about upcoming stay with key details</p>
                  {!guest?.email && (
                    <p className="mt-2 text-red-600">⚠️ No email address on file for this guest</p>
                  )}
                </div>
              </CardContent>
            </Card>

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

                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Booking Source</div>
                  <Badge variant="outline" className="text-xs">
                    {reservation.bookingSource}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Special Requests</div>
                    {isEditing && (
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    )}
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      className="w-full p-2 text-sm border rounded-md resize-none"
                      rows={3}
                      placeholder="Enter special requests..."
                    />
                  ) : (
                    <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded-md">
                      {reservation.specialRequests || 'No special requests'}
                    </div>
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
                    onClick={() => setShowPaymentDetails(true)}
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
        isOpen={showPaymentDetails}
        onClose={() => setShowPaymentDetails(false)}
        reservation={reservation}
        guest={guest}
        room={room}
      />

      {/* Check-In Workflow */}
      <CheckInWorkflow
        isOpen={showCheckInWorkflow}
        onClose={() => {
          setShowCheckInWorkflow(false);
          // Close the main popup after successful check-in
          setTimeout(() => onClose(), 1000);
        }}
        reservation={reservation}
      />

      {/* Check-Out Workflow */}
      <CheckOutWorkflow
        isOpen={showCheckOutWorkflow}
        onClose={() => {
          setShowCheckOutWorkflow(false);
          // Close the main popup after successful check-out
          setTimeout(() => onClose(), 1000);
        }}
        reservation={reservation}
      />
    </>
  );
}