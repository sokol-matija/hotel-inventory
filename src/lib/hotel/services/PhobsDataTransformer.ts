// PhobsDataTransformer - Transforms data between internal and OTA formats
// Handles type conversions, date formatting, and code mappings

import {
  PhobsReservation,
  PhobsAvailability,
  PhobsRatePlan,
  OTAChannel,
  PhobsReservationStatus,
  PhobsRoomId,
  PhobsRateId,
  createPhobsReservationId,
  createPhobsGuestId,
  createPhobsRoomId,
} from './phobsTypes';
import { Reservation, Room, ReservationStatus, PaymentMethod, GuestChild } from '../types';

/**
 * Date format utilities for OTA standard
 */
export class OtaDateFormatter {
  /**
   * Convert Date to OTA date string (YYYY-MM-DD)
   */
  static toOtaDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Convert Date to OTA datetime string (ISO 8601)
   */
  static toOtaDateTime(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse OTA date string to Date
   */
  static fromOtaDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Parse OTA datetime string to Date
   */
  static fromOtaDateTime(dateTimeString: string): Date {
    return new Date(dateTimeString);
  }

  /**
   * Get current OTA timestamp
   */
  static now(): string {
    return new Date().toISOString();
  }
}

/**
 * OTA Age Qualifying Codes
 */
export enum OtaAgeQualifyingCode {
  Adult = 10,
  Child = 8,
  Infant = 7,
  Senior = 11,
}

/**
 * PhobsDataTransformer - Bidirectional data transformation
 */
export class PhobsDataTransformer {
  /**
   * Transform internal Reservation to Phobs format
   */
  static reservationToPhobs(
    reservation: Reservation,
    hotelCode: string,
    roomTypeCode: string,
    ratePlanCode: string
  ): {
    hotelCode: string;
    resStatus: 'Commit' | 'Cancel' | 'Modify';
    reservationId: string;
    roomTypeCode: string;
    ratePlanCode: string;
    checkIn: string;
    checkOut: string;
    numberOfUnits: number;
    guestCounts: Array<{
      ageQualifyingCode: number;
      count: number;
    }>;
    guest?: {
      givenName: string;
      surname: string;
      email?: string;
      phone?: string;
    };
    totalAmount?: number;
    currencyCode: string;
  } {
    // Map reservation status (room-closure represents cancelled/closed rooms)
    let resStatus: 'Commit' | 'Cancel' | 'Modify' = 'Commit';
    if (reservation.status === 'room-closure') {
      resStatus = 'Cancel';
    } else if (reservation.id && reservation.lastModified) {
      resStatus = 'Modify';
    }

    // Build guest counts
    const guestCounts: Array<{
      ageQualifyingCode: number;
      count: number;
    }> = [];

    if (reservation.adults > 0) {
      guestCounts.push({
        ageQualifyingCode: OtaAgeQualifyingCode.Adult,
        count: reservation.adults,
      });
    }

    if (reservation.children && reservation.children.length > 0) {
      guestCounts.push({
        ageQualifyingCode: OtaAgeQualifyingCode.Child,
        count: reservation.children.length,
      });
    }

    return {
      hotelCode,
      resStatus,
      reservationId: reservation.id || `RES_${Date.now()}`,
      roomTypeCode,
      ratePlanCode,
      checkIn: OtaDateFormatter.toOtaDate(reservation.checkIn),
      checkOut: OtaDateFormatter.toOtaDate(reservation.checkOut),
      numberOfUnits: 1,
      guestCounts,
      guest: reservation.guestId
        ? {
            givenName: reservation.guestId, // TODO: Look up actual guest data
            surname: 'Guest',
            email: undefined,
            phone: undefined,
          }
        : undefined,
      totalAmount: reservation.totalAmount,
      currencyCode: 'EUR',
    };
  }

  /**
   * Transform Phobs reservation to internal format
   */
  static phobsToReservation(phobsReservation: PhobsReservation): Partial<Reservation> {
    // Map status (use room-closure for cancelled/no-show as there's no 'canceled' status)
    const statusMap: { [K in PhobsReservationStatus]: ReservationStatus } = {
      new: 'confirmed',
      confirmed: 'confirmed',
      modified: 'confirmed',
      cancelled: 'room-closure',
      checked_in: 'checked-in',
      checked_out: 'checked-out',
      no_show: 'room-closure',
    };

    // Extract children count
    const childrenCount = phobsReservation.children || 0;
    const children: GuestChild[] = [];
    for (let i = 0; i < childrenCount; i++) {
      const childAge = 8; // Default age
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - childAge);

      children.push({
        name: `Child ${i + 1}`,
        dateOfBirth,
        age: childAge
      });
    }

    return {
      roomId: phobsReservation.roomId,
      checkIn: phobsReservation.checkIn,
      checkOut: phobsReservation.checkOut,
      numberOfGuests: phobsReservation.numberOfGuests,
      adults: phobsReservation.adults,
      children,
      status: statusMap[phobsReservation.status],
      bookingSource: this.mapOtaChannelToBookingSource(phobsReservation.channel),
      specialRequests: phobsReservation.specialRequests,
      totalAmount: phobsReservation.totalAmount,
      bookingDate: phobsReservation.bookingDate,
      lastModified: phobsReservation.lastModified,
      notes: `OTA Booking from ${phobsReservation.channel} - Ref: ${phobsReservation.bookingReference}`,
    };
  }

