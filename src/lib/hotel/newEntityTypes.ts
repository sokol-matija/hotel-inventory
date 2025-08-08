// New Entity Types for Enhanced Hotel Features
// These will be integrated into the main types.ts file

import { 
  RoomServiceItem, 
  SeasonalPeriod, 
  Reservation, 
  Guest,
  Invoice,
  Payment,
  FiscalRecord,
  ReservationStatus 
} from './types';

// Import existing storage keys (will be updated)
const STORAGE_KEYS = {
  RESERVATIONS: 'hotel_reservations_v1',
  GUESTS: 'hotel_guests_v1',
  INVOICES: 'hotel_invoices_v1',
  PAYMENTS: 'hotel_payments_v1',
  FISCAL_RECORDS: 'hotel_fiscal_records_v1',
  LAST_SYNC: 'hotel_last_sync_v1'
};

// 1. Corporate Billing System (R1 Bills)
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

// 2. Pricing Management System
export interface PricingTier {
  id: string;
  name: string; // e.g., "2025 Standard", "2026 Standard", "TUI Agency", "DER Touristik"
  description: string;
  isActive: boolean;
  
  // Seasonal pricing structure (same format as Room.seasonalRates)
  seasonalRates: {
    A: number; // Winter/Early Spring multiplier (e.g., 0.8 for 20% discount)
    B: number; // Spring/Late Fall multiplier
    C: number; // Early Summer/Early Fall multiplier  
    D: number; // Peak Summer multiplier
  };
  
  // Special rules
  isPercentageDiscount: boolean; // true = multiplier, false = fixed amount reduction
  minimumStay?: number; // Minimum nights required
  
  // Applicability
  validFrom: Date;
  validTo?: Date;
  companyIds: string[]; // Companies that can use this pricing
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// 3. Group Booking System
export interface GroupBooking {
  id: string;
  name: string; // e.g., "Bicycle Group #1", "Smith Family", "TechCorp Retreat"
  description: string;
  
  // Group properties
  totalGuests: number;
  preferredFloor?: number;
  specialRequests: string;
  
  // Reservations in this group
  reservationIds: string[];
  
  // Contact information
  groupLeaderGuestId: string; // Main contact person
  
  // Visual presentation
  colorCode: string; // Hex color for timeline display
  badgeText: string; // Short text for timeline badge
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  notes: string;
}

// 4. Register System (Croatian Fiscal)
export interface FiscalRegister {
  id: string;
  name: string; // "Register 1", "Register 2", etc.
  registerNumber: number; // 1, 2, 3, 4
  
  // Croatian fiscal settings
  businessSpaceCode: string; // e.g., "POSL1"
  operatorOib: string; // Operator tax number
  certificatePath?: string; // Path to fiscal certificate
  
  // Status
  isActive: boolean;
  isDefault: boolean; // One register should be default
  
  // Usage tracking
  lastInvoiceNumber: number;
  lastSequenceNumber: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// 5. Enhanced Reservation Status
export type EnhancedReservationStatus =
  | 'confirmed'
  | 'checked-in'
  | 'checked-out'
  | 'room-closure'
  | 'unallocated'
  | 'incomplete-payment'
  | 'tentative'; // NEW - for unconfirmed bookings

// 6. Room Service Categories (for drinks aggregation)
export type ServiceCategory = 
  | 'accommodation' // 13% VAT
  | 'parking' // 25% VAT
  | 'pet' // 25% VAT
  | 'drinks' // Will be aggregated on invoice
  | 'towel-rental' // NEW service type
  | 'additional'; // Other charges

// 7. Enhanced Room Service Item
export interface EnhancedRoomServiceItem extends RoomServiceItem {
  category: ServiceCategory;
  vatRate: number; // 13% or 25% based on category
  shouldAggregate: boolean; // true for drinks
}

// 8. VIP Discount System
export interface VipDiscount {
  id: string;
  guestId: string;
  discountPercentage: number; // e.g., 10 for 10%
  reason: string; // "VIP Customer", "Loyalty Program", etc.
  
  // Validity
  validFrom: Date;
  validTo?: Date;
  isActive: boolean;
  
  // Usage tracking
  maxUsages?: number;
  usageCount: number;
  
  // Metadata
  createdBy: string; // Staff member who created
  createdAt: Date;
}

// 9. Enhanced Pricing Calculation (extends existing)
export interface EnhancedPricingCalculation {
  // Base pricing
  baseRate: number;
  pricingTierId: string; // NEW - which pricing tier used
  pricingTierMultiplier: number; // Applied multiplier
  numberOfNights: number;
  seasonalPeriod: SeasonalPeriod;
  subtotal: number;
  
