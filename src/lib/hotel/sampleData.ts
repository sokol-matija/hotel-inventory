// Hotel Porec - Sample Guest Data and Reservations
// Realistic data for testing the hotel management system

import { Guest, GuestChild, Reservation, ReservationStatus } from './types';
import { addDays, subDays, addWeeks, format } from 'date-fns';
import { HotelPricingEngine, PricingCalculationInput } from './pricingEngine';
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

// Helper to calculate pricing using 2026 engine (replaces old calculatePricing)
function calculate2026Pricing(
  roomId: string, 
  checkIn: Date, 
  checkOut: Date, 
  adults: number, 
  children: GuestChild[], 
  options: { hasPets?: boolean; needsParking?: boolean } = {}
) {
  try {
    const room = HOTEL_POREC_ROOMS.find(r => r.id === roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const pricingEngine = HotelPricingEngine.getInstance();
    const input: PricingCalculationInput = {
      roomType: room.type,
      roomId: roomId,
      checkIn: checkIn,
      checkOut: checkOut,
      adults: adults,
      children: children,
      hasPets: options.hasPets || false,
      needsParking: options.needsParking || false,
      pricingTierId: '2026-standard',
      isRoom401: roomId === '401'
    };
    
    const result = pricingEngine.calculatePricing(input);
    
    // Convert to legacy format for sample data compatibility
    return {
      baseRate: result.baseRoomRate,
      numberOfNights: result.nights,
      seasonalPeriod: result.seasonalPeriod,
      subtotal: result.accommodationSubtotal,
      discounts: {
        children0to3: result.discounts.children0to3.amount,
        children3to7: result.discounts.children3to7.amount,
        children7to14: result.discounts.children7to14.amount
      },
      totalDiscounts: result.discounts.totalDiscounts,
      fees: {
        tourism: result.services.tourism.total,
        vat: result.totalVATAmount,
        pets: result.services.pets.total,
        parking: result.services.parking.total,
        shortStay: result.shortStaySupplement,
        additional: result.services.towelRental.total
      },
      totalFees: result.services.tourism.total + result.totalVATAmount + 
                result.services.pets.total + result.services.parking.total,
      grandTotal: result.grandTotal
    };
  } catch (error) {
    console.error('2026 Pricing calculation error:', error);
    // Return fallback pricing
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return {
      baseRate: 70,
      numberOfNights: nights,
      seasonalPeriod: 'B' as const,
      subtotal: 70 * nights * adults,
      discounts: { children0to3: 0, children3to7: 0, children7to14: 0 },
      totalDiscounts: 0,
      fees: { tourism: 6, vat: 20, pets: 0, parking: 0, shortStay: 0, additional: 0 },
      totalFees: 26,
      grandTotal: (70 * nights * adults) + 26
    };
  }
}

// Sample guest data with realistic European tourist patterns
export const SAMPLE_GUESTS: Guest[] = [
  // German tourists (major market for Croatian coast)
  {
    id: 'guest-1',
    firstName: 'Hans',
    lastName: 'Mueller',
    fullName: 'Hans Mueller',
    email: 'hans.mueller@email.de',
    phone: '+49-30-12345678',
    dateOfBirth: new Date('1970-05-15'),
    emergencyContactName: 'Ingrid Mueller',
    emergencyContactPhone: '+49-30-87654321',
    nationality: 'German',
    passportNumber: 'C01234567',
    preferredLanguage: 'de',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    isVip: true,
    vipLevel: 2,
    children: [],
    totalStays: 3,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2025-01-10')
  },
  {
    id: 'guest-2',  
    firstName: 'Max',
    lastName: 'Schmidt',
    fullName: 'Familie Schmidt',
    email: 'schmidt.familie@gmail.com',
    phone: '+49-89-98765432',
    dateOfBirth: new Date('1985-03-10'),
    emergencyContactName: 'Oma Schmidt',
    emergencyContactPhone: '+49-89-11111111',
    nationality: 'German',
    passportNumber: 'C02345678',
    preferredLanguage: 'de',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: true,
    isVip: false,
    vipLevel: 1,
    children: [
      createChild('Max Schmidt', 8),
      createChild('Emma Schmidt', 5)
    ],
    totalStays: 1,
    createdAt: new Date('2023-03-15'),
    updatedAt: new Date('2025-01-10')
  },
  
  // Italian tourists
  {
    id: 'guest-3',
    firstName: 'Marco',
    lastName: 'Rossi',
    fullName: 'Marco Rossi',
    email: 'marco.rossi@libero.it',
    phone: '+39-06-12345678',
    dateOfBirth: new Date('1978-09-20'),
    emergencyContactName: 'Maria Rossi',
    emergencyContactPhone: '+39-06-87654321',
    nationality: 'Italian',
    passportNumber: 'YA1234567',
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    isVip: false,
    vipLevel: 1,
    children: [
      createChild('Sofia Rossi', 12)
    ],
    totalStays: 2,
    createdAt: new Date('2023-05-20'),
    updatedAt: new Date('2025-01-08')
  },
  {
    id: 'guest-4',
    firstName: 'Emma',
    lastName: 'Johnson',
    fullName: 'Emma Johnson',
    email: 'emma.johnson@gmail.com',
    phone: '+44-161-2345678',
    dateOfBirth: new Date('1985-12-15'),
    emergencyContactName: 'Michael Johnson',
    emergencyContactPhone: '+44-161-8765432',
    nationality: 'British',
    passportNumber: '987654321',
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    isVip: false,
    vipLevel: 1,
    children: [],
    totalStays: 2,
    createdAt: new Date('2023-07-10'),
    updatedAt: new Date('2024-12-20')
  },
  
  // Austrian tourists
  {
    id: 'guest-5',
    firstName: 'Franz',
    lastName: 'Huber',
    fullName: 'Franz Huber',
    email: 'franz.huber@aon.at',
    phone: '+43-1-12345678',
    dateOfBirth: new Date('1975-04-25'),
    emergencyContactName: 'Elisabeth Huber',
    emergencyContactPhone: '+43-1-87654321',
    nationality: 'Austrian',
    passportNumber: 'P1234567',
    preferredLanguage: 'de',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    isVip: true,
    vipLevel: 3,
    children: [
      createChild('Lukas Huber', 15),
      createChild('Anna Huber', 3)
    ],
    totalStays: 4,
    createdAt: new Date('2022-08-10'),
    updatedAt: new Date('2025-01-05')
  },
  
  // British tourists
  {
    id: 'guest-6',
    firstName: 'James',
    lastName: 'Thompson',
    fullName: 'James Thompson',
    email: 'j.thompson@outlook.com',
    phone: '+44-20-12345678',
    dateOfBirth: new Date('1982-11-30'),
    emergencyContactName: 'Sarah Thompson',
    emergencyContactPhone: '+44-20-87654321',
    nationality: 'British',
    passportNumber: '123456789',
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    isVip: false,
    vipLevel: 1,
    children: [],
    totalStays: 1,
    createdAt: new Date('2024-10-15'),
    updatedAt: new Date('2024-10-15')
  },
  
  // Croatian domestic tourists
  {
    id: 'guest-7',
    firstName: 'Marko',
    lastName: 'Horvat',
    fullName: 'Marko Horvat',
    email: 'marko.horvat@t-com.hr',
    phone: '+385-1-12345678',
    dateOfBirth: new Date('1980-06-12'),
    emergencyContactName: 'Ana Horvat',
    emergencyContactPhone: '+385-1-87654321',
    nationality: 'Croatian',
    passportNumber: '123456789',
    preferredLanguage: 'hr',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: true,
    isVip: false,
    vipLevel: 1,
    children: [
      createChild('Petra Horvat', 10)
    ],
    totalStays: 2,
    createdAt: new Date('2023-09-20'),
    updatedAt: new Date('2024-11-15')
  },
  
  // Slovenian tourists (neighboring country)
  {
    id: 'guest-8',
    firstName: 'Matej',
    lastName: 'Novak',
    fullName: 'Matej Novak',
    email: 'matej.novak@siol.net',
    phone: '+386-1-12345678',
    dateOfBirth: new Date('1983-02-18'),
    emergencyContactName: 'Maja Novak',
    emergencyContactPhone: '+386-1-87654321',
    nationality: 'Slovenian',
    passportNumber: 'P0987654',
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    isVip: true,
    vipLevel: 2,
    children: [
      createChild('Nik Novak', 7),
      createChild('Lara Novak', 4)
    ],
    totalStays: 3,
    createdAt: new Date('2022-12-10'),
    updatedAt: new Date('2024-12-25')
  },
  
  // French tourists
  {
    id: 'guest-9',
    firstName: 'Pierre',
    lastName: 'Dubois',
    fullName: 'Pierre Dubois',
    email: 'pierre.dubois@orange.fr',
    phone: '+33-1-12345678',
    dateOfBirth: new Date('1979-08-05'),
    emergencyContactName: 'Marie Dubois',
    emergencyContactPhone: '+33-1-87654321',
    nationality: 'French',
    passportNumber: '12AB34567',
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    isVip: false,
    vipLevel: 1,
    children: [],
    totalStays: 1,
    createdAt: new Date('2024-11-20'),
    updatedAt: new Date('2024-11-20')
  },
  
  // Dutch tourists
  {
    id: 'guest-10',
    firstName: 'Jan',
    lastName: 'van der Berg',
    fullName: 'Jan van der Berg',
    email: 'jan.vandenberg@ziggo.nl',
    phone: '+31-20-12345678',
    dateOfBirth: new Date('1976-01-22'),
    emergencyContactName: 'Inge van der Berg',
    emergencyContactPhone: '+31-20-87654321',
    nationality: 'Dutch',
    passportNumber: 'BX1234567',
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    specialNeeds: '',
    hasPets: false,
    isVip: false,
    vipLevel: 1,
    children: [
      createChild('Emma van der Berg', 13),
      createChild('Tim van der Berg', 9)
    ],
    totalStays: 2,
    createdAt: new Date('2023-06-15'),
    updatedAt: new Date('2024-08-20')
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

// Generate demo reservations for investor presentation (80% occupancy for 3 weeks)
export function generateDemoReservations(): Reservation[] {
  const reservations: Reservation[] = [];
  const today = new Date();
  
  // Get all rooms for generating realistic occupancy
  const allRooms = HOTEL_POREC_ROOMS;
  const targetOccupancy = 0.8; // 80% occupancy
  
  // Helper function to get random guest
  function getRandomGuest() {
    return SAMPLE_GUESTS[Math.floor(Math.random() * SAMPLE_GUESTS.length)];
  }
  
  // Helper function to get random booking source
  function getRandomBookingSource(): 'booking.com' | 'direct' | 'other' {
    const sources = ['booking.com', 'direct', 'other'];
    return sources[Math.floor(Math.random() * sources.length)] as any;
  }
  
  // Helper function to get random status with realistic distribution
  function getRandomStatus(): ReservationStatus {
    const rand = Math.random();
    if (rand < 0.7) return 'confirmed';
    if (rand < 0.85) return 'checked-in';
    if (rand < 0.92) return 'checked-out';
    if (rand < 0.96) return 'incomplete-payment';
    return 'unallocated';
  }
  
  // Generate reservations for the next 3 weeks
  for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
    const weekStart = addWeeks(today, weekOffset);
    
    // Shuffle rooms for this week
    const shuffledRooms = [...allRooms].sort(() => Math.random() - 0.5);
    const roomsToFill = Math.floor(shuffledRooms.length * targetOccupancy);
    
    for (let i = 0; i < roomsToFill; i++) {
      const room = shuffledRooms[i];
      const guest = getRandomGuest();
      
      // Random stay duration (1-7 days, with bias toward 2-4 days)
      const stayDuration = Math.random() < 0.6 
        ? 2 + Math.floor(Math.random() * 3) // 2-4 days (60% chance)
        : 1 + Math.floor(Math.random() * 7); // 1-7 days (40% chance)
      
      // Random start day within the week (0-6)
      const startDayOffset = Math.floor(Math.random() * 7);
      const checkIn = addDays(weekStart, startDayOffset);
      const checkOut = addDays(checkIn, stayDuration);
      
      // Determine status based on dates
      let status: ReservationStatus;
      if (checkOut < today) {
        status = 'checked-out';
      } else if (checkIn <= today && checkOut > today) {
        status = Math.random() < 0.8 ? 'checked-in' : 'confirmed';
      } else {
        status = getRandomStatus();
      }
      
      // Generate adults/children counts
      const maxOccupancy = room.maxOccupancy;
      const adults = Math.min(1 + Math.floor(Math.random() * 2), maxOccupancy); // 1-2 adults, max room capacity
      const remainingCapacity = maxOccupancy - adults;
      const childrenCount = remainingCapacity > 0 && Math.random() < 0.3 
        ? Math.floor(Math.random() * Math.min(2, remainingCapacity + 1)) // 0-2 children
        : 0;
      
      // Generate children array
      const children: GuestChild[] = [];
      for (let c = 0; c < childrenCount; c++) {
        children.push(createChild(`Child ${c + 1}`, 3 + Math.floor(Math.random() * 12))); // Age 3-14
      }
      
      // Special requests variety
      const specialRequests = [
        'Late check-in requested',
        'Early check-out needed',
        'Quiet room preferred',
        'High floor preference',
        'Sea view if available',
        'Extra towels needed',
        'Business trip - invoice required',
        'Honeymoon - special occasion',
        'Family vacation',
        'Anniversary celebration',
        ''
      ];
      const randomRequest = specialRequests[Math.floor(Math.random() * specialRequests.length)];
      
      // Random additional options
      const hasPets = guest.hasPets && Math.random() < 0.3;
      const needsParking = Math.random() < 0.4;
      const additionalCharges = Math.random() < 0.2 ? Math.floor(Math.random() * 50) : 0;
      
      try {
        const reservation = createReservation(
          guest.id,
          room.id,
          checkIn,
          checkOut,
          adults,
          children,
          status,
          getRandomBookingSource(),
          randomRequest,
          { hasPets, needsParking, additionalCharges }
        );
        reservations.push(reservation);
      } catch (error) {
        console.warn(`Failed to create reservation for room ${room.number}:`, error);
      }
    }
  }
  
  // Add some specific showcase reservations for the demo
  const showcaseReservations = [
    // SAME-DAY TURNOVER DEMO: Room 301 - Guest checking out today at 11 AM
    createReservation(
      'guest-4', // Emma Johnson
      'room-301', 
      subDays(today, 2), // Checked in 2 days ago
      today,             // Checking out TODAY at 11 AM
      1,
      [],
      'checked-in',
      'booking.com',
      'Early check-out requested - 10:30 AM'
    ),
    
    // SAME-DAY TURNOVER DEMO: Room 301 - New guest checking in TODAY at 3 PM
    createReservation(
      'guest-9', // Pierre Dubois (French guest)
      'room-301',
      today,             // Checking in TODAY at 3 PM
      addDays(today, 3), // Checking out in 3 days
      1,
      [],
      'confirmed',
      'direct',
      'Same-day check-in after turnover - requested late afternoon arrival'
    ),
    
    // VIP guest in premium suite
    createReservation(
      'guest-1', // Hans Mueller (VIP)
      'room-401', // Premium rooftop apartment
      addDays(today, 1),
      addDays(today, 5),
      2,
      [],
      'confirmed',
      'direct',
      'VIP guest - champagne and sea view preferred',
      { needsParking: true, additionalCharges: 150 }
    ),
    
    // Family with pets currently checked in
    createReservation(
      'guest-2', // Familie Schmidt with children
      'room-205', // Family room on floor 2
      subDays(today, 2),
      addDays(today, 3),
      2,
      SAMPLE_GUESTS.find(g => g.id === 'guest-2')?.children || [],
      'checked-in',
      'booking.com',
      'Family with small children and dog',
      { hasPets: true, needsParking: true }
    ),
    
    // High-value business booking
    createReservation(
      'guest-6', // James Thompson
      'room-314',
      addDays(today, 7),
      addDays(today, 12),
      1,
      [],
      'confirmed',
      'direct',
      'Business conference - daily housekeeping required',
      { needsParking: true, additionalCharges: 200 }
    )
  ];
  
  // Add showcase reservations, replacing any conflicting ones
  showcaseReservations.forEach(showcase => {
    // Remove any existing reservation for the same room and overlapping dates
    const index = reservations.findIndex(r => 
      r.roomId === showcase.roomId && 
      (r.checkIn < showcase.checkOut && r.checkOut > showcase.checkIn)
    );
    if (index >= 0) {
      reservations.splice(index, 1);
    }
    reservations.push(showcase);
  });
  
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
  // Normalize check-in/check-out times for half-day positioning
  const normalizedCheckIn = new Date(checkIn);
  normalizedCheckIn.setHours(15, 0, 0, 0); // 3:00 PM check-in
  
  const normalizedCheckOut = new Date(checkOut);
  normalizedCheckOut.setHours(11, 0, 0, 0); // 11:00 AM check-out
  // Calculate pricing using 2026 engine
  let pricing;
  try {
    pricing = calculate2026Pricing(roomId, normalizedCheckIn, normalizedCheckOut, adults, children, options);
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
    checkIn: normalizedCheckIn,
    checkOut: normalizedCheckOut,
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
    subtotal: pricing.subtotal || 0,
    childrenDiscounts: pricing.totalDiscounts || 0,
    tourismTax: pricing.fees.tourism || 0,
    vatAmount: pricing.fees.vat || 0,
    petFee: pricing.fees.pets || 0,
    parkingFee: pricing.fees.parking || 0,
    shortStaySuplement: pricing.fees.shortStay || 0,
    additionalCharges: pricing.fees.additional || 0,
    roomServiceItems: [],
    totalAmount: pricing.grandTotal || 0,
    
    // Metadata
    bookingDate: subDays(normalizedCheckIn, Math.floor(Math.random() * 30) + 1), // Booked 1-30 days in advance
    lastModified: new Date(),
    notes: ''
  };
}

// Export generated sample reservations
export const SAMPLE_RESERVATIONS: Reservation[] = generateDemoReservations();

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
    const nationality = guest.nationality || 'Unknown';
    acc[nationality] = (acc[nationality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
  statusBreakdown: SAMPLE_RESERVATIONS.reduce((acc, reservation) => {
    acc[reservation.status] = (acc[reservation.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
};