// Hotel Management System - TypeScript Interfaces
// Hotel Porec - Real Business Data Structures

// DB row type aliases — private to this file. Used as compile-time anchors so that if
// a DB column is renamed, TypeScript will flag the mismatch here rather than silently drifting.
import type { Database } from '../database.types';

type _ChargeRow = Database['public']['Tables']['reservation_charges']['Row'];
type _InvoiceLineRow = Database['public']['Tables']['invoice_lines']['Row'];
type _CompanyRow = Database['public']['Tables']['companies']['Row'];
type _PricingTierRow = Database['public']['Tables']['pricing_tiers']['Row'];

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

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  nameCroatian: string;
  nameEnglish: string;
  seasonalRates: {
    A: number; // Winter/Early Spring
    B: number; // Spring/Late Fall
    C: number; // Early Summer/Early Fall
    D: number; // Peak Summer
  };
  maxOccupancy: number;
  isPremium: boolean;
  amenities: string[];
  is_clean?: boolean;
}

export interface GuestChild {
  name: string;
  dateOfBirth: Date;
  age: number; // Calculated for discount purposes
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  passportNumber?: string;
  idCardNumber?: string;
  preferredLanguage: string;
  dietaryRestrictions: string[];
  specialNeeds?: string;
  hasPets: boolean;
  isVip: boolean;
  vipLevel: number;
  children: GuestChild[];
  totalStays: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Charge model ──────────────────────────────────────────────────────────────

export type ChargeType =
  | 'accommodation'
  | 'tourism_tax'
  | 'parking'
  | 'pet_fee'
  | 'short_stay_supplement'
  | 'room_service'
  | 'towel_rental'
  | 'additional'
  | 'discount';

export interface ReservationCharge {
  id: _ChargeRow['id'];
  reservationId: _ChargeRow['reservation_id'];
  chargeType: ChargeType; // Stricter union of _ChargeRow['charge_type']
  description: _ChargeRow['description'];
  quantity: _ChargeRow['quantity'];
  unitPrice: _ChargeRow['unit_price'];
  total: _ChargeRow['total'];
  vatRate: _ChargeRow['vat_rate'];
  stayDate?: _ChargeRow['stay_date'];
  sortOrder: _ChargeRow['sort_order'];
  createdAt?: _ChargeRow['created_at'];
  updatedAt?: _ChargeRow['updated_at'];
}

export interface InvoiceLine {
  id: _InvoiceLineRow['id'];
  invoiceId: _InvoiceLineRow['invoice_id'];
  chargeType: ChargeType; // Stricter union of _InvoiceLineRow['charge_type']
  description: _InvoiceLineRow['description'];
  quantity: _InvoiceLineRow['quantity'];
  unitPrice: _InvoiceLineRow['unit_price'];
  total: _InvoiceLineRow['total'];
  vatRate: _InvoiceLineRow['vat_rate'];
  sortOrder: _InvoiceLineRow['sort_order'];
}

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

// Financial Management - Invoice and Payment Tracking
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'online' | 'booking-com' | 'other';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string; // Croatian fiscal format: YYYY-NNN-NNNN
  reservationId: string; // Links to existing reservation
  guestId: string; // Links to existing guest
  companyId?: string; // For corporate billing
  guest?: Guest; // For joined queries
  company?: Company; // For joined queries
  reservation?: Reservation; // For joined queries with full reservation data

  // Invoice dates
  issueDate: Date;
  dueDate: Date;
  serviceDate?: Date;
  paidDate?: Date;

  // Status tracking
  status: InvoiceStatus;

  // Financial details (copies from reservation for audit trail)
  currency: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]; // Invoice line items
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  tourismTax: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  // Payment details
  paymentMethod?: string;

  // Croatian fiscal compliance
  fiscalData?: {
    oib: string; // Hotel's OIB tax ID
    jir: string; // Jedinstveni identifikator računa (JIR)
    zki: string; // Zaštitni kod izdavatelja (ZKI)
    qrCodeData?: string; // QR code data for fiscal receipt
    fiscalReceiptUrl?: string; // URL to fiscal receipt
    operatorOib?: string; // Operator's OIB who issued invoice
  };

  // Payment tracking
  payments?: Payment[]; // Made optional

  // Document management
  issuedBy?: string;
  pdfPath?: string;
  isEmailSent?: boolean;
  emailSentAt?: Date;

  // Metadata
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

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

// Extended Hotel Context with Financial Management
export interface FinancialHotelContextType extends HotelContextType {
  // Financial data
  invoices: Invoice[];
  payments: Payment[];
  fiscalRecords: FiscalRecord[];
  revenueAnalytics: RevenueAnalytics[];

  // Financial actions - Invoices
  generateInvoice: (reservationId: string) => Promise<Invoice>;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void>;
  getInvoicesByGuest: (guestId: string) => Invoice[];
  getInvoicesByDateRange: (start: Date, end: Date) => Invoice[];
  getOverdueInvoices: () => Invoice[];

