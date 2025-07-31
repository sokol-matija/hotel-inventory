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
  VAT_RATE: 0.25, // 25%
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