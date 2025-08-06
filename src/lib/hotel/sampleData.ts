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
    name: 'Emma Johnson',
    email: 'emma.johnson@gmail.com',
    phone: '+44-161-2345678',
    emergencyContact: 'Michael Johnson +44-161-8765432',
    nationality: 'British',
    preferredLanguage: 'en',
    hasPets: false,
    children: [],
    totalStays: 2,
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
  // Calculate pricing automatically
  let pricing;
  try {
    pricing = calculatePricing(roomId, normalizedCheckIn, normalizedCheckOut, adults, children, options);
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
    acc[guest.nationality] = (acc[guest.nationality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
  statusBreakdown: SAMPLE_RESERVATIONS.reduce((acc, reservation) => {
    acc[reservation.status] = (acc[reservation.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
};