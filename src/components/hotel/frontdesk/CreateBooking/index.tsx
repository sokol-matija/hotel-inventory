import { useRef, useEffect } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { useCreateBookingForm } from './useCreateBookingForm';
import { RoomSelectionSection } from './RoomSelectionSection';
import { BookingDatesSection } from './BookingDatesSection';
import { BookingGuestsSection } from './BookingGuestsSection';
import { BookingServicesSection } from './BookingServicesSection';
import { CompanyBillingSection } from './CompanyBillingSection';
import { BookingLabelSection } from './BookingLabelSection';
import { BookingPricingTable } from './BookingPricingTable';

export interface ModernCreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  currentDate?: Date;
  preSelectedDates?: { checkIn: Date; checkOut: Date } | null;
  allowRoomSelection?: boolean;
  unallocatedMode?: boolean;
}

export default function ModernCreateBookingModal({
  isOpen,
  onClose,
  room,
  currentDate,
  preSelectedDates,
  allowRoomSelection = false,
  unallocatedMode = false,
}: ModernCreateBookingModalProps) {
  const form = useCreateBookingForm({
    room,
    currentDate,
    preSelectedDates,
    allowRoomSelection,
    unallocatedMode,
    onClose,
  });

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const card = cardRef.current;
    if (!card) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = card.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <Card
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="max-h-[95vh] w-full max-w-5xl overflow-y-auto"
        data-testid="create-booking-modal"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span id="booking-modal-title">
                {form.isUnallocated
                  ? 'Create Unallocated Reservation'
                  : form.selectedRoom
                    ? `Create Booking - Room ${form.selectedRoom.room_number}`
                    : 'Create Booking'}
              </span>
              {form.selectedRoom && (
                <Badge variant="outline">{form.selectedRoom.room_types?.code ?? ''}</Badge>
              )}
              {form.isUnallocated && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Unallocated
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close booking modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            {form.adultsCount} adult{form.adultsCount !== 1 ? 's' : ''}, {form.childrenCount} child
            {form.childrenCount !== 1 ? 'ren' : ''}
            {form.selectedRoom &&
              !form.isUnallocated &&
              ` • Max occupancy: ${form.selectedRoom.max_occupancy}`}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit} className="space-y-6">
            {allowRoomSelection && (
              <RoomSelectionSection
                isUnallocated={form.isUnallocated}
                setIsUnallocated={form.setIsUnallocated}
                selectedRoom={form.selectedRoom}
                setSelectedRoom={form.setSelectedRoom}
                availableRooms={form.availableRooms}
              />
            )}

            <BookingDatesSection
              checkInDate={form.checkInDate}
              setCheckInDate={form.setCheckInDate}
              checkOutDate={form.checkOutDate}
              setCheckOutDate={form.setCheckOutDate}
              numberOfNights={form.numberOfNights}
            />

            <BookingGuestsSection
              bookingGuests={form.bookingGuests}
              selectedRoom={form.selectedRoom}
              addAdult={form.addAdult}
              addChild={form.addChild}
              removeGuest={form.removeGuest}
              updateGuest={form.updateGuest}
              handleSelectExistingGuest={form.handleSelectExistingGuest}
            />

            <BookingServicesSection
              bookingServices={form.bookingServices}
              setBookingServices={form.setBookingServices}
            />

            <CompanyBillingSection
              isCompanyBilling={form.isCompanyBilling}
              setIsCompanyBilling={form.setIsCompanyBilling}
              selectedCompanyId={form.selectedCompanyId}
              setSelectedCompanyId={form.setSelectedCompanyId}
              companies={form.companies}
            />

            <BookingLabelSection
              hotelId={form.hotelId}
              selectedLabelId={form.selectedLabelId}
              setSelectedLabelId={form.setSelectedLabelId}
            />

            <BookingPricingTable
              previewCharges={form.previewCharges}
              chargesLoading={form.chargesLoading}
              chargeTotal={form.chargeTotal}
              chargesByType={form.chargesByType}
              isUnallocated={form.isUnallocated}
              selectedRoom={form.selectedRoom}
            />

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  form.isSubmitting ||
                  (form.chargesLoading && !form.isUnallocated && form.selectedRoom != null)
                }
                className="flex items-center"
                data-testid="submit-booking"
              >
                {(form.isSubmitting || form.chargesLoading) && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {form.isSubmitting
                  ? 'Creating Booking...'
                  : form.chargesLoading && !form.isUnallocated && form.selectedRoom != null
                    ? 'Calculating price...'
                    : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
