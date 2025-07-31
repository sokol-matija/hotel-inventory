// Hotel Porec - Sample Guest Data and Reservations
// Realistic data for testing the hotel management system

import { Guest, GuestChild, Reservation, ReservationStatus } from './types';
import { addDays, subDays, addWeeks, format } from 'date-fns';
import { calculatePricing } from './pricingCalculator';
import { HOTEL_POREC_ROOMS } from './hotelData';

// Generate realistic children data
function createChild(name: string, ageYears: number): GuestChild {
  const dateOfBirth = new Date();
  dateOfBirth.setFullYear(dateOfBirth.getFullYear() - ageYears);
  
  return {
    name,
    dateOfBirth,
    age: ageYears
  };
}

// Sample guest data with realistic European tourist patterns
export const SAMPLE_GUESTS: Guest[] = [
  // German tourists (major market for Croatian coast)
  {
    id: 'guest-1',
    name: 'Hans Mueller',
    email: 'hans.mueller@email.de',
    phone: '+49-30-12345678',
    emergencyContact: 'Ingrid Mueller +49-30-87654321',
    nationality: 'German',
    preferredLanguage: 'de',
    hasPets: false,
    children: [],
    totalStays: 3,
    isVip: true
  },
  {
    id: 'guest-2',  
    name: 'Familie Schmidt',
    email: 'schmidt.familie@gmail.com',
    phone: '+49-89-98765432',
    emergencyContact: 'Oma Schmidt +49-89-11111111',
    nationality: 'German',
    preferredLanguage: 'de',
    hasPets: true,
    children: [
      createChild('Max Schmidt', 8),
      createChild('Emma Schmidt', 5)
    ],
    totalStays: 1,
    isVip: false
  },
  
  // Italian tourists
  {
    id: 'guest-3',
    name: 'Marco Rossi',
    email: 'marco.rossi@libero.it',
    phone: '+39-06-12345678',
    emergencyContact: 'Maria Rossi +39-06-87654321',
    nationality: 'Italian',
    preferredLanguage: 'en',
    hasPets: false,
    children: [
      createChild('Sofia Rossi', 12)
    ],
    totalStays: 2,
    isVip: false
  },
  {
    id: 'guest-4',
    name: 'Giuseppe Bianchi',
    email: 'g.bianchi@yahoo.it',
    phone: '+39-02-98765432',
    emergencyContact: 'Anna Bianchi +39-02-11111111',
    nationality: 'Italian',
    preferredLanguage: 'en',
    hasPets: false,
    children: [],
    totalStays: 1,
    isVip: false
  },
  
  // Austrian tourists
  {
    id: 'guest-5',
    name: 'Franz Huber',
    email: 'franz.huber@aon.at',
    phone: '+43-1-12345678',
    emergencyContact: 'Elisabeth Huber +43-1-87654321',
    nationality: 'Austrian',
    preferredLanguage: 'de',
    hasPets: false,
    children: [
      createChild('Lukas Huber', 15),
      createChild('Anna Huber', 3)
    ],
    totalStays: 4,
    isVip: true
  },
  
  // British tourists
  {
    id: 'guest-6',
    name: 'James Thompson',
    email: 'j.thompson@outlook.com',
    phone: '+44-20-12345678',
    emergencyContact: 'Sarah Thompson +44-20-87654321',
    nationality: 'British',
    preferredLanguage: 'en',
    hasPets: false,
    children: [],
    totalStays: 1,
    isVip: false
  },
  
  // Croatian domestic tourists
  {
    id: 'guest-7',
    name: 'Marko Horvat',
    email: 'marko.horvat@t-com.hr',
    phone: '+385-1-12345678',
    emergencyContact: 'Ana Horvat +385-1-87654321',
    nationality: 'Croatian',
    preferredLanguage: 'hr',
    hasPets: true,
    children: [
      createChild('Petra Horvat', 10)
    ],
    totalStays: 2,
    isVip: false
  },
  
  // Slovenian tourists (neighboring country)
  {
    id: 'guest-8',
    name: 'Matej Novak',
    email: 'matej.novak@siol.net',
    phone: '+386-1-12345678',
    emergencyContact: 'Maja Novak +386-1-87654321',
    nationality: 'Slovenian',
    preferredLanguage: 'en',
    hasPets: false,
    children: [
      createChild('Nik Novak', 7),
      createChild('Lara Novak', 4)
    ],
    totalStays: 3,
    isVip: true
  },
  
  // French tourists
  {
    id: 'guest-9',
    name: 'Pierre Dubois',
    email: 'pierre.dubois@orange.fr',
    phone: '+33-1-12345678',
    emergencyContact: 'Marie Dubois +33-1-87654321',
    nationality: 'French',
    preferredLanguage: 'en',
    hasPets: false,
    children: [],
    totalStays: 1,
    isVip: false
  },
  
  // Dutch tourists
  {
    id: 'guest-10',
    name: 'Jan van der Berg',
    email: 'jan.vandenberg@ziggo.nl',
    phone: '+31-20-12345678',
    emergencyContact: 'Inge van der Berg +31-20-87654321',
    nationality: 'Dutch',
    preferredLanguage: 'en',
    hasPets: false,
    children: [
      createChild('Emma van der Berg', 13),
      createChild('Tim van der Berg', 9)
    ],
    totalStays: 2,
    isVip: false
  }
];

