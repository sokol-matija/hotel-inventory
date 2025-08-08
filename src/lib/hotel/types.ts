// Hotel Management System - TypeScript Interfaces
// Hotel Porec - Real Business Data Structures

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
}

export interface GuestChild {
  name: string;
  dateOfBirth: Date;
  age: number; // Calculated for discount purposes
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  emergencyContact: string;
  nationality: string;
  preferredLanguage: string;
  passportDocument?: string;
  hasPets: boolean;
  dateOfBirth?: Date;
  children: GuestChild[];
  // Booking history tracking
  totalStays: number;
  isVip: boolean;
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
  checkIn: Date;
  checkOut: Date;
  numberOfGuests: number;
  adults: number;
  children: GuestChild[];
  status: ReservationStatus;
  bookingSource: BookingSource;
  specialRequests: string;
  
  // Pricing breakdown
  seasonalPeriod: SeasonalPeriod;
  baseRoomRate: number;
  numberOfNights: number;
  subtotal: number;
  childrenDiscounts: number;
  tourismTax: number;
  vatAmount: number; // 25%
  petFee: number;
  parkingFee: number;
  shortStaySuplement: number;
  additionalCharges: number;
  roomServiceItems: RoomServiceItem[];
  totalAmount: number;
  
  // Booking metadata
  bookingDate: Date;
  lastModified: Date;
  notes: string;
}

export interface PricingCalculation {
  // Base pricing
  baseRate: number;
  numberOfNights: number;
  seasonalPeriod: SeasonalPeriod;
  subtotal: number;
  
  // Discounts
  discounts: {
    children0to3: number;  // Free
    children3to7: number;  // 50% discount
    children7to14: number; // 20% discount
    longStay: number;      // Future: 7+ nights discount
  };
  totalDiscounts: number;
  
  // Fees and taxes
  fees: {
    tourism: number;       // €1.10 or €1.50 per person per night
    vat: number;          // 25% Croatian VAT
    pets: number;         // €20.00 per stay
    parking: number;      // €7.00 per night
    shortStay: number;    // +20% for stays < 3 days
    additional: number;   // Room service, extras
  };
  totalFees: number;
  
  // Final calculation
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
  createReservation: (reservation: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>) => Promise<void>;
  updateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  
  // Actions - Guests
  createGuest: (guest: Omit<Guest, 'id' | 'totalStays' | 'isVip'>) => Promise<void>;
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
  findGuestByLastname: (lastname: string) => Guest[];
  
  // Utilities
  calculatePricing: (
    roomId: string, 
    checkIn: Date, 
    checkOut: Date, 
    adults: number, 
    children: GuestChild[],
    options?: {
      hasPets?: boolean;
      needsParking?: boolean;
      additionalCharges?: number;
    }
  ) => PricingCalculation;
  
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
  VAT_RATE: 0.25, // 25% VAT (already included in room prices per Croatian law)
  PET_FEE: 20.00, // €20 per stay
  PARKING_FEE: 7.00, // €7 per night
  SHORT_STAY_SUPPLEMENT: 0.20, // +20% for stays < 3 days
  TOURISM_TAX_LOW: 1.10, // €1.10 periods I,II,III,X,XI,XII
  TOURISM_TAX_HIGH: 1.50, // €1.50 periods IV,V,VI,VII,VIII,IX
  CHILDREN_FREE_AGE: 3,
  CHILDREN_HALF_PRICE_AGE: 7,
  CHILDREN_DISCOUNT_AGE: 14,
  MIN_NIGHTS_NO_SUPPLEMENT: 3
} as const;

// Financial Management - Invoice and Payment Tracking
export type PaymentMethod = 'cash' | 'card' | 'bank-transfer' | 'booking-com' | 'other';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string; // Croatian fiscal format: YYYY-NNN-NNNN
  reservationId: string; // Links to existing reservation
  guestId: string; // Links to existing guest
  roomId: string; // Links to existing room
  
  // Invoice dates
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  
  // Status tracking
  status: InvoiceStatus;
  
  // Financial details (copies from reservation for audit trail)
  subtotal: number;
  vatAmount: number;
  tourismTax: number;
  petFee: number;
  parkingFee: number;
  additionalCharges: number;
  totalAmount: number;
  
  // Croatian fiscal compliance
  fiscalData: {
    oib: string; // Hotel's OIB tax ID
    jir: string; // Jedinstveni identifikator računa (JIR)
    zki: string; // Zaštitni kod izdavatelja (ZKI)
    fiscalReceiptUrl?: string; // URL to fiscal receipt
    operatorOib?: string; // Operator's OIB who issued invoice
  };
  
  // Payment tracking
  payments: Payment[];
  remainingAmount: number;
  
  // Metadata
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  
  // Payment details
  transactionId?: string;
  reference?: string;
  receivedDate: Date;
  processedDate?: Date;
  
  // Bank/card details (anonymized)
  cardLastFour?: string;
  bankReference?: string;
  
  // Metadata
  processedBy: string; // Staff member who processed
  notes: string;
  createdAt: Date;
}

export interface FiscalRecord {
  id: string;
  invoiceId: string;
  
  // Croatian fiscal compliance details
  jir: string; // Jedinstveni identifikator računa
  zki: string; // Zaštitni kod izdavatelja
  fiscalReceiptNumber: string;
  operatorOib: string;
  
  // Submission details
  submittedAt: Date;
  fiscalResponse: any; // Raw response from Croatian fiscal system
  isValid: boolean;
  
  // Audit trail
  createdAt: Date;
}

export interface RevenueAnalytics {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  
  // Revenue breakdown
  totalRevenue: number;
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
  generateFiscalReport: (startDate: Date, endDate: Date) => Promise<any>;
  
  // Financial utilities
  getTotalRevenue: (startDate: Date, endDate: Date) => number;
  getUnpaidInvoices: () => Invoice[];
  getPaymentSummary: (startDate: Date, endDate: Date) => {
    total: number;
    cash: number;
    card: number;
    bank: number;
    online: number;
  };
}

// Corporate Billing System - R1 Bills
export interface Company {
  id: string;
  name: string;
  oib: string; // Croatian tax number (unique)
  address: string;
  city: string;
  postalCode: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  fax?: string;
  
  // Business relationship
  pricingTierId?: string; // Links to PricingTier
  roomAllocationGuarantee?: number; // Number of guaranteed rooms
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  notes: string;
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

// Pricing Tier Management
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  
  // Rate modifiers (percentage adjustments to base rates)
  seasonalRateModifiers: {
    A: number; // Winter/Early Spring modifier (+/-%)
    B: number; // Spring/Late Fall modifier (+/-%)
    C: number; // Early Summer/Early Fall modifier (+/-%)
    D: number; // Peak Summer modifier (+/-%)
  };
  
  // Fee adjustments
  feeModifiers: {
    tourismTax: number; // Flat rate adjustment
    pets: number; // Flat rate adjustment
    parking: number; // Flat rate adjustment
    shortStay: number; // Percentage modifier
    additional: number; // Flat rate adjustment
  };
  
  // Applicability
  roomTypes: RoomType[]; // Which room types this applies to
  minimumStay?: number; // Minimum nights required
  maximumStay?: number; // Maximum nights allowed
  validFrom: Date;
  validTo: Date;
  
  // Metadata
  isActive: boolean;
  isDefault: boolean; // One tier must be marked as default
  createdAt: Date;
  updatedAt: Date;
  notes: string;
}