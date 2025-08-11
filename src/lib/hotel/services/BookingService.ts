// BookingService - Clean business logic separation
// Handles all booking operations without UI concerns

import { startOfDay } from 'date-fns';
import { HotelPricingEngine, PricingCalculationInput } from '../pricingEngine';
import { Room, Guest, GuestChild, ReservationStatus, Reservation, Company } from '../types';
import { SAMPLE_GUESTS } from '../sampleData';
import { ntfyService, BookingNotificationData } from '../../ntfyService';
import { formatRoomNumber } from '../calendarUtils';

export interface BookingData {
  room: Room;
  guest: Guest | NewGuestData;
  isNewGuest: boolean;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: GuestChild[];
  specialRequests: string;
  hasPets: boolean;
  needsParking: boolean;
  status: ReservationStatus;
  bookingSource: 'booking.com' | 'direct' | 'other';
  isR1Bill: boolean;
  selectedCompany: Company | null;
  pricingTierId: string;
}

export interface NewGuestData {
  name: string;
  email: string;
  phone: string;
  nationality: string;
  hasPets: boolean;
}

export interface BookingValidationError {
  type: 'date_conflict' | 'room_401' | 'form_invalid' | 'guest_required';
  message: string;
  details?: any;
}

export class BookingService {
  private static instance: BookingService;
  
  private constructor() {}
  
  public static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  /**
   * Calculate pricing for booking
   */
  public calculatePricing(bookingData: Partial<BookingData>): any {
    if (!bookingData.room || !bookingData.checkIn || !bookingData.checkOut) {
      return null;
    }

    try {
      const pricingEngine = HotelPricingEngine.getInstance();
      const input: PricingCalculationInput = {
        roomType: bookingData.room.type,
        roomId: bookingData.room.id,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        adults: bookingData.adults || 1,
        children: bookingData.children || [],
        hasPets: bookingData.hasPets || false,
        needsParking: bookingData.needsParking || false,
        pricingTierId: bookingData.pricingTierId || '2026-standard',
        isR1Bill: bookingData.isR1Bill || false,
        companyId: bookingData.selectedCompany?.id,
        isRoom401: bookingData.room.id === '401'
      };
      
      return pricingEngine.calculatePricing(input);
    } catch (error) {
      console.error('Pricing calculation error:', error);
      return null;
    }
  }

  /**
   * Validate booking data
   */
  public validateBooking(
    bookingData: Partial<BookingData>, 
    existingReservations: Reservation[]
  ): BookingValidationError[] {
    const errors: BookingValidationError[] = [];

    // Date conflict validation
    const dateConflict = this.checkDateConflict(bookingData, existingReservations);
    if (dateConflict) {
      const guest = SAMPLE_GUESTS.find(g => g.id === dateConflict.guestId);
      const conflictingGuestName = guest?.name || dateConflict.guestId || 'Unknown Guest';
      
      errors.push({
        type: 'date_conflict',
        message: `Room is already reserved by ${conflictingGuestName} for these dates`,
        details: dateConflict
      });
    }

    // Room 401 validation
    if (bookingData.room?.id === '401') {
      const room401Issues = this.validateRoom401(bookingData);
      if (room401Issues.length > 0) {
        errors.push({
          type: 'room_401',
          message: room401Issues.join(', '),
          details: room401Issues
        });
      }
    }

    // Form validation
    const formErrors = this.validateForm(bookingData);
    if (formErrors.length > 0) {
      errors.push({
        type: 'form_invalid',
        message: formErrors.join(', '),
        details: formErrors
      });
    }

    return errors;
  }

  /**
   * Check for date conflicts
   */
  private checkDateConflict(
    bookingData: Partial<BookingData>, 
    existingReservations: Reservation[]
  ): Reservation | null {
    if (!bookingData.checkIn || !bookingData.checkOut || !bookingData.room) {
      return null;
    }
    
    const checkInDate = startOfDay(bookingData.checkIn);
    const checkOutDate = startOfDay(bookingData.checkOut);
    
    return existingReservations.find(reservation => {
      if (reservation.roomId !== bookingData.room!.id) return false;
      
      const existingCheckIn = startOfDay(reservation.checkIn);
      const existingCheckOut = startOfDay(reservation.checkOut);
      
      // Check for date overlap
      return (
        (checkInDate >= existingCheckIn && checkInDate < existingCheckOut) ||
        (checkOutDate > existingCheckIn && checkOutDate <= existingCheckOut) ||
        (checkInDate <= existingCheckIn && checkOutDate >= existingCheckOut)
      );
    }) || null;
  }

  /**
   * Validate Room 401 specific requirements
   */
  private validateRoom401(bookingData: Partial<BookingData>): string[] {
    const errors: string[] = [];
    
    if (!bookingData.checkIn || !bookingData.checkOut) return errors;
    
    const nights = Math.ceil(
      (bookingData.checkOut.getTime() - bookingData.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (nights < 3) {
      errors.push('Room 401 requires minimum 3 night stay');
    }
    
    return errors;
  }

  /**
   * Validate form completeness
   */
  private validateForm(bookingData: Partial<BookingData>): string[] {
    const errors: string[] = [];
    
    if (!bookingData.checkIn) errors.push('Check-in date required');
    if (!bookingData.checkOut) errors.push('Check-out date required');
    if (!bookingData.adults || bookingData.adults < 1) errors.push('At least 1 adult required');
    
    if (bookingData.isNewGuest) {
      const newGuest = bookingData.guest as NewGuestData;
      if (!newGuest?.name?.trim()) errors.push('Guest name required');
      if (!newGuest?.email?.trim()) errors.push('Guest email required');
      if (!newGuest?.phone?.trim()) errors.push('Guest phone required');
    } else {
      if (!bookingData.guest) errors.push('Please select a guest');
    }
    
    return errors;
  }

  /**
   * Send notification for Room 401 bookings
   */
  public async sendBookingNotification(bookingData: BookingData, pricing: any): Promise<void> {
    if (bookingData.room.id !== '401') return;

    try {
      const guestName = bookingData.isNewGuest 
        ? (bookingData.guest as NewGuestData).name
        : (bookingData.guest as Guest).name;

      const notificationData: BookingNotificationData = {
        roomNumber: bookingData.room.number,
        guestName,
        checkIn: bookingData.checkIn.toLocaleDateString('en-GB'),
        checkOut: bookingData.checkOut.toLocaleDateString('en-GB'),
        nights: pricing.nights,
        adults: bookingData.adults,
        children: bookingData.children.length,
        bookingSource: bookingData.bookingSource,
        totalAmount: parseFloat(pricing.grandTotal.toFixed(2))
      };

      await ntfyService.sendRoom401BookingNotification(notificationData);
    } catch (error) {
      console.error('Failed to send booking notification:', error);
      // Don't throw - notification failure shouldn't block booking
    }
  }

  /**
   * Transform booking data for reservation creation
   */
  public transformToReservationData(bookingData: BookingData, pricing: any): any {
    return {
      room: bookingData.room,
      guest: bookingData.guest,
      isNewGuest: bookingData.isNewGuest,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      adults: bookingData.adults,
      children: bookingData.children,
      specialRequests: bookingData.specialRequests,
      hasPets: bookingData.hasPets,
      needsParking: bookingData.needsParking,
      status: bookingData.status,
      bookingSource: bookingData.bookingSource,
      pricing: pricing,
      isR1Bill: bookingData.isR1Bill,
      companyId: bookingData.selectedCompany?.id || null
    };
  }
}