// Helper function to get random room
function getRandomRoom(): string {
  const randomIndex = Math.floor(Math.random() * HOTEL_POREC_ROOMS.length);
  return HOTEL_POREC_ROOMS[randomIndex].id;
}

// Generate sample reservations with realistic patterns
export function generateSampleReservations(): Reservation[] {
  const reservations: Reservation[] = [];
  const today = new Date();
  
  // Past reservations (checked out)
  const pastReservation1 = createReservation(
    'guest-1', // Hans Mueller (VIP)
    'room-401', // Premium rooftop apartment
    subDays(today, 10),
    subDays(today, 7),
    2,
    [],
    'checked-out',
    'direct',
    'Sea view room requested - VIP guest'
  );
  reservations.push(pastReservation1);
  
  // Current reservations (checked in)
  const currentReservation1 = createReservation(
    'guest-2', // Familie Schmidt with children
    'room-205', // Family room on floor 2
    subDays(today, 2),
    addDays(today, 3),
    2,
    SAMPLE_GUESTS.find(g => g.id === 'guest-2')?.children || [],
    'checked-in',
    'booking.com',
    'Family with small children, quiet room preferred',
    { hasPets: true, needsParking: true }
  );
  reservations.push(currentReservation1);
  
  // Future reservations (confirmed)
  const futureReservation1 = createReservation(
    'guest-3', // Marco Rossi with child
    'room-315', 
    addDays(today, 5),
    addDays(today, 10),
    2,
    SAMPLE_GUESTS.find(g => g.id === 'guest-3')?.children || [],
    'confirmed',
    'direct',
    'Late check-in expected around 18:00'
  );
  reservations.push(futureReservation1);
  
  const futureReservation2 = createReservation(
    'guest-5', // Franz Huber (VIP Austrian family)
    'room-301',
    addWeeks(today, 2),
    addWeeks(addDays(today, 4), 2),
    2,
    SAMPLE_GUESTS.find(g => g.id === 'guest-5')?.children || [],
    'confirmed',
    'direct',
    'Returning VIP guest - anniversary stay',
    { needsParking: true }
  );
  reservations.push(futureReservation2);
  
  // Incomplete payment reservation
  const incompletePayment = createReservation(
    'guest-6', // James Thompson
    'room-108',
    addDays(today, 7),
    addDays(today, 10),
    2,
    [],
    'incomplete-payment',
    'booking.com',
    'Payment pending - follow up required'
  );
  reservations.push(incompletePayment);
  
  // Room closure (maintenance)
  const roomClosure = createReservation(
    'system-maintenance',
    'room-201',
    addDays(today, 3),
    addDays(today, 4),
    0,
    [],
    'room-closure',
    'direct',
    'Air conditioning maintenance scheduled'
  );
  reservations.push(roomClosure);
  
  // More future bookings for demonstration
  const futureReservation3 = createReservation(
    'guest-7', // Croatian domestic
    'room-102',
    addWeeks(today, 3),
    addWeeks(addDays(today, 5), 3),
    2,
    SAMPLE_GUESTS.find(g => g.id === 'guest-7')?.children || [],
    'confirmed',
    'direct',
    'Domestic guest - Croatian keyboard needed',
    { hasPets: true }
  );
  reservations.push(futureReservation3);
  
  const futureReservation4 = createReservation(
    'guest-8', // Slovenian family
    'room-212',
    addWeeks(today, 4),
    addWeeks(addDays(today, 7), 4),
    2,
    SAMPLE_GUESTS.find(g => g.id === 'guest-8')?.children || [],
    'confirmed',
    'booking.com',
    'Family with young children - ground floor preferred'
  );
  reservations.push(futureReservation4);
  
  return reservations;
}

