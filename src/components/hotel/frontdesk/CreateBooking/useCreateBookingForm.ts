import { useState } from 'react';
import type { Company } from '@/lib/queries/hooks/useCompanies';
import { useCompanies } from '@/lib/queries/hooks/useCompanies';
import type { Guest } from '@/lib/queries/hooks/useGuests';
import { useCreateFullBooking } from '@/lib/queries/hooks/useReservations';
import { sendRoom401BookingNotification, type BookingNotificationData } from '@/lib/ntfy';
import { virtualRoomService } from '@/lib/hotel/services/VirtualRoomService';
import hotelNotification from '@/lib/notifications';
import type { ReservationCharge } from '@/lib/hotel/types';
import type { Room } from '@/lib/queries/hooks/useRooms';
import type { BookingGuest, BookingServices } from './types';
import { useBookingRoomSelection } from './useBookingRoomSelection';
import { useBookingDates } from './useBookingDates';
import { useBookingGuests } from './useBookingGuests';
import { useBookingServices } from './useBookingServices';
import { useBookingPricing } from './useBookingPricing';

export type { Company };

export interface UseCreateBookingFormParams {
  room: Room | null;
  currentDate?: Date;
  preSelectedDates?: { checkIn: Date; checkOut: Date } | null;
  allowRoomSelection?: boolean;
  unallocatedMode?: boolean;
  onClose: () => void;
}

export interface UseCreateBookingFormReturn {
  // ── Room ──────────────────────────────────────────────────────────────────
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  isUnallocated: boolean;
  setIsUnallocated: (v: boolean) => void;
  availableRooms: Room[];
  hotelId: string;

  // ── Dates ─────────────────────────────────────────────────────────────────
  checkInDate: Date;
  setCheckInDate: (d: Date) => void;
  checkOutDate: Date;
  setCheckOutDate: (d: Date) => void;
  numberOfNights: number;

  // ── Guests ────────────────────────────────────────────────────────────────
  bookingGuests: BookingGuest[];
  addAdult: () => void;
  addChild: () => void;
  removeGuest: (guestId: string) => void;
  updateGuest: (guestId: string, field: string, value: string | number | boolean) => void;
  handleSelectExistingGuest: (guest: Guest, guestIndex: number) => void;
  adultsCount: number;
  childrenCount: number;

  // ── Services ──────────────────────────────────────────────────────────────
  bookingServices: BookingServices;
  setBookingServices: React.Dispatch<React.SetStateAction<BookingServices>>;

  // ── Company billing ───────────────────────────────────────────────────────
  isCompanyBilling: boolean;
  setIsCompanyBilling: (v: boolean) => void;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  companies: Company[];

  // ── Label ─────────────────────────────────────────────────────────────────
  selectedLabelId: string | null;
  setSelectedLabelId: (id: string | null) => void;

  // ── Pricing preview ───────────────────────────────────────────────────────
  previewCharges: ReservationCharge[];
  chargesLoading: boolean;
  chargeTotal: number;
  chargesByType: Record<string, ReservationCharge[]>;

  // ── Submission ────────────────────────────────────────────────────────────
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  validateForm: () => string[];
}

