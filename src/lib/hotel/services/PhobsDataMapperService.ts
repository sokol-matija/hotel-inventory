// PhobsDataMapperService - Data transformation layer for Phobs integration
// Handles mapping between internal hotel data and Phobs API formats

import {
  PhobsReservation,
  PhobsGuest,
  PhobsRoom,
  PhobsRatePlan,
  PhobsAvailability,
  OTAChannel,
  DataMapping,
  PhobsReservationStatus,
  createPhobsReservationId,
  createPhobsGuestId,
  createPhobsRoomId,
  createPhobsRateId
} from './phobsTypes';
import {
  Reservation,
  Guest,
  Room,
  RoomType,
  ReservationStatus,
  PaymentMethod,
  SeasonalPeriod
} from '../types';

export interface MappingResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PhobsDataMapperService {
  private static instance: PhobsDataMapperService;
  
  // Static mapping configurations
  private static readonly ROOM_TYPE_MAPPINGS: { [key in RoomType]: {
    phobsRoomType: string;
    channelMappings: { [channel in OTAChannel]?: string; };
  } } = {
    'big-double': {
      phobsRoomType: 'double_large',
      channelMappings: {
        'booking.com': 'Double Room - Large',
        'expedia': 'Double Deluxe',
        'airbnb': 'Large Double Room',
        'directBooking': 'Big Double Room'
      }
    },
    'big-single': {
      phobsRoomType: 'single_large',
      channelMappings: {
        'booking.com': 'Single Room - Large',
        'expedia': 'Single Deluxe',
        'airbnb': 'Large Single Room',
        'directBooking': 'Big Single Room'
      }
    },
    'double': {
      phobsRoomType: 'double_standard',
      channelMappings: {
        'booking.com': 'Double Room',
        'expedia': 'Standard Double',
        'airbnb': 'Double Room',
        'directBooking': 'Double Room'
      }
    },
    'triple': {
      phobsRoomType: 'triple_standard',
      channelMappings: {
        'booking.com': 'Triple Room',
        'expedia': 'Triple Room',
        'airbnb': 'Triple Room',
        'directBooking': 'Triple Room'
      }
    },
    'single': {
      phobsRoomType: 'single_standard',
      channelMappings: {
        'booking.com': 'Single Room',
        'expedia': 'Standard Single',
        'airbnb': 'Single Room',
        'directBooking': 'Single Room'
      }
    },
    'family': {
      phobsRoomType: 'family_room',
      channelMappings: {
        'booking.com': 'Family Room',
        'expedia': 'Family Suite',
        'airbnb': 'Family Room',
        'directBooking': 'Family Room'
      }
    },
    'apartment': {
      phobsRoomType: 'apartment',
      channelMappings: {
        'booking.com': 'Apartment',
        'expedia': 'Apartment',
        'airbnb': 'Entire Apartment',
        'directBooking': 'Apartment'
      }
    },
    'rooftop-apartment': {
      phobsRoomType: 'apartment_premium',
      channelMappings: {
        'booking.com': 'Rooftop Apartment',
        'expedia': 'Premium Apartment',
        'airbnb': 'Rooftop Apartment',
        'directBooking': 'Rooftop Apartment'
      }
    }
  };

  private static readonly STATUS_MAPPINGS: { [key in ReservationStatus]: PhobsReservationStatus } = {
    'confirmed': 'confirmed',
    'checked-in': 'checked_in',
    'checked-out': 'checked_out',
    'room-closure': 'cancelled',
    'unallocated': 'new',
    'incomplete-payment': 'new'
  };

  private static readonly PAYMENT_METHOD_MAPPINGS: { [key in PaymentMethod]: string } = {
    'cash': 'cash',
    'card': 'credit_card',
    'bank_transfer': 'bank_transfer',
    'online': 'online_payment',
    'booking-com': 'ota_payment',
    'other': 'other'
  };