  // Financial actions - Payments
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Promise<void>;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus) => Promise<void>;
  getPaymentsByInvoice: (invoiceId: string) => Payment[];
  getPaymentsByMethod: (method: PaymentMethod) => Payment[];

  // Revenue analytics
  calculateRevenueAnalytics: (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ) => RevenueAnalytics;

  // Croatian fiscal compliance
  submitFiscalRecord: (invoiceId: string) => Promise<FiscalRecord>;
  validateFiscalCompliance: (invoiceId: string) => Promise<boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateFiscalReport: (startDate: Date, endDate: Date) => Promise<any>;

  // Financial utilities
  getTotalRevenue: (startDate: Date, endDate: Date) => number;
  getUnpaidInvoices: () => Invoice[];
  getPaymentSummary: (
    startDate: Date,
    endDate: Date
  ) => {
    total: number;
    cash: number;
    card: number;
    bank: number;
    online: number;
  };
}

// Compile-time check: verify all DB column names used by the Company mapper still exist.
// If any DB column is renamed, TypeScript will error here.
// Note: Company.id is string (converted via toString()) while DB id is number — intentional.
// Note: DB splits address into address/city/postal_code/country columns; app nests them.
// Note: createdAt/updatedAt are Date in app vs string in DB — intentional mapper conversion.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _VerifyCompanyColumns = Pick<
  _CompanyRow,
  | 'id'
  | 'name'
  | 'oib'
  | 'address'
  | 'city'
  | 'postal_code'
  | 'country'
  | 'contact_person'
  | 'email'
  | 'phone'
  | 'fax'
  | 'pricing_tier_id'
  | 'room_allocation_guarantee'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
  | 'notes'
>;

// Corporate Billing System - R1 Bills
export interface Company {
  id: string; // toString() of _CompanyRow['id'] (number → string)
  name: string; // _CompanyRow['name']
  oib: string; // _CompanyRow['oib'] — mapper normalises null → ''
  address: {
    street: string; // _CompanyRow['address']
    city: string; // _CompanyRow['city']
    postalCode: string; // _CompanyRow['postal_code']
    country: string; // _CompanyRow['country']
  };
  contactPerson: string; // _CompanyRow['contact_person']
  email: string; // _CompanyRow['email']
  phone: string; // _CompanyRow['phone'] — mapper normalises null → ''
  fax?: string; // _CompanyRow['fax']

  // Additional business details (not yet in DB — planned columns)
  vatNumber?: string;
  businessRegistrationNumber?: string;
  discountPercentage?: number;
  paymentTerms?: string;

  // Billing address (if different from main address)
  billingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Business relationship
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricingTier?: any; // For joined queries
  pricingTierId?: string; // toString() of _CompanyRow['pricing_tier_id']
  roomAllocationGuarantee?: _CompanyRow['room_allocation_guarantee'];

  // Metadata
  isActive: boolean; // _CompanyRow['is_active'] — mapper normalises null → true
  createdAt: Date; // parsed from _CompanyRow['created_at'] (string → Date)
  updatedAt: Date; // parsed from _CompanyRow['updated_at'] (string → Date)
  notes: string; // _CompanyRow['notes'] — mapper normalises null → ''
}

// Enhanced Reservation with Corporate Billing
export interface EnhancedReservation extends Omit<Reservation, 'roomServiceItems'> {
  roomServiceItems: RoomServiceItem[];

  // Corporate billing fields
  companyId?: string; // For R1 bills
  isR1Bill: boolean; // Corporate billing flag

  // Enhanced metadata
  lastModified: Date;
}

// Compile-time check: verify all DB column names used by the PricingTier mapper still exist.
// Note: DB column is 'minimum_stay', not 'minimum_stay_requirement' — app alias is kept for clarity.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _VerifyPricingTierColumns = Pick<
  _PricingTierRow,
  | 'id'
  | 'name'
  | 'description'
  | 'discount_percentage'
  | 'is_default'
  | 'is_active'
  | 'minimum_stay'
  | 'valid_from'
  | 'valid_to'
  | 'created_at'
  | 'updated_at'
>;

// Pricing Tier Management
export interface PricingTier {
  id: string; // toString() of _PricingTierRow['id'] (number → string)
  name: string; // _PricingTierRow['name']
  description: string; // _PricingTierRow['description'] — mapper normalises null → ''
  discountPercentage: number; // _PricingTierRow['discount_percentage'] — mapper normalises null → 0
  isDefault: boolean; // _PricingTierRow['is_default'] — mapper normalises null → false
  isActive: boolean; // _PricingTierRow['is_active'] — mapper normalises null → true
  minimumStayRequirement?: number; // _PricingTierRow['minimum_stay'] — DB column: minimum_stay
  validFrom?: Date; // parsed from _PricingTierRow['valid_from'] (string | null → Date)
  validTo?: Date; // parsed from _PricingTierRow['valid_to'] (string | null → Date)
  createdAt: Date; // parsed from _PricingTierRow['created_at'] (string → Date)
  updatedAt: Date; // parsed from _PricingTierRow['updated_at'] (string → Date)
}
