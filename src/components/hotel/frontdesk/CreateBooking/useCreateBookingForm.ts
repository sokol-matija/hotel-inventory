import { useState, useEffect } from 'react';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { useRooms } from '@/lib/queries/hooks/useRooms';
import type { Company } from '@/lib/queries/hooks/useCompanies';
import { useCompanies } from '@/lib/queries/hooks/useCompanies';
import type { Guest } from '@/lib/queries/hooks/useGuests';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { supabase } from '@/lib/supabase';
import { unifiedPricingService } from '@/lib/hotel/services/UnifiedPricingService';
import { HOTEL_ID } from '@/lib/hotel/constants';
import { ntfyService, type BookingNotificationData } from '@/lib/ntfyService';
import { virtualRoomService } from '@/lib/hotel/services/VirtualRoomService';
import hotelNotification from '@/lib/notifications';
import type { ReservationCharge } from '@/lib/hotel/types';
import type { BookingGuest, BookingServices } from './types';

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

function createEmptyGuest(type: 'adult' | 'child'): BookingGuest {
  return {
    id: `new-${Date.now()}-${Math.random()}`,
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
    type,
    age: type === 'child' ? 12 : undefined,
    isExisting: false,
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    hasPets: false,
    isVip: false,
    vipLevel: 0,
    children: [],
    totalStays: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function useCreateBookingForm({
  room,
  currentDate,
  preSelectedDates,
  unallocatedMode = false,
  onClose,
}: UseCreateBookingFormParams): UseCreateBookingFormReturn {
  const { data: rooms = [] } = useRooms();
  const { data: companies = [] } = useCompanies();
  const queryClient = useQueryClient();

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() });
  };

  const hotelId = HOTEL_ID;

  // ── Room ───────────────────────────────────────────────────────────────────
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(room);
  const [isUnallocated, setIsUnallocated] = useState(unallocatedMode);

  // ── Dates ──────────────────────────────────────────────────────────────────
  const [checkInDate, setCheckInDate] = useState(
    preSelectedDates?.checkIn || currentDate || new Date()
  );
  const [checkOutDate, setCheckOutDate] = useState(
    preSelectedDates?.checkOut ||
      new Date((currentDate || new Date()).getTime() + 2 * 24 * 60 * 60 * 1000)
  );

  // ── Guests ─────────────────────────────────────────────────────────────────
  const [bookingGuests, setBookingGuests] = useState<BookingGuest[]>([]);

  useEffect(() => {
    if (bookingGuests.length === 0) {
      setBookingGuests([createEmptyGuest('adult')]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Services ───────────────────────────────────────────────────────────────
  const [bookingServices, setBookingServices] = useState<BookingServices>({
    needsParking: false,
    parkingSpots: 0,
    hasPets: false,
    petCount: 0,
    specialRequests: '',
  });

  // ── Company billing ────────────────────────────────────────────────────────
  const [isCompanyBilling, setIsCompanyBilling] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // ── Label ──────────────────────────────────────────────────────────────────
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  // ── Pricing preview ────────────────────────────────────────────────────────
  const [previewCharges, setPreviewCharges] = useState<ReservationCharge[]>([]);
  const [chargesLoading, setChargesLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate charge line items whenever pricing dependencies change
  useEffect(() => {
    if (isUnallocated || !selectedRoom) {
      setPreviewCharges([]);
      return;
    }

    const hasGuest = bookingGuests.some((g) => g.firstName.trim() || g.lastName.trim());
    if (!hasGuest) {
      setPreviewCharges([]);
      return;
    }

    const guests = bookingGuests.map((g) => ({
      name: `${g.firstName} ${g.lastName}`.trim() || (g.type === 'child' ? 'Child' : 'Guest'),
      type: g.type as 'adult' | 'child',
      age: g.age,
    }));

    const primaryGuest = bookingGuests[0];
    const guestId =
      primaryGuest?.isExisting && primaryGuest?.existingGuestId
        ? String(primaryGuest.existingGuestId)
        : undefined;

    const selectedCompany =
      isCompanyBilling && selectedCompanyId
        ? companies.find((c) => String(c.id) === selectedCompanyId)
        : undefined;
    const pricingTierId = selectedCompany?.pricing_tier_id?.toString() ?? undefined;

    let cancelled = false;
    setChargesLoading(true);

    unifiedPricingService
      .generateCharges({
        roomId: selectedRoom.id.toString(),
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        hasPets: bookingServices.hasPets,
        parkingRequired: bookingServices.needsParking,
        pricingTierId,
        guestId,
      })
      .then((charges) => {
        if (cancelled) return;
        setPreviewCharges(charges);
      })
      .catch(() => {
        /* keep previous charges on error */
      })
      .finally(() => {
        if (!cancelled) setChargesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    checkInDate,
    checkOutDate,
    bookingGuests,
    bookingServices,
    selectedRoom,
    isUnallocated,
    isCompanyBilling,
    selectedCompanyId,
    companies,
  ]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const chargeTotal = previewCharges.reduce((sum, c) => sum + c.total, 0);
  const numberOfNights = Math.max(
    1,
    Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const adultsCount = bookingGuests.filter((g) => g.type === 'adult').length;
  const childrenCount = bookingGuests.filter((g) => g.type === 'child').length;
  const availableRooms = rooms.filter((r) => r.floor_number !== 5);
  const chargesByType = previewCharges.reduce<Record<string, ReservationCharge[]>>((acc, c) => {
    const key = c.chargeType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  // ── Guest management ───────────────────────────────────────────────────────
  const addAdult = () => {
    const maxOccupancy = selectedRoom?.max_occupancy || 99;
    if (bookingGuests.length < maxOccupancy) {
      setBookingGuests([...bookingGuests, createEmptyGuest('adult')]);
    }
  };

  const addChild = () => {
    const maxOccupancy = selectedRoom?.max_occupancy || 99;
    if (bookingGuests.length < maxOccupancy) {
      setBookingGuests([...bookingGuests, createEmptyGuest('child')]);
    }
  };

  const removeGuest = (guestId: string) => {
    if (bookingGuests.length > 1) {
      setBookingGuests(bookingGuests.filter((g) => g.id !== guestId));
    }
  };

  const updateGuest = (guestId: string, field: string, value: string | number | boolean) => {
    setBookingGuests(
      bookingGuests.map((g) => {
        if (g.id !== guestId) return g;
        const updated = { ...g, [field]: value };

        if (field === 'firstName' || field === 'lastName') {
          updated.fullName = `${updated.firstName} ${updated.lastName}`.trim();
        }

        if (field === 'type') {
          if (value === 'child' && !updated.age) {
            updated.age = 12;
          } else if (value === 'adult') {
            updated.age = undefined;
          }
        }

        return updated;
      })
    );
  };

  const handleSelectExistingGuest = (guest: Guest, guestIndex: number) => {
    const updatedGuests = [...bookingGuests];
    updatedGuests[guestIndex] = {
      id: guest.id.toString(),
      firstName: guest.first_name,
      lastName: guest.last_name,
      fullName: guest.display_name,
      email: guest.email || '',
      phone: guest.phone || '',
      nationality: guest.nationality || '',
      dateOfBirth: guest.date_of_birth ?? '',
      type: 'adult' as const,
      age: undefined,
      isExisting: true,
      existingGuestId: guest.id,
      preferredLanguage: guest.preferred_language || 'en',
      dietaryRestrictions: guest.dietary_restrictions || [],
      hasPets: guest.has_pets || false,
      isVip: guest.is_vip || false,
      vipLevel: guest.vip_level || 0,
      children: [],
      totalStays: 0,
      createdAt: guest.created_at ? new Date(guest.created_at) : new Date(),
      updatedAt: guest.updated_at ? new Date(guest.updated_at) : new Date(),
    };
    setBookingGuests(updatedGuests);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = (): string[] => {
    const errors: string[] = [];

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
          await refreshData();
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
      let primaryGuestId: number;

      if (primaryGuest.isExisting && primaryGuest.existingGuestId) {
        primaryGuestId = primaryGuest.existingGuestId;
      } else {
        const { data: createdGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            first_name: primaryGuest.firstName,
            last_name: primaryGuest.lastName,
            email: primaryGuest.email?.trim() || `guest_${Date.now()}@placeholder.local`,
            phone: primaryGuest.phone || null,
            nationality: primaryGuest.nationality || null,
            date_of_birth: primaryGuest.dateOfBirth || null,
          })
          .select()
          .single();

        if (guestError) throw guestError;
        primaryGuestId = createdGuest.id;
      }

      const { data: statusRow } = await supabase
        .from('reservation_statuses')
        .select('id')
        .eq('code', 'confirmed')
        .single();
      const { data: sourceRow } = await supabase
        .from('booking_sources')
        .select('id')
        .eq('code', 'direct')
        .single();

      const reservationData = {
        guest_id: primaryGuestId,
        room_id: selectedRoom!.id,
        check_in_date: checkInDate.toISOString().split('T')[0],
        check_out_date: checkOutDate.toISOString().split('T')[0],
        adults: adultsCount,
        children_count: childrenCount,
        number_of_guests: adultsCount + childrenCount,
        status_id: statusRow?.id,
        booking_source_id: sourceRow?.id,
        special_requests: bookingServices.specialRequests || null,
        has_pets: bookingServices.hasPets,
        parking_required: bookingServices.needsParking,
        is_r1: isCompanyBilling,
        company_id: isCompanyBilling && selectedCompanyId ? parseInt(selectedCompanyId) : null,
        label_id: selectedLabelId,
      };

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert(reservationData)
        .select()
        .single();

      if (reservationError) {
        console.error('Reservation creation failed:', {
          error: reservationError,
          sentData: reservationData,
        });
        throw reservationError;
      }

      if (previewCharges.length > 0) {
        const { error: chargesError } = await supabase.from('reservation_charges').insert(
          previewCharges.map((c) => ({
            reservation_id: reservation.id,
            charge_type: c.chargeType,
            description: c.description,
            quantity: c.quantity,
            unit_price: c.unitPrice,
            total: c.total,
            vat_rate: c.vatRate,
            sort_order: c.sortOrder,
          }))
        );

        if (chargesError) {
          console.error('Failed to insert reservation charges:', chargesError);
          // Non-fatal: reservation exists, charges can be regenerated
        }
      }

      for (let i = 0; i < bookingGuests.length; i++) {
        const guest = bookingGuests[i];
        let guestId: number;

        if (i === 0) {
          guestId = primaryGuestId;
        } else if (guest.isExisting && guest.existingGuestId) {
          guestId = guest.existingGuestId;
        } else {
          const email = guest.email?.trim() || `guest_${Date.now()}_${i}@placeholder.local`;

          const { data: additionalGuest, error: addGuestError } = await supabase
            .from('guests')
            .insert({
              first_name: guest.firstName,
              last_name: guest.lastName,
              email,
              phone: guest.phone || null,
              nationality: guest.nationality || null,
              date_of_birth: guest.dateOfBirth || null,
            })
            .select()
            .single();

          if (addGuestError) throw addGuestError;
          guestId = additionalGuest.id;
        }

        await supabase.from('reservation_guests').insert({
          reservation_id: reservation.id,
          guest_id: guestId,
        });

        await supabase.from('guest_stays').insert({
          reservation_id: reservation.id,
          guest_id: guestId,
          check_in: checkInDate.toISOString(),
          check_out: checkOutDate.toISOString(),
        });

        if (guest.type === 'child' && guest.age !== undefined) {
          let dateOfBirth: string;
          if (guest.dateOfBirth) {
            dateOfBirth = new Date(guest.dateOfBirth).toISOString().split('T')[0];
          } else {
            const today = new Date();
            const dob = new Date(
              today.getFullYear() - guest.age,
              today.getMonth(),
              today.getDate()
            );
            dateOfBirth = dob.toISOString().split('T')[0];
          }

          await supabase.from('guest_children').insert({
            reservation_id: reservation.id,
            guest_id: guestId,
            name: `${guest.firstName} ${guest.lastName}`,
            age: guest.age,
            date_of_birth: dateOfBirth,
          });
        }
      }

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
          const notificationSent =
            await ntfyService.sendRoom401BookingNotification(notificationData);
          if (!notificationSent) {
            console.error('Failed to send ntfy notification for room 401');
          }
        } catch (notificationError) {
          console.error('Error sending ntfy notification:', notificationError);
        }
      }

      refreshData();
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
    selectedRoom,
    setSelectedRoom,
    isUnallocated,
    setIsUnallocated,
    availableRooms,
    hotelId,
    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    numberOfNights,
    bookingGuests,
    addAdult,
    addChild,
    removeGuest,
    updateGuest,
    handleSelectExistingGuest,
    adultsCount,
    childrenCount,
    bookingServices,
    setBookingServices,
    isCompanyBilling,
    setIsCompanyBilling,
    selectedCompanyId,
    setSelectedCompanyId,
    companies,
    selectedLabelId,
    setSelectedLabelId,
    previewCharges,
    chargesLoading,
    chargeTotal,
    chargesByType,
    isSubmitting,
    handleSubmit,
    validateForm,
  };
}