  private static readonly OTA_CHANNEL_MAPPINGS: { [key: string]: OTAChannel } = {
    'booking.com': 'booking.com',
    'expedia': 'expedia',
    'airbnb': 'airbnb',
    'agoda': 'agoda',
    'hotels.com': 'hotels.com',
    'hostelworld': 'hostelworld',
    'kayak': 'kayak',
    'trivago': 'trivago',
    'priceline': 'priceline',
    'camping.info': 'camping.info',
    'pitchup.com': 'pitchup.com',
    'eurocamp': 'eurocamp',
    'direct': 'directBooking'
  };

  private constructor() {}

  public static getInstance(): PhobsDataMapperService {
    if (!PhobsDataMapperService.instance) {
      PhobsDataMapperService.instance = new PhobsDataMapperService();
    }
    return PhobsDataMapperService.instance;
  }

  // ===========================
  // RESERVATION MAPPING
  // ===========================

  /**
   * Map internal reservation to Phobs format
   */
  mapReservationToPhobs(
    reservation: Reservation,
    guest: Guest,
    room: Room
  ): MappingResult<PhobsReservation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      const validation = this.validateReservationForPhobs(reservation, guest);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Generate Phobs IDs if not present
      const phobsReservationId = this.generatePhobsReservationId(reservation);
      const phobsGuestId = this.generatePhobsGuestId(guest);
      const phobsRoomId = this.generatePhobsRoomId(room);

      // Map OTA channel
      const otaChannel = this.mapBookingSourceToOTA(reservation.bookingSource);
      if (!otaChannel) {
        warnings.push(`Unknown booking source: ${reservation.bookingSource}, defaulting to direct booking`);
      }

      // Calculate commission and net amounts
      const commission = this.calculateCommission(reservation.totalAmount, otaChannel || 'directBooking');
      const netAmount = reservation.totalAmount - commission;

      const phobsReservation: PhobsReservation = {
        phobsReservationId: createPhobsReservationId(phobsReservationId),
        phobsGuestId: createPhobsGuestId(phobsGuestId),
        internalReservationId: reservation.id,
        internalGuestId: guest.id,
        roomId: createPhobsRoomId(phobsRoomId),
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        numberOfGuests: reservation.numberOfGuests,
        adults: reservation.adults,
        children: reservation.children.length,
        
        guest: this.mapGuestToPhobs(guest).data!,
        
        channel: otaChannel || 'directBooking',
        bookingReference: reservation.id, // Use internal ID as booking reference
        status: PhobsDataMapperService.STATUS_MAPPINGS[reservation.status] || 'confirmed',
        
        totalAmount: reservation.totalAmount,
        currency: 'EUR',
        commission,
        netAmount,
        
        roomRate: reservation.baseRoomRate,
        taxes: reservation.vatAmount + reservation.tourismTax,
        fees: reservation.petFee + reservation.parkingFee + reservation.additionalCharges,
        
        paymentMethod: ((reservation as any).paymentMethod ? 
          PhobsDataMapperService.PAYMENT_METHOD_MAPPINGS[(reservation as any).paymentMethod as PaymentMethod] || 'other'
          : 'other') as PaymentMethod,
        paymentStatus: this.mapPaymentStatus(reservation.paymentStatus || 'pending'),
        
        specialRequests: reservation.specialRequests || '',
        guestNotes: reservation.notes || '',
        
        bookingDate: reservation.bookingDate,
        lastModified: reservation.lastModified,
        
        syncStatus: 'pending',
        syncedAt: undefined,
        syncErrors: []
      };

