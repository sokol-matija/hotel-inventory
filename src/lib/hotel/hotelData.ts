// Hotel Porec - Real Business Information and Room Configuration
import { Hotel, Room, RoomType, SeasonalPeriodDefinition } from './types';

// Hotel Porec Official Information
export const HOTEL_POREC: Hotel = {
  id: 'hotel-porec',
  name: 'Hotel Porec',
  address: '52440 Porec, Croatia, R Konoba 1',
  phone: '+385(0)52/451 611',
  fax: '+385(0)52/433 462',
  email: 'hotelporec@pu.t-com.hr',
  website: 'www.hotelporec.com',
  taxId: '87246357068' // Croatian OIB
};

// 2025 Seasonal Periods (Real Hotel Porec Pricing)
export const SEASONAL_PERIODS: SeasonalPeriodDefinition[] = [
  {
    period: 'A',
    name: 'Winter/Early Spring',
    startDate: '2025-01-02',
    endDate: '2025-04-16',
    tourismTaxRate: 1.10
  },
  {
    period: 'B',
    name: 'Spring/Late Fall',
    startDate: '2025-04-17',
    periods: [
      { startDate: '2025-04-17', endDate: '2025-05-28' },
      { startDate: '2025-09-26', endDate: '2025-10-25' }
    ],
    tourismTaxRate: 1.50
  },
  {
    period: 'C',
    name: 'Early Summer/Early Fall',
    startDate: '2025-05-26',
    periods: [
      { startDate: '2025-05-26', endDate: '2025-07-30' },
      { startDate: '2025-08-31', endDate: '2025-09-25' }
    ],
    tourismTaxRate: 1.50
  },
  {
    period: 'D',
    name: 'Peak Summer',
    startDate: '2025-07-15',
    endDate: '2025-08-31',
    tourismTaxRate: 1.50
  }
];

// Room type definitions with Croatian names
export const ROOM_TYPES = {
  'big-double': {
    nameCroatian: 'Velika dvokrevetna soba',
    nameEnglish: 'Big Double Room',
    maxOccupancy: 2,
    rates: { A: 56, B: 70, C: 87, D: 106 },
    amenities: ['Private Bathroom', 'Air Conditioning', 'TV', 'WiFi', 'Mini Fridge']
  },
  'big-single': {
    nameCroatian: 'Velika jednokrevetna soba',
    nameEnglish: 'Big Single Room',
    maxOccupancy: 1,
    rates: { A: 83, B: 108, C: 139, D: 169 },
    amenities: ['Private Bathroom', 'Air Conditioning', 'TV', 'WiFi', 'Mini Fridge', 'Work Desk']
  },
  'double': {
    nameCroatian: 'Dvokrevetna soba',
    nameEnglish: 'Double Room',
    maxOccupancy: 2,
    rates: { A: 47, B: 57, C: 69, D: 90 },
    amenities: ['Private Bathroom', 'Air Conditioning', 'TV', 'WiFi']
  },
  'triple': {
    nameCroatian: 'Trokrevetna soba',
    nameEnglish: 'Triple Room',
    maxOccupancy: 3,
    rates: { A: 47, B: 57, C: 69, D: 90 },
    amenities: ['Private Bathroom', 'Air Conditioning', 'TV', 'WiFi']
  },
  'single': {
    nameCroatian: 'Jednokrevetna soba',
    nameEnglish: 'Single Room',
    maxOccupancy: 1,
    rates: { A: 70, B: 88, C: 110, D: 144 },
    amenities: ['Private Bathroom', 'Air Conditioning', 'TV', 'WiFi']
  },
  'family': {
    nameCroatian: 'Obiteljska soba',
    nameEnglish: 'Family Room',
    maxOccupancy: 4,
    rates: { A: 47, B: 57, C: 69, D: 90 },
    amenities: ['Private Bathroom', 'Air Conditioning', 'TV', 'WiFi', 'Extra Space']
  },
  'apartment': {
    nameCroatian: 'Apartman',
    nameEnglish: 'Apartment',
    maxOccupancy: 3,
    rates: { A: 47, B: 57, C: 69, D: 90 },
    amenities: ['Private Bathroom', 'Air Conditioning', 'TV', 'WiFi', 'Kitchenette']
  },
  'rooftop-apartment': {
    nameCroatian: '401 ROOFTOP APARTMAN',
    nameEnglish: '401 Rooftop Apartment',
    maxOccupancy: 4,
    rates: { A: 250, B: 300, C: 360, D: 450 },
    amenities: ['Private Bathroom', 'Air Conditioning', 'TV', 'WiFi', 'Kitchenette', 'Balcony', 'Sea View', 'Premium Furnishing']
  }
} as const;

