// Hotel Management System - TypeScript Interfaces
// Hotel Porec - Real Business Data Structures

// Re-exports: DB-backed entity types live in their hook files.
export type { ChargeType, ReservationCharge } from '@/lib/queries/hooks/useReservationCharges';
export type { Company } from '@/lib/queries/hooks/useCompanies';
export type { PricingTier } from '@/lib/queries/hooks/usePricingTiers';
export type { Invoice } from '@/lib/queries/hooks/useInvoices';
export type { Reservation } from '@/lib/queries/hooks/useReservations';
export type { Label, LabelCreate, LabelUpdate } from '@/lib/queries/hooks/useLabels';

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

// Reservation type lives in useReservations.ts — re-exported at top of this file.
// Label types live in useLabels.ts — re-exported at top of this file.

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

// HotelContextType removed — no consumers.

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
  invoiceId: number;
  reservationId?: number; // Links to reservation
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
  gatewayResponse?: Record<string, unknown>;

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
  periods: Record<string, unknown>[];
}

// Company type lives in useCompanies.ts — re-exported at top of this file.

// EnhancedReservation removed — no consumers (see newEntityTypes.ts for the live version).

// PricingTier type lives in usePricingTiers.ts — re-exported at top of this file.
