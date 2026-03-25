// BookingService - Booking validation, pricing calculations, and DB operations
import { Guest, GuestChild, ReservationStatus, Company } from '../types';
import type { Reservation } from '@/lib/queries/hooks/useReservations';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { supabase } from '@/lib/supabase';

export interface BookingData {
  room?: Room;
  guest?:
    | Guest
    | Partial<Guest>
    | {
        firstName: string;
        lastName: string;
        fullName: string;
        email: string;
        phone: string;
        nationality: string;
        hasPets: boolean;
      };
  isNewGuest?: boolean;
  checkIn?: Date;
  checkOut?: Date;
  adults?: number;
  children?: GuestChild[];
  specialRequests?: string;
  hasPets?: boolean;
  needsParking?: boolean;
  status?: ReservationStatus;
  bookingSource?: 'booking.com' | 'direct' | 'other';
  isR1Bill?: boolean;
  selectedCompany?: Company | null;
  pricingTierId?: string;
}

export interface BookingValidationError {
  type: 'date_conflict' | 'room_401' | 'form_invalid';
  message: string;
  field?: string;
}

export class BookingService {
  private static instance: BookingService;

  public static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  validateBooking(
    bookingData: Partial<BookingData>,
    existingReservations: Reservation[] = []
  ): BookingValidationError[] {
    const errors: BookingValidationError[] = [];

    if (!bookingData.room) {
      errors.push({ type: 'form_invalid', message: 'Room is required', field: 'room' });
    }
    if (!bookingData.guest && !bookingData.isNewGuest) {
      errors.push({ type: 'form_invalid', message: 'Guest is required', field: 'guest' });
    }
    if (!bookingData.checkIn || !bookingData.checkOut) {
      errors.push({
        type: 'form_invalid',
        message: 'Check-in and check-out dates are required',
        field: 'dates',
      });
    } else if (bookingData.checkIn >= bookingData.checkOut) {
      errors.push({
        type: 'form_invalid',
        message: 'Check-out must be after check-in',
        field: 'dates',
      });
    }

    // Check for date conflicts
    if (bookingData.room && bookingData.checkIn && bookingData.checkOut) {
      const hasConflict = existingReservations.some((res) => {
        if (res.room_id !== bookingData.room?.id) return false;
        const resIn = new Date(res.check_in_date);
        const resOut = new Date(res.check_out_date);
        return bookingData.checkIn! < resOut && bookingData.checkOut! > resIn;
      });
      if (hasConflict) {
        errors.push({ type: 'date_conflict', message: 'Room is already booked for these dates' });
      }
    }

    return errors;
  }
}

// ─── Full Booking Creation (multi-guest, charges, junction tables) ──────────────

export interface BookingGuestInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  dateOfBirth?: string;
  type: 'adult' | 'child';
  age?: number;
  existingGuestId?: number;
}

export interface CreateFullBookingInput {
  roomId: number;
  checkInDate: Date;
  checkOutDate: Date;
  adultsCount: number;
  childrenCount: number;
  guests: BookingGuestInput[];
  specialRequests?: string;
  hasPets: boolean;
  parkingRequired: boolean;
  isR1: boolean;
  companyId: number | null;
  labelId: string | null;
  charges: Array<{
    chargeType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    vatRate: number;
    sortOrder: number;
  }>;
}

export interface CreateFullBookingResult {
  reservationId: number;
}

export async function createFullBooking(
  input: CreateFullBookingInput
): Promise<CreateFullBookingResult> {
  const {
    guests,
    charges,
    roomId,
    checkInDate,
    checkOutDate,
    adultsCount,
    childrenCount,
    specialRequests,
    hasPets,
    parkingRequired,
    isR1,
    companyId,
    labelId,
  } = input;

  const primaryGuest = guests[0];
  let primaryGuestId: number;

  if (primaryGuest.existingGuestId) {
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
    room_id: roomId,
    check_in_date: checkInDate.toISOString().split('T')[0],
    check_out_date: checkOutDate.toISOString().split('T')[0],
    adults: adultsCount,
    children_count: childrenCount,
    number_of_guests: adultsCount + childrenCount,
    status_id: statusRow?.id,
    booking_source_id: sourceRow?.id,
    special_requests: specialRequests || null,
    has_pets: hasPets,
    parking_required: parkingRequired,
    is_r1: isR1,
    company_id: companyId,
    label_id: labelId,
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

  if (charges.length > 0) {
    const { error: chargesError } = await supabase.from('reservation_charges').insert(
      charges.map((c) => ({
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

  for (let i = 0; i < guests.length; i++) {
    const guest = guests[i];
    let guestId: number;

    if (i === 0) {
      guestId = primaryGuestId;
    } else if (guest.existingGuestId) {
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
        const dob = new Date(today.getFullYear() - guest.age, today.getMonth(), today.getDate());
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

  return { reservationId: reservation.id };
}
