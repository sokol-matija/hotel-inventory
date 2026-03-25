// Hotel Management System - TypeScript Interfaces
// Hotel Porec - Real Business Data Structures

import type { Room } from '@/lib/queries/hooks/useRooms';

// Re-exports: DB-backed entity types live in their hook files.
export type { ChargeType, ReservationCharge } from '@/lib/queries/hooks/useReservationCharges';
export type { Company } from '@/lib/queries/hooks/useCompanies';
export type { PricingTier } from '@/lib/queries/hooks/usePricingTiers';
export type { Invoice } from '@/lib/queries/hooks/useInvoices';

export type SeasonalPeriod = 'A' | 'B' | 'C' | 'D';

export type RoomType =
  | 'big-double'
  | 'big-single'
  | 'double'
  | 'triple'
  | 'single'
  | 'family'
  | 'apartment'
  | 'rooftop-apartment';

export type ReservationStatus =
  | 'confirmed'
  | 'checked-in'
  | 'checked-out'
  | 'room-closure'
  | 'unallocated'
  | 'incomplete-payment';

export type BookingSource = 'booking.com' | 'direct' | 'other';

export interface Hotel {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  taxId: string; // OIB - Croatian tax ID
}

// Room interface moved to src/lib/queries/hooks/useRooms.ts (TQ v5 pattern).
// Import Room from '@/lib/queries/hooks/useRooms' — NOT from here.

/** @deprecated Children are stored in guest_children table, not in Guest object. */
export interface GuestChild {
  name: string;
  dateOfBirth: Date;
  age: number; // Calculated for discount purposes
}

// Guest interface moved to src/lib/queries/hooks/useGuests.ts (TQ v5 pattern).
// Re-exported here for backward compatibility.
import type { Guest } from '@/lib/queries/hooks/useGuests';
export type { Guest };

export interface RoomServiceItem {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderedAt: Date;
}

export interface Reservation {
  id: string;
  roomId: string;
  guestId: string;
  guest?: Guest; // For joined queries
  checkIn: Date;
  checkOut: Date;
  numberOfGuests: number;
  adults: number;
  children: GuestChild[];
  status: ReservationStatus;
  bookingSource: BookingSource;
  specialRequests: string;

  // Corporate booking
  isR1Bill?: boolean;
  companyId?: string;
  pricingTierId?: string;

  // Number of nights (still in DB)
  numberOfNights: number;

  // ── Deprecated flat pricing fields ─────────────────────────────────────────
  // These columns were dropped from the DB in Phase 1 migration.
  // The fields stay here as required stubs (populated with 0 / defaults by
  // DatabaseAdapter) so that existing consumer code compiles while those
  // consumers are migrated to ReservationCharge in Phases 3-8.
  // DO NOT populate these in new code — use reservation_charges instead.
  /** @deprecated Use ReservationCharge rows instead */
  pricing?: {
    subtotal: number;
    tourismTax: number;
    vatRate: number;
    vatAmount: number;
    roomRate: number;
    seasonalPeriod: SeasonalPeriod;
    discounts: number;
    additionalCharges: number;
    total: number;
  };
  /** @deprecated Use ReservationCharge rows instead */
  seasonalPeriod: SeasonalPeriod;
  /** @deprecated Use ReservationCharge rows instead */
  baseRoomRate: number;
  /** @deprecated Use ReservationCharge rows instead */
  subtotal: number;
  /** @deprecated Use ReservationCharge rows instead */
  childrenDiscounts: number;
  /** @deprecated Use ReservationCharge rows instead */
  tourismTax: number;
  /** @deprecated Use ReservationCharge rows instead */
  vatAmount: number;
  /** @deprecated Use ReservationCharge rows instead */
  petFee: number;
  /** @deprecated Use ReservationCharge rows instead */
  parkingFee: number;
  /** @deprecated Use ReservationCharge rows instead */
  shortStaySuplement: number;
  /** @deprecated Use ReservationCharge rows instead */
  additionalCharges: number;
  /** @deprecated Use ReservationCharge rows instead */
  roomServiceItems: RoomServiceItem[];
  /** @deprecated Use ReservationCharge rows instead */
  totalAmount: number;
  /** @deprecated Use ReservationCharge rows instead */
  paymentStatus?: string;