// Generate Hotel Porec room configuration (55 rooms total: 18×3 floors + 1 rooftop)
function generateHotelRooms(): Room[] {
  const rooms: Room[] = [];
  
  // Room type pattern for each floor (18 rooms per floor):
  // Room 1: Family Room
  // Rooms 2-5: Double Rooms
  // Rooms 6-7: Triple Rooms
  // Rooms 8-14: Double Rooms
  // Rooms 15-16: Triple Rooms
  // Room 17: Double Room
  // Room 18: Single Room
  const floorPattern: RoomType[] = [
    'family',    // Room 1
    'double',    // Room 2
    'double',    // Room 3
    'double',    // Room 4
    'double',    // Room 5
    'triple',    // Room 6
    'triple',    // Room 7
    'double',    // Room 8
    'double',    // Room 9
    'double',    // Room 10
    'double',    // Room 11
    'double',    // Room 12
    'double',    // Room 13
    'double',    // Room 14
    'triple',    // Room 15
    'triple',    // Room 16
    'double',    // Room 17
    'single'     // Room 18
  ];
  
  // Floors 1, 2, 3: Each has 18 rooms following the pattern
  for (let floor = 1; floor <= 3; floor++) {
    floorPattern.forEach((type, index) => {
      const roomNumber = `${floor}${(index + 1).toString().padStart(2, '0')}`;
      rooms.push(createRoom(roomNumber, floor, type));
    });
  }
  
  // Floor 4: Room 401 - Premium Rooftop Apartment (1 room)
  rooms.push(createRoom('401', 4, 'rooftop-apartment', true));
  
  return rooms;
}

function createRoom(
  number: string, 
  floor: number, 
  type: RoomType, 
  isPremium: boolean = false
): Room {
  const roomTypeInfo = ROOM_TYPES[type];
  
  return {
    id: `room-${number}`,
    number,
    floor,
    type,
    nameCroatian: roomTypeInfo.nameCroatian,
    nameEnglish: roomTypeInfo.nameEnglish,
    seasonalRates: roomTypeInfo.rates,
    maxOccupancy: roomTypeInfo.maxOccupancy,
    isPremium,
    amenities: [...roomTypeInfo.amenities]
  };
}

// Export the complete room configuration
export const HOTEL_POREC_ROOMS: Room[] = generateHotelRooms();

// Utility functions for room management
export function getRoomsByFloor(floor: number): Room[] {
  return HOTEL_POREC_ROOMS.filter(room => room.floor === floor);
}

export function getRoomByNumber(roomNumber: string): Room | undefined {
  return HOTEL_POREC_ROOMS.find(room => room.number === roomNumber);
}

export function getRoomsByType(type: RoomType): Room[] {
  return HOTEL_POREC_ROOMS.filter(room => room.type === type);
}

export function getPremiumRooms(): Room[] {
  return HOTEL_POREC_ROOMS.filter(room => room.isPremium);
}

// Room statistics
export const ROOM_STATISTICS = {
  totalRooms: HOTEL_POREC_ROOMS.length,
  floorBreakdown: {
    floor1: getRoomsByFloor(1).length,
    floor2: getRoomsByFloor(2).length,
    floor3: getRoomsByFloor(3).length,
    floor4: getRoomsByFloor(4).length
  },
  typeBreakdown: {
    double: getRoomsByType('double').length,
    triple: getRoomsByType('triple').length,
    single: getRoomsByType('single').length,
    family: getRoomsByType('family').length,
    apartment: getRoomsByType('apartment').length,
    bigDouble: getRoomsByType('big-double').length,
    bigSingle: getRoomsByType('big-single').length,
    rooftopApartment: getRoomsByType('rooftop-apartment').length
  },
  premiumRooms: getPremiumRooms().length
};