  /**
   * Transform availability data for OTA
   */
  static availabilityToOta(params: {
    hotelCode: string;
    roomId: PhobsRoomId;
    roomTypeCode: string;
    ratePlanCode?: string;
    startDate: Date;
    endDate: Date;
    available: number;
    status?: 'Open' | 'Close';
    minStay?: number;
    maxStay?: number;
    closeToArrival?: boolean;
    closeToDeparture?: boolean;
  }): {
    hotelCode: string;
    roomTypeCode: string;
    ratePlanCode?: string;
    startDate: string;
    endDate: string;
    available: number;
    status?: 'Open' | 'Close';
    minStay?: number;
    maxStay?: number;
    closeToArrival?: boolean;
    closeToDeparture?: boolean;
  } {
    return {
      hotelCode: params.hotelCode,
      roomTypeCode: params.roomTypeCode,
      ratePlanCode: params.ratePlanCode,
      startDate: OtaDateFormatter.toOtaDate(params.startDate),
      endDate: OtaDateFormatter.toOtaDate(params.endDate),
      available: params.available,
      status: params.status,
      minStay: params.minStay,
      maxStay: params.maxStay,
      closeToArrival: params.closeToArrival,
      closeToDeparture: params.closeToDeparture,
    };
  }

  /**
   * Transform rate data for OTA
   */
  static rateToOta(params: {
    hotelCode: string;
    roomTypeCode: string;
    ratePlanCode: string;
    startDate: Date;
    endDate: Date;
    baseRate: number;
    currencyCode?: string;
    adultsRate?: number;
    childrenRate?: number;
  }): {
    hotelCode: string;
    roomTypeCode: string;
    ratePlanCode: string;
    startDate: string;
    endDate: string;
    currencyCode: string;
    rates: Array<{
      numberOfGuests: number;
      ageQualifyingCode?: number;
      amount: number;
    }>;
  } {
    const rates: Array<{
      numberOfGuests: number;
      ageQualifyingCode?: number;
      amount: number;
    }> = [];

    // Add adult rate
    rates.push({
      numberOfGuests: 1,
      ageQualifyingCode: OtaAgeQualifyingCode.Adult,
      amount: params.adultsRate || params.baseRate,
    });

    // Add additional rates for 2 adults
    rates.push({
      numberOfGuests: 2,
      ageQualifyingCode: OtaAgeQualifyingCode.Adult,
      amount: (params.adultsRate || params.baseRate) * 2,
    });

    // Add child rate if provided
    if (params.childrenRate) {
      rates.push({
        numberOfGuests: 1,
        ageQualifyingCode: OtaAgeQualifyingCode.Child,
        amount: params.childrenRate,
      });
    }

    return {
      hotelCode: params.hotelCode,
      roomTypeCode: params.roomTypeCode,
      ratePlanCode: params.ratePlanCode,
      startDate: OtaDateFormatter.toOtaDate(params.startDate),
      endDate: OtaDateFormatter.toOtaDate(params.endDate),
      currencyCode: params.currencyCode || 'EUR',
      rates,
    };
  }

  /**
   * Map OTA channel to internal booking source
   * Note: BookingSource only supports 'booking.com', 'direct', 'other'
   */
  private static mapOtaChannelToBookingSource(
    channel: OTAChannel
  ): 'direct' | 'booking.com' | 'other' {
    const mapping: {
      [K in OTAChannel]: 'direct' | 'booking.com' | 'other';
    } = {
      'booking.com': 'booking.com',
      directBooking: 'direct',
      airbnb: 'other',
      expedia: 'other',
      agoda: 'other',
      'hotels.com': 'other',
      hostelworld: 'other',
      kayak: 'other',
      trivago: 'other',
      priceline: 'other',
      'camping.info': 'other',
      'pitchup.com': 'other',
      eurocamp: 'other',
    };
    return mapping[channel];
  }

  /**
   * Map internal room type to OTA room type code
   */
  static mapRoomTypeToOtaCode(roomType: string): string {
    // This should be configurable per hotel
    const mapping: { [key: string]: string } = {
      standard: 'STD',
      deluxe: 'DLX',
      suite: 'STE',
      double: 'DBL',
      twin: 'TWN',
      single: 'SGL',
      family: 'FAM',
      apartment: 'APT',
      studio: 'STD',
      mobilehome: 'MOB',
    };

    return mapping[roomType.toLowerCase()] || roomType.toUpperCase().substring(0, 3);
  }

  /**
   * Map internal rate plan to OTA rate plan code
   */
  static mapRatePlanToOtaCode(ratePlanName: string): string {
    // This should be configurable per hotel
    const mapping: { [key: string]: string } = {
      'best available rate': 'BAR',
      'non-refundable': 'NRF',
      'early bird': 'EBD',
      'last minute': 'LMD',
      'weekly rate': 'WKL',
      'monthly rate': 'MTH',
      'corporate': 'CRP',
    };

    return (
      mapping[ratePlanName.toLowerCase()] ||
      ratePlanName.toUpperCase().substring(0, 3)
    );
  }

  /**
   * Generate unique echo token for OTA messages
   */
  static generateEchoToken(prefix: string = 'MSG'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Calculate number of nights between two dates
   */
  static calculateNights(checkIn: Date, checkOut: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffMs / msPerDay);
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate: Date, endDate: Date): {
    valid: boolean;
    error?: string;
  } {
    if (startDate >= endDate) {
      return {
        valid: false,
        error: 'End date must be after start date',
      };
    }

    if (startDate < new Date()) {
      return {
        valid: false,
        error: 'Start date cannot be in the past',
      };
    }

    return { valid: true };
  }
}