  // Discounts
  discounts: {
    children0to3: number;  // Free
    children3to7: number;  // 50% discount
    children7to14: number; // 20% discount
    vipDiscount: number;   // NEW - VIP customer discount
    corporateDiscount: number; // NEW - Company-specific discount
    longStay: number;      // 7+ nights discount
  };
  totalDiscounts: number;
  
  // Fees and taxes (with enhanced VAT)
  fees: {
    tourism: number;       // €1.10 or €1.50 per person per night
    roomVat: number;       // 13% Croatian VAT for accommodation
    parkingVat: number;    // 25% VAT for parking
    petVat: number;        // 25% VAT for pets
    pets: number;          // €20.00 per stay
    parking: number;       // €7.00 per night
    towelRental: number;   // NEW - Daily towel rental
    shortStay: number;     // +20% for stays < 3 days
    additional: number;    // Room service, extras
    drinks: number;        // NEW - Aggregated drinks total
  };
  totalFees: number;
  
  // Register selection
  fiscalRegisterId: string; // NEW - Which register to use
  
  // Final calculation
  total: number;
}

// 10. Guest Addition During Stay
export interface GuestAddition {
  id: string;
  reservationId: string;
  guestId: string;
  
  // Stay details
  checkInDate: Date; // When they joined the reservation
  checkOutDate: Date; // Same as original reservation checkout
  nightsStayed: number;
  
  // Pricing
  dailyRate: number;
  vatAmount: number; // 13%
  totalCharge: number;
  
  // Metadata
  addedBy: string; // Staff member
  addedAt: Date;
  notes: string;
}

// 11. Room-Specific Rules
export interface RoomRule {
  roomId: string;
  ruleType: 'cleaning-day' | 'minimum-stay' | 'fixed-pricing' | 'included-services';
  
  // Rule parameters
  cleaningDaysBetween?: number; // e.g., 1 for Room 401
  minimumNights?: number; // e.g., 4 for Room 401
  isFixedPricing?: boolean; // true for Room 401 (not per person)
  includedParkingSpaces?: number; // e.g., 3 for Room 401
  
  // Validity
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

// 12. Timeline Movement Modes
export type TimelineMovementMode = 
  | 'free-movement' // Current: can move horizontally and vertically
  | 'same-day-only'; // NEW: only vertical movement, same dates

// 13. Enhanced ReservationStatus with tentative
export interface TentativeReservationSettings {
  reservationId: string;
  confirmationDeadline: Date;
  remindersSent: number;
  autoConfirmAfter?: Date;
  notes: string;
}

// Updated localStorage keys
export const ENHANCED_STORAGE_KEYS = {
  ...STORAGE_KEYS, // Existing keys
  COMPANIES: 'hotel_companies_v1',
  PRICING_TIERS: 'hotel_pricing_tiers_v1',
  GROUP_BOOKINGS: 'hotel_group_bookings_v1',
  FISCAL_REGISTERS: 'hotel_fiscal_registers_v1',
  VIP_DISCOUNTS: 'hotel_vip_discounts_v1',
  GUEST_ADDITIONS: 'hotel_guest_additions_v1',
  ROOM_RULES: 'hotel_room_rules_v1',
  TENTATIVE_SETTINGS: 'hotel_tentative_settings_v1',
  TIMELINE_MODE: 'hotel_timeline_mode_v1'
} as const;

// Helper type for localStorage data structure
export interface LocalStorageHotelData {
  // Existing
  reservations: Reservation[];
  guests: Guest[];
  invoices: Invoice[];
  payments: Payment[];
  fiscalRecords: FiscalRecord[];
  
  // New entities
  companies: Company[];
  pricingTiers: PricingTier[];
  groupBookings: GroupBooking[];
  fiscalRegisters: FiscalRegister[];
  vipDiscounts: VipDiscount[];
  guestAdditions: GuestAddition[];
  roomRules: RoomRule[];
  tentativeSettings: TentativeReservationSettings[];
  
  // Settings
  timelineMovementMode: TimelineMovementMode;
  lastSync: string;
}

// Integration with existing Reservation interface
export interface EnhancedReservation extends Omit<Reservation, 'status' | 'roomServiceItems'> {
  status: EnhancedReservationStatus;
  roomServiceItems: EnhancedRoomServiceItem[];
  
  // New fields
  companyId?: string; // For R1 bills
  pricingTierId: string; // Which pricing tier used
  groupBookingId?: string; // If part of a group
  fiscalRegisterId: string; // Which register selected
  vipDiscountIds: string[]; // Applied VIP discounts
  guestAdditionIds: string[]; // Mid-stay guest additions
  
  // Billing type
  isR1Bill: boolean; // Corporate billing flag
  
  // Enhanced pricing
  enhancedPricingCalculation: EnhancedPricingCalculation;
}