export function useCreateBookingForm({
  room,
  currentDate,
  preSelectedDates,
  unallocatedMode = false,
  onClose,
}: UseCreateBookingFormParams): UseCreateBookingFormReturn {
  const { data: companies = [] } = useCompanies();
  const createBookingMutation = useCreateFullBooking();

  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const roomSelection = useBookingRoomSelection({ room, unallocatedMode });
  const dates = useBookingDates({ currentDate, preSelectedDates });
  const guests = useBookingGuests({ selectedRoom: roomSelection.selectedRoom });
  const services = useBookingServices();

  // ── Company billing ────────────────────────────────────────────────────────
  const [isCompanyBilling, setIsCompanyBilling] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // ── Label ──────────────────────────────────────────────────────────────────
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  // ── Submission state ───────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pricing = useBookingPricing({
    selectedRoom: roomSelection.selectedRoom,
    isUnallocated: roomSelection.isUnallocated,
    checkInDate: dates.checkInDate,
    checkOutDate: dates.checkOutDate,
    bookingGuests: guests.bookingGuests,
    bookingServices: services.bookingServices,
    isCompanyBilling,
    selectedCompanyId,
    companies,
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = (): string[] => {
    const errors: string[] = [];
    const { checkInDate, checkOutDate } = dates;
    const { bookingGuests } = guests;
    const { bookingServices } = services;
    const { selectedRoom, isUnallocated } = roomSelection;

    if (checkOutDate <= checkInDate) {
      errors.push('Check-out date must be after check-in date');
    }

    if (bookingGuests.length === 0) {
      errors.push('At least one guest is required');
      return errors;
    }

    const primaryGuest = bookingGuests[0];
    if (primaryGuest.type !== 'adult') {
      errors.push('Primary guest must be an adult');
    }
    if (!primaryGuest.firstName.trim()) {
      errors.push('Primary guest first name is required');
    }
    if (!primaryGuest.lastName.trim()) {
      errors.push('Primary guest last name is required');
    }

    const usedEmails = new Set<string>();
    bookingGuests.forEach((guest, index) => {
      if (guest.email && guest.email.trim()) {
        const email = guest.email.toLowerCase();
        if (usedEmails.has(email)) {
          errors.push(`Guest ${index + 1} has duplicate email address`);
        } else {
          usedEmails.add(email);
        }
        if (!guest.email.includes('@')) {
          errors.push(`Guest ${index + 1} has invalid email format`);
        }
      }
    });

    bookingGuests.forEach((guest, index) => {
      if (guest.type === 'child') {
        if (!guest.age || guest.age < 0 || guest.age >= 18) {
          errors.push(`Child guest ${index + 1} must have age between 0-17`);
        }
      }
    });

    if (selectedRoom && !isUnallocated && bookingGuests.length > selectedRoom.max_occupancy) {
      errors.push(
        `Total guests (${bookingGuests.length}) exceeds room capacity (${selectedRoom.max_occupancy})`
      );
    }

    if (!isUnallocated && !selectedRoom) {
      errors.push('Please select a room');
    }

    if (bookingServices.needsParking && bookingServices.parkingSpots <= 0) {
      errors.push('Please specify number of parking spots needed');
    }
    if (bookingServices.hasPets && bookingServices.petCount <= 0) {
      errors.push('Please specify number of pets');
    }

    if (isCompanyBilling && !selectedCompanyId) {
      errors.push('Please select a company for R1 billing');
    }

    return errors;
  };

  // ── Submission ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    const errors = validateForm();
    if (errors.length > 0) {
      hotelNotification.error('Validation Failed', errors.join(', '));
      return;
    }

    const { checkInDate, checkOutDate, numberOfNights } = dates;
    const { bookingGuests, adultsCount, childrenCount } = guests;
    const { bookingServices } = services;
    const { selectedRoom, isUnallocated } = roomSelection;
    const { previewCharges, chargeTotal } = pricing;

    // Unallocated path
    if (isUnallocated) {
      try {
        setIsSubmitting(true);
        const primaryGuest = bookingGuests[0];
        const temporaryName =
          `${primaryGuest.firstName} ${primaryGuest.lastName}`.trim() || 'Guest';

        const result = await virtualRoomService.createUnallocatedReservation({
          temporaryGuestName: temporaryName,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          numberOfPeople: bookingGuests.length,
          notes: bookingServices.specialRequests,
        });

        if (result.success) {
          hotelNotification.success(
            'Unallocated Reservation Created',
            `Reservation for ${temporaryName} has been created and placed in unallocated queue.`
          );
          onClose();
        } else {
          hotelNotification.error('Creation Failed', result.error || 'Unknown error');
        }
      } catch (error: unknown) {
        console.error('Unallocated reservation creation failed:', error);
        hotelNotification.error('Creation Failed', 'Unable to create unallocated reservation');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Regular room booking
    try {
      setIsSubmitting(true);

      const primaryGuest = bookingGuests[0];

      await createBookingMutation.mutateAsync({
        roomId: selectedRoom!.id,
        checkInDate,
        checkOutDate,
        adultsCount,
        childrenCount,
        guests: bookingGuests.map((g) => ({
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email,
          phone: g.phone,
          nationality: g.nationality,
          dateOfBirth: g.dateOfBirth,
          type: g.type,
          age: g.age,
          existingGuestId: g.isExisting ? g.existingGuestId : undefined,
        })),
        specialRequests: bookingServices.specialRequests,
        hasPets: bookingServices.hasPets,
        parkingRequired: bookingServices.needsParking,
        isR1: isCompanyBilling,
        companyId: isCompanyBilling && selectedCompanyId ? parseInt(selectedCompanyId) : null,
        labelId: selectedLabelId,
        charges: previewCharges.map((c) => ({
          chargeType: c.chargeType,
          description: c.description,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          total: c.total,
          vatRate: c.vatRate ?? 0,
          sortOrder: c.sortOrder ?? 0,
        })),
      });

      hotelNotification.success(
        'Booking Created Successfully!',
        `Reservation for ${primaryGuest.firstName} ${primaryGuest.lastName} ` +
          `and ${bookingGuests.length - 1} other guest${bookingGuests.length > 2 ? 's' : ''} ` +
          `(${adultsCount} adult${adultsCount !== 1 ? 's' : ''}, ${childrenCount} child${childrenCount !== 1 ? 'ren' : ''}) ` +
          `in Room ${selectedRoom!.room_number} has been created.`
      );

      if (selectedRoom!.room_number === '401') {
        try {
          const notificationData: BookingNotificationData = {
            roomNumber: selectedRoom!.room_number,
            guestName: `${primaryGuest.firstName} ${primaryGuest.lastName}`,
            checkIn: checkInDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            checkOut: checkOutDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            nights: numberOfNights,
            adults: adultsCount,
            children: childrenCount,
            bookingSource: 'Front Desk - Modern Modal',
            totalAmount: chargeTotal,
          };
          const notificationSent = await sendRoom401BookingNotification(notificationData);
          if (!notificationSent) {
            console.error('Failed to send ntfy notification for room 401');
          }
        } catch (notificationError) {
          console.error('Error sending ntfy notification:', notificationError);
        }
      }

      onClose();
    } catch (error: unknown) {
      console.error('Booking creation failed:', error);
      const dbError = error as { code?: string; message?: string };
      if (dbError?.code === '23505' && dbError?.message?.includes('guests_email_key')) {
        hotelNotification.error(
          'Email Already Exists',
          'This email address is already in use. Please use a different email.'
        );
      } else {
        hotelNotification.error('Booking Failed', 'Unable to create booking. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // Room
    ...roomSelection,
    // Dates
    ...dates,
    // Guests
    ...guests,
    // Services
    ...services,
    // Company billing
    isCompanyBilling,
    setIsCompanyBilling,
    selectedCompanyId,
    setSelectedCompanyId,
    companies,
    // Label
    selectedLabelId,
    setSelectedLabelId,
    // Pricing
    ...pricing,
    // Submission
    isSubmitting,
    handleSubmit,
    validateForm,
  };
}