  // Guest preferences
  hasPets?: boolean;

  // Timestamps
  checkedInAt?: Date;
  checkedOutAt?: Date;

  // Booking metadata
  bookingDate: Date;
  lastModified: Date;
  notes: string;

  // Label/Group (for tracking related reservations)
  labelId?: string;
  label?: Label; // For joined queries
}

// Label/Group for organizing related reservations
// (e.g., "german-bikers" for a tour group across multiple rooms)
export interface Label {
  id: string;
  hotelId: string;
  name: string;
  color: string; // Text color (default: #000000)
  bgColor: string; // Background color (default: #FFFFFF)
  createdAt: Date;
  updatedAt: Date;
}

// Utility types for Label operations
export type LabelCreate = Omit<Label, 'id' | 'createdAt' | 'updatedAt' | 'color' | 'bgColor'> & {
  color?: string; // Optional - auto-assigned from color pool if not provided
  bgColor?: string; // Optional - auto-assigned from color pool if not provided
};
export type LabelUpdate = Partial<Pick<Label, 'name' | 'color' | 'bgColor'>>;

/**
 * @deprecated Will be removed once all pricing consumers migrate to ReservationCharge.
 * Kept temporarily so UnifiedPricingService and PDF generator compile during the phased migration.
 */
export interface PricingCalculation {
  baseRate: number;
  numberOfNights: number;
  seasonalPeriod: SeasonalPeriod;
  subtotal: number;
  discounts: {
    children0to3: number;
    children3to7: number;
    children7to14: number;
    longStay: number;
  };
  totalDiscounts: number;
  fees: {
    tourism: number;
    vat: number;
    pets: number;
    parking: number;
    shortStay: number;
    additional: number;
  };
  totalFees: number;
  total: number;
}

// Seasonal period definitions for 2025
export interface SeasonalPeriodDefinition {
  period: SeasonalPeriod;
  name: string;
  startDate: string;
  endDate?: string;
  periods?: Array<{
    startDate: string;
    endDate: string;
  }>;
  tourismTaxRate: number; // €1.10 or €1.50
}

// Calendar and availability interfaces
export interface CalendarEvent {
  id: string;
  reservationId: string;
  roomId: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    status: ReservationStatus;
    guestName: string;
    roomNumber: string;
    numberOfGuests: number;
    hasPets: boolean;
  };
}

export interface RoomAvailability {
  roomId: string;
  date: Date;
  isAvailable: boolean;
  reservationId?: string;
  status?: ReservationStatus;
}

// Hotel context and state management
export interface HotelContextType {
  // Hotel data
  hotel: Hotel;
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions - Reservations
  createReservation: (
    reservation: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>
  ) => Promise<void>;
  updateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;

  // Actions - Guests
  createGuest: (guest: Omit<Guest, 'id' | 'totalStays' | 'isVip'>) => Promise<void>;
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
  findGuestByLastname: (lastname: string) => Guest[];

  // Utilities
  getSeasonalPeriod: (date: Date) => SeasonalPeriod;
  getRoomsByFloor: (floor: number) => Room[];
  getAvailableRooms: (checkIn: Date, checkOut: Date) => Room[];
  checkRoomAvailability: (roomId: string, checkIn: Date, checkOut: Date) => boolean;
  getReservationsForDateRange: (start: Date, end: Date) => Reservation[];

  // Calendar helpers
  getCalendarEvents: (start: Date, end: Date) => CalendarEvent[];
  getReservationsByRoom: (roomId: string, start: Date, end: Date) => Reservation[];
}