// Helper function to create a reservation with automatic pricing
function createReservation(
  guestId: string,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  adults: number,
  children: GuestChild[],
  status: ReservationStatus,
  bookingSource: 'booking.com' | 'direct' | 'other',
  specialRequests?: string,
  options?: { hasPets?: boolean; needsParking?: boolean; additionalCharges?: number }
): Reservation {
  // Calculate pricing automatically
  let pricing;
  try {
    pricing = calculatePricing(roomId, checkIn, checkOut, adults, children, options);
  } catch (error) {
    // Fallback pricing if calculation fails
    pricing = {
      baseRate: 70,
      numberOfNights: Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
      seasonalPeriod: 'B' as const,
      subtotal: 210,
      discounts: { children0to3: 0, children3to7: 0, children7to14: 0 },
      totalDiscounts: 0,
      fees: { tourism: 6, vat: 52.5, pets: 0, parking: 0, shortStay: 0, additional: 0 },
      totalFees: 58.5,
      total: 268.5
    };
  }
  
  const reservationId = `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: reservationId,
    roomId,
    guestId,
    checkIn,
    checkOut,
    numberOfGuests: adults + children.length,
    adults,
    children,
    status,
    bookingSource,
    specialRequests: specialRequests || '',
    
    // Pricing details from calculator
    seasonalPeriod: pricing.seasonalPeriod,
    baseRoomRate: pricing.baseRate,
    numberOfNights: pricing.numberOfNights,
    subtotal: pricing.subtotal,
    childrenDiscounts: pricing.totalDiscounts,
    tourismTax: pricing.fees.tourism,
    vatAmount: pricing.fees.vat,
    petFee: pricing.fees.pets,
    parkingFee: pricing.fees.parking,
    shortStaySuplement: pricing.fees.shortStay,
    additionalCharges: pricing.fees.additional,
    totalAmount: pricing.total,
    
    // Metadata
    bookingDate: subDays(checkIn, Math.floor(Math.random() * 30) + 1), // Booked 1-30 days in advance
    lastModified: new Date(),
    notes: ''
  };
}

// Export generated sample reservations
export const SAMPLE_RESERVATIONS: Reservation[] = generateSampleReservations();

// Utility functions for sample data
export function getGuestById(guestId: string): Guest | undefined {
  return SAMPLE_GUESTS.find(guest => guest.id === guestId);
}

export function getReservationsByStatus(status: ReservationStatus): Reservation[] {
  return SAMPLE_RESERVATIONS.filter(reservation => reservation.status === status);
}

export function getReservationsByGuest(guestId: string): Reservation[] {
  return SAMPLE_RESERVATIONS.filter(reservation => reservation.guestId === guestId);
}

export function getCurrentReservations(): Reservation[] {
  return getReservationsByStatus('checked-in');
}

export function getFutureReservations(): Reservation[] {
  return SAMPLE_RESERVATIONS.filter(reservation => 
    reservation.checkIn > new Date() && reservation.status === 'confirmed'
  );
}

// Sample data statistics
export const SAMPLE_DATA_STATS = {
  totalGuests: SAMPLE_GUESTS.length,
  totalReservations: SAMPLE_RESERVATIONS.length,
  vipGuests: SAMPLE_GUESTS.filter(g => g.isVip).length,
  guestsWithChildren: SAMPLE_GUESTS.filter(g => g.children.length > 0).length,
  nationalityBreakdown: SAMPLE_GUESTS.reduce((acc, guest) => {
    acc[guest.nationality] = (acc[guest.nationality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
  statusBreakdown: SAMPLE_RESERVATIONS.reduce((acc, reservation) => {
    acc[reservation.status] = (acc[reservation.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
};