// CreateBookingModal - Simplified UI-only component (~200 lines)
// Uses BookingService and useBookingForm for clean separation

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { X, Calendar as CalendarIcon, CreditCard } from 'lucide-react';
import { Room, Guest, Reservation } from '../../../lib/hotel/types';
// Removed sample data import - now using real Supabase guests
import { useBookingForm } from '../../../lib/hotel/hooks/useBookingForm';
import { BookingService, BookingData } from '../../../lib/hotel/services/BookingService';
import { formatRoomNumber } from '../../../lib/hotel/calendarUtils';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
import hotelNotification from '../../../lib/notifications';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onCreateBooking: (bookingData: any) => void;
  preSelectedDates?: {checkIn: Date, checkOut: Date} | null;
  existingReservations?: Reservation[];
}

export default function CreateBookingModal({
  isOpen,
  onClose,
  room,
  onCreateBooking,
  preSelectedDates,
  existingReservations = []
}: CreateBookingModalProps) {
  const { createReservation, guests } = useHotel();
  const bookingService = BookingService.getInstance();
  
  // Initialize form with room and dates
  const {
    formState,
    bookingData,
    pricing,
    isValid,
    hasDateConflict,
    updateField,
    updateNewGuestField,
    validate,
    setSubmitting,
    reset,
    addChild,
    removeChild
  } = useBookingForm(room, {
    checkIn: preSelectedDates?.checkIn || new Date(),
    checkOut: preSelectedDates?.checkOut || new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  // Validate when form data changes
  useEffect(() => {
    if (formState.selectedRoom && formState.checkIn && formState.checkOut) {
      validate(existingReservations);
    }
  }, [formState.checkIn, formState.checkOut, formState.selectedRoom, existingReservations]); // Remove validate and bookingData from dependencies

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formState.isSubmitting) return;
    
    if (!validate(existingReservations)) {
      hotelNotification.error('Validation Failed', 'Please fix the errors before submitting');
      return;
    }

    try {
      setSubmitting(true);

      // Transform to reservation data
      const reservationData = bookingService.transformToReservationData(
        bookingData as BookingData, 
        pricing
      );

      // Create reservation
      await createReservation(reservationData);

      // Notification removed - this modal is deprecated, use ModernCreateBookingModal instead

      // Success notification
      const guestName = formState.isNewGuest 
        ? formState.newGuestData.fullName 
        : formState.selectedGuest?.fullName || 'Guest';
      
      hotelNotification.success(
        'Booking Created',
        `Reservation for ${guestName} in Room ${room.number} has been created successfully`
      );

      // Call parent callback and close
      onCreateBooking(reservationData);
      onClose();
      
    } catch (error) {
      console.error('Booking creation error:', error);
      hotelNotification.error('Booking Failed', 'Unable to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Create Booking - Room {formatRoomNumber(room)}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in Date</Label>
                <Input
                  type="date"
                  value={formState.checkIn.toISOString().split('T')[0]}
                  onChange={(e) => updateField('checkIn', new Date(e.target.value))}
                />
              </div>
              <div>
                <Label>Check-out Date</Label>
                <Input
                  type="date"
                  value={formState.checkOut.toISOString().split('T')[0]}
                  onChange={(e) => updateField('checkOut', new Date(e.target.value))}
                />
              </div>
            </div>

            {/* Guest Selection Toggle */}
            <div>
              <Label>Guest Type</Label>
              <div className="flex space-x-2 mt-1">
                <Button
                  type="button"
                  variant={!formState.isNewGuest ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateField('isNewGuest', false)}
                >
                  Existing Guest
                </Button>
                <Button
                  type="button"
                  variant={formState.isNewGuest ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateField('isNewGuest', true)}
                >
                  New Guest
                </Button>
              </div>
            </div>

            {/* Existing Guest Selection */}
            {!formState.isNewGuest && (
              <div>
                <Label>Select Guest</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={formState.selectedGuest?.id || ''}
                  onChange={(e) => {
                    const guest = guests.find(g => g.id === e.target.value);
                    updateField('selectedGuest', guest || null);
                  }}
                >
                  <option value="">Select a guest...</option>
                  {guests.map(guest => (
                    <option key={guest.id} value={guest.id}>
                      {guest.fullName} - {guest.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* New Guest Form */}
            {formState.isNewGuest && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={formState.newGuestData.firstName}
                      onChange={(e) => {
                        updateNewGuestField('firstName', e.target.value);
                        // Auto-update fullName
                        const fullName = `${e.target.value} ${formState.newGuestData.lastName}`.trim();
                        updateNewGuestField('fullName', fullName);
                      }}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formState.newGuestData.lastName}
                      onChange={(e) => {
                        updateNewGuestField('lastName', e.target.value);
                        // Auto-update fullName
                        const fullName = `${formState.newGuestData.firstName} ${e.target.value}`.trim();
                        updateNewGuestField('fullName', fullName);
                      }}
                      placeholder="Last name"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formState.newGuestData.email}
                      onChange={(e) => updateNewGuestField('email', e.target.value)}
                      placeholder="guest@email.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formState.newGuestData.phone}
                      onChange={(e) => updateNewGuestField('phone', e.target.value)}
                      placeholder="+385 XX XXX XXXX"
                    />
                  </div>
                  <div>
                    <Label>Nationality</Label>
                    <Input
                      value={formState.newGuestData.nationality}
                      onChange={(e) => updateNewGuestField('nationality', e.target.value)}
                      placeholder="German"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Occupancy */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Adults</Label>
                <Input
                  type="number"
                  min="1"
                  max={room.maxOccupancy}
                  value={formState.adults}
                  onChange={(e) => updateField('adults', parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>Children ({formState.children.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addChild({
                    name: `Child ${formState.children.length + 1}`,
                    dateOfBirth: new Date(),
                    age: 5
                  })}
                >
                  Add Child
                </Button>
              </div>
            </div>

            {/* Additional Options */}
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formState.hasPets}
                  onChange={(e) => updateField('hasPets', e.target.checked)}
                />
                <span>Has Pets (+€20)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formState.needsParking}
                  onChange={(e) => updateField('needsParking', e.target.checked)}
                />
                <span>Parking (+€7/night)</span>
              </label>
            </div>

            {/* Special Requests */}
            <div>
              <Label>Special Requests</Label>
              <Textarea
                value={formState.specialRequests}
                onChange={(e) => updateField('specialRequests', e.target.value)}
                placeholder="Any special requests or notes..."
                rows={3}
              />
            </div>

            {/* Validation Errors */}
            {formState.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <h4 className="font-medium text-red-800">Please fix these issues:</h4>
                <ul className="mt-1 text-red-700">
                  {formState.errors.map((error, index) => (
                    <li key={index}>• {error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pricing Summary */}
            {pricing && (
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Total Amount</div>
                      <div className="text-sm text-gray-600">
                        {pricing.nights} nights • All taxes included
                      </div>
                    </div>
                    <div className="text-xl font-bold text-blue-700">
                      {formatCurrency(pricing.grandTotal)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={!isValid || formState.isSubmitting}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {formState.isSubmitting ? 'Creating...' : 'Create Booking'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}