// Constants
export const HOTEL_CONSTANTS = {
  VAT_RATE: 0.13, // 13% VAT for accommodation (Croatian law since 2018; 25% applies to F&B)
  PET_FEE: 20.0, // €20 per stay
  PARKING_FEE: 7.0, // €7 per night
  SHORT_STAY_SUPPLEMENT: 0.2, // +20% for stays < 3 days
  TOURISM_TAX_LOW: 1.1, // €1.10 (Jan–Mar, Oct–Dec)
  TOURISM_TAX_HIGH: 1.6, // €1.60 (Apr–Sep)
  CHILDREN_FREE_AGE: 3,
  CHILDREN_HALF_PRICE_AGE: 7,
  CHILDREN_DISCOUNT_AGE: 14,
  MIN_NIGHTS_NO_SUPPLEMENT: 3,
} as const;

// Financial Management — domain union types (not DB entities)
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'online' | 'booking-com' | 'other';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Payment {
  id: string;
  invoiceId: string;
  reservationId?: string; // Links to reservation
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;

  // Payment details
  transactionId?: string;
  referenceNumber?: string;
  receivedDate: Date;
  processedDate?: Date;

  // Bank/card details (anonymized)
  cardLastFour?: string;
  bankReference?: string;

  // Financial processing
  processingFee?: number;
  netAmount?: number;
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrency?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gatewayResponse?: any;

  // Refund support
  isRefund?: boolean;
  parentPaymentId?: string;

  // Metadata
  processedBy?: string; // Staff member who processed - made optional
  notes?: string; // Made optional
  createdAt: Date;
}

export interface FiscalRecord {
  id: string;
  invoiceId: string;

  // Croatian fiscal compliance details
  jir: string; // Jedinstveni identifikator računa
  zki: string; // Zaštitni kod izdavatelja
  brojRacuna: string; // Invoice number
  oznakaSljednostiRacuna: string; // Sequential receipt mark
  naknadnaDostavaPoruke: boolean; // Subsequent message delivery
  paragonBroj?: string; // Paragon number
  specificniNamjetRacuna: string; // Specific purpose of receipt

  // Submission details
  dateTimeSubmitted: Date;
  dateTimeReceived?: Date;

  // Financial totals
  ukupanIznos: number; // Total amount
  naknadaZaZastituOkolisa?: number; // Environmental protection fee
  ukupanIznosPorezaPoStopama: number; // Total tax amount by rates
  ukupanIznosOslobodjenjaPorstopa: number; // Total exemption amount by rates
  ukupanIznosNeporezivo: number; // Total non-taxable amount
  ukupanIznosPoreza: number; // Total tax amount
  ukupanIznosNaplata: number; // Total collection amount
  nacinPlacanja: string; // Payment method

  // Operator details
  oibOper: string; // Operator OIB
  nap: string; // Note or additional info

  // Status and error handling
  status: string;
  errorMessage?: string;
  xmlRequest?: string;
  xmlResponse?: string;

  // Audit trail
  createdAt: Date;
}

export interface RevenueAnalytics {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;

  // Revenue breakdown
  totalRevenue: number;
  totalBookings: number; // Added this property
  roomRevenue: number;
  taxRevenue: number;
  additionalRevenue: number;

  // Tax breakdown
  vatCollected: number;
  tourismTaxCollected: number;

  // Booking sources
  directBookings: number;
  bookingComRevenue: number;
  otherSourcesRevenue: number;

  // Payment methods
  cashPayments: number;
  cardPayments: number;
  bankTransfers: number;
  onlinePayments: number;

  // Statistics
  totalInvoices: number;
  averageBookingValue: number;
  occupancyRate: number;

  // Croatian fiscal compliance
  fiscalReportsGenerated: number;
  fiscalSubmissions: number;

  // Time series data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  periods: any[];
}

// Company type lives in useCompanies.ts — re-exported at top of this file.

// Enhanced Reservation with Corporate Billing
export interface EnhancedReservation extends Omit<Reservation, 'roomServiceItems'> {
  roomServiceItems: RoomServiceItem[];

  // Corporate billing fields
  companyId?: string; // For R1 bills
  isR1Bill: boolean; // Corporate billing flag

  // Enhanced metadata
  lastModified: Date;
}

// PricingTier type lives in usePricingTiers.ts — re-exported at top of this file.