      return {
        success: true,
        data: phobsReservation,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Map Phobs reservation to internal format
   */
  mapPhobsReservationToInternal(
    phobsReservation: PhobsReservation
  ): MappingResult<Partial<Reservation>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Calculate nights
      const checkIn = new Date(phobsReservation.checkIn);
      const checkOut = new Date(phobsReservation.checkOut);
      const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      // Map status
      const internalStatus = this.mapPhobsStatusToInternal(phobsReservation.status);
      
      // Calculate pricing breakdown
      const pricing = this.calculateInternalPricing(phobsReservation);

      const internalReservation: Partial<Reservation> = {
        roomId: phobsReservation.roomId, // This should be mapped to internal room ID
        guestId: phobsReservation.internalGuestId || 'temp-guest-id',
        checkIn,
        checkOut,
        numberOfGuests: phobsReservation.numberOfGuests,
        adults: phobsReservation.adults,
        children: [], // TODO: Map children data
        status: internalStatus,
        bookingSource: this.mapOTAToBookingSource(phobsReservation.channel) as any,
        specialRequests: phobsReservation.specialRequests,
        
        // Pricing details
        seasonalPeriod: this.calculateSeasonalPeriod(checkIn),
        baseRoomRate: phobsReservation.roomRate,
        numberOfNights,
        subtotal: pricing.subtotal,
        childrenDiscounts: pricing.childrenDiscounts,
        tourismTax: pricing.tourismTax,
        vatAmount: pricing.vatAmount,
        petFee: pricing.petFee,
        parkingFee: pricing.parkingFee,
        shortStaySuplement: pricing.shortStaySuplement,
        additionalCharges: pricing.additionalCharges,
        roomServiceItems: [],
        totalAmount: phobsReservation.totalAmount,
        
        // Booking metadata
        bookingDate: new Date(phobsReservation.bookingDate),
        lastModified: new Date(phobsReservation.lastModified),
        notes: `OTA Booking from ${phobsReservation.channel} - Ref: ${phobsReservation.bookingReference}`
      };

      return {
        success: true,
        data: internalReservation,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  // ===========================
  // GUEST MAPPING
  // ===========================

  /**
   * Map internal guest to Phobs format
   */
  mapGuestToPhobs(guest: Guest): MappingResult<PhobsGuest> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      if (!guest.firstName || !guest.lastName) {
        errors.push('Guest first name and last name are required');
      }

      if (!guest.email) {
        warnings.push('Guest email is missing - this may cause issues with OTA channels');
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      const phobsGuest: PhobsGuest = {
        phobsGuestId: createPhobsGuestId(this.generatePhobsGuestId(guest)),
        internalGuestId: guest.id,
        
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email || '',
        phone: guest.phone,
        
        country: guest.nationality || 'HR',
        countryCode: this.getCountryCode(guest.nationality || 'HR'),
        city: undefined, // Not available in current schema
        address: undefined, // Not available in current schema
        postalCode: undefined, // Not available in current schema
        
        language: guest.preferredLanguage || 'en',
        dateOfBirth: guest.dateOfBirth,
        nationality: guest.nationality,
        
        preferences: guest.dietaryRestrictions || [],
        specialRequests: guest.specialNeeds || '',
        
        totalBookings: guest.totalStays,
        totalRevenue: 0, // TODO: Calculate from reservations
        isVip: guest.isVip,
        
        syncedAt: undefined,
        lastUpdated: guest.updatedAt
      };

      return {
        success: true,
        data: phobsGuest,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Guest mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Map Phobs guest to internal format
   */
  mapPhobsGuestToInternal(phobsGuest: PhobsGuest): MappingResult<Partial<Guest>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const internalGuest: Partial<Guest> = {
        firstName: phobsGuest.firstName,
        lastName: phobsGuest.lastName,
        fullName: `${phobsGuest.firstName} ${phobsGuest.lastName}`,
        email: phobsGuest.email,
        phone: phobsGuest.phone,
        dateOfBirth: phobsGuest.dateOfBirth,
        nationality: phobsGuest.nationality || phobsGuest.country,
        preferredLanguage: phobsGuest.language,
        dietaryRestrictions: phobsGuest.preferences,
        specialNeeds: phobsGuest.specialRequests,
        hasPets: false, // TODO: Detect from preferences
        isVip: phobsGuest.isVip,
        vipLevel: phobsGuest.isVip ? 1 : 0,
        children: [], // TODO: Map children data
        totalStays: phobsGuest.totalBookings,
        emergencyContactName: undefined,
        emergencyContactPhone: undefined,
        createdAt: new Date(),
        updatedAt: phobsGuest.lastUpdated
      };

      return {
        success: true,
        data: internalGuest,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Guest mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  // ===========================
  // ROOM AND AVAILABILITY MAPPING
  // ===========================

  /**
   * Map internal room to Phobs format
   */
  mapRoomToPhobs(room: Room): MappingResult<PhobsRoom> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const phobsRoom: PhobsRoom = {
        roomId: createPhobsRoomId(this.generatePhobsRoomId(room)),
        internalRoomId: room.id,
        roomNumber: room.number,
        roomType: PhobsDataMapperService.ROOM_TYPE_MAPPINGS[room.type]?.phobsRoomType || room.type,
        floor: room.floor,
        maxOccupancy: room.maxOccupancy,
        
        channelRoomMappings: {}, // TODO: Configure channel-specific mappings
        
        amenities: room.amenities,
        description: {
          en: room.nameEnglish,
          hr: room.nameCroatian,
          de: room.nameEnglish, // TODO: Add German translations
          it: room.nameEnglish  // TODO: Add Italian translations
        },
        
        images: [], // TODO: Add room images
        
        isActive: true,
        lastUpdated: new Date()
      };

      return {
        success: true,
        data: phobsRoom,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Room mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  // ===========================
  // VALIDATION METHODS
  // ===========================

  /**
   * Validate reservation data for Phobs mapping
   */
  private validateReservationForPhobs(
    reservation: Reservation,
    guest: Guest
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!reservation.roomId) errors.push('Room ID is required');
    if (!reservation.checkIn) errors.push('Check-in date is required');
    if (!reservation.checkOut) errors.push('Check-out date is required');
    if (!reservation.totalAmount || reservation.totalAmount <= 0) {
      errors.push('Valid total amount is required');
    }

    // Guest validation
    if (!guest.firstName) errors.push('Guest first name is required');
    if (!guest.lastName) errors.push('Guest last name is required');
    if (!guest.email) warnings.push('Guest email is recommended for OTA bookings');

    // Date validation
    if (reservation.checkIn >= reservation.checkOut) {
      errors.push('Check-out date must be after check-in date');
    }

    // Business rules validation
    if (reservation.numberOfGuests <= 0) {
      errors.push('Number of guests must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  /**
   * Generate Phobs reservation ID
   */
  private generatePhobsReservationId(reservation: Reservation): string {
    return `phobs_res_${reservation.id}_${Date.now()}`;
  }

  /**
   * Generate Phobs guest ID
   */
  private generatePhobsGuestId(guest: Guest): string {
    return `phobs_guest_${guest.id}_${Date.now()}`;
  }

  /**
   * Generate Phobs room ID
   */
  private generatePhobsRoomId(room: Room): string {
    return `phobs_room_${room.id}_${room.number}`;
  }

  /**
   * Map booking source to OTA channel
   */
  private mapBookingSourceToOTA(bookingSource: string): OTAChannel | null {
    return PhobsDataMapperService.OTA_CHANNEL_MAPPINGS[bookingSource.toLowerCase()] || null;
  }

  /**
   * Map OTA channel back to booking source
   */
  private mapOTAToBookingSource(channel: OTAChannel): string {
    const mapping = Object.entries(PhobsDataMapperService.OTA_CHANNEL_MAPPINGS)
      .find(([_, value]) => value === channel);
    return mapping ? mapping[0] : 'other';
  }

  /**
   * Calculate commission amount for OTA channel
   */
  private calculateCommission(totalAmount: number, channel: OTAChannel): number {
    const commissionRates: { [key in OTAChannel]: number } = {
      'booking.com': 0.15,
      'expedia': 0.18,
      'airbnb': 0.14,
      'agoda': 0.16,
      'hotels.com': 0.17,
      'hostelworld': 0.12,
      'kayak': 0.15,
      'trivago': 0.15,
      'priceline': 0.18,
      'camping.info': 0.10,
      'pitchup.com': 0.12,
      'eurocamp': 0.20,
      'directBooking': 0.00
    };

    const rate = commissionRates[channel] || 0;
    return Math.round(totalAmount * rate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Map payment status to Phobs format
   */
  private mapPaymentStatus(paymentStatus: string): 'pending' | 'confirmed' | 'paid' | 'cancelled' {
    const mapping: { [key: string]: 'pending' | 'confirmed' | 'paid' | 'cancelled' } = {
      'pending': 'pending',
      'partial': 'confirmed',
      'paid': 'paid',
      'refunded': 'cancelled',
      'cancelled': 'cancelled'
    };

    return mapping[paymentStatus.toLowerCase()] || 'pending';
  }

  /**
   * Map Phobs status to internal status
   */
  private mapPhobsStatusToInternal(phobsStatus: PhobsReservationStatus): ReservationStatus {
    const mapping: { [key in PhobsReservationStatus]: ReservationStatus } = {
      'new': 'confirmed',
      'confirmed': 'confirmed',
      'modified': 'confirmed',
      'cancelled': 'room-closure',
      'checked_in': 'checked-in',
      'checked_out': 'checked-out',
      'no_show': 'incomplete-payment'
    };

    return mapping[phobsStatus] || 'confirmed';
  }

  /**
   * Calculate seasonal period for date
   */
  private calculateSeasonalPeriod(date: Date): SeasonalPeriod {
    const month = date.getMonth() + 1; // JS months are 0-indexed
    
    if (month >= 12 || month <= 2) return 'A'; // Winter
    if (month >= 3 && month <= 5) return 'B'; // Spring
    if (month >= 6 && month <= 8) return 'D'; // Summer (peak)
    return 'C'; // Fall
  }

  /**
   * Calculate internal pricing breakdown from Phobs data
   */
  private calculateInternalPricing(phobsReservation: PhobsReservation) {
    const totalTaxes = phobsReservation.taxes;
    const totalFees = phobsReservation.fees;
    
    // Estimate breakdown (this would be more sophisticated in production)
    const vatAmount = totalTaxes * 0.8; // Assume 80% of taxes are VAT
    const tourismTax = totalTaxes * 0.2; // Assume 20% is tourism tax
    
    const petFee = totalFees * 0.3; // Rough estimate
    const parkingFee = totalFees * 0.4; // Rough estimate
    const additionalCharges = totalFees * 0.3; // Remaining fees
    
    const subtotal = phobsReservation.totalAmount - totalTaxes - totalFees;

    return {
      subtotal,
      childrenDiscounts: 0, // TODO: Calculate from reservation data
      tourismTax,
      vatAmount,
      petFee,
      parkingFee,
      shortStaySuplement: 0, // TODO: Calculate based on stay length
      additionalCharges
    };
  }

  /**
   * Get country code from country name
   */
  private getCountryCode(country: string): string {
    const countryCodes: { [key: string]: string } = {
      'Croatia': 'HR',
      'Germany': 'DE',
      'Italy': 'IT',
      'Austria': 'AT',
      'Slovenia': 'SI',
      'Bosnia and Herzegovina': 'BA',
      'Serbia': 'RS',
      'Hungary': 'HU',
      'Czech Republic': 'CZ',
      'Slovakia': 'SK',
      'Poland': 'PL',
      'United Kingdom': 'GB',
      'France': 'FR',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'United States': 'US',
      'Canada': 'CA',
      'Australia': 'AU'
    };

    return countryCodes[country] || 'HR'; // Default to Croatia
  }

  /**
   * Get data mapping configuration
   */
  getDataMapping(): DataMapping {
    return {
      roomTypeMappings: PhobsDataMapperService.ROOM_TYPE_MAPPINGS,
      statusMappings: PhobsDataMapperService.STATUS_MAPPINGS,
      paymentMethodMappings: PhobsDataMapperService.PAYMENT_METHOD_MAPPINGS
    };
  }
}