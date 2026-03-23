// BookingService - Booking validation and pricing calculations
import { Room, Guest, GuestChild, ReservationStatus, Company, Reservation } from '../types';

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
        if (res.roomId !== bookingData.room?.id) return false;
        const resIn = new Date(res.checkIn);
        const resOut = new Date(res.checkOut);
        return bookingData.checkIn! < resOut && bookingData.checkOut! > resIn;
      });
      if (hasConflict) {
        errors.push({ type: 'date_conflict', message: 'Room is already booked for these dates' });
      }
    }

    return errors;
  }
}
