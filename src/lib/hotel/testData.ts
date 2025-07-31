// Hotel Data Structure Test
// Quick validation of Hotel Porec room configuration and pricing

import { HOTEL_POREC_ROOMS, ROOM_STATISTICS, HOTEL_POREC } from './hotelData';
import { calculatePricing, getSeasonalPeriod } from './pricingCalculator';
import { SAMPLE_GUESTS, SAMPLE_RESERVATIONS, SAMPLE_DATA_STATS } from './sampleData';

// Test Hotel Porec room configuration
export function testHotelData(): {
  success: boolean;
  results: Record<string, any>;
  errors: string[];
} {
  const results: Record<string, any> = {};
  const errors: string[] = [];

  try {
    // Test 1: Verify 46 rooms total
    results.totalRooms = HOTEL_POREC_ROOMS.length;
    if (HOTEL_POREC_ROOMS.length !== 46) {
      errors.push(`Expected 46 rooms, got ${HOTEL_POREC_ROOMS.length}`);
    }

    // Test 2: Verify floor distribution
    results.floorBreakdown = ROOM_STATISTICS.floorBreakdown;
    if (ROOM_STATISTICS.floorBreakdown.floor1 !== 15) {
      errors.push(`Floor 1 should have 15 rooms, got ${ROOM_STATISTICS.floorBreakdown.floor1}`);
    }
    if (ROOM_STATISTICS.floorBreakdown.floor4 !== 1) {
      errors.push(`Floor 4 should have 1 room, got ${ROOM_STATISTICS.floorBreakdown.floor4}`);
    }

    // Test 3: Verify premium rooftop apartment
    const rooftopApartment = HOTEL_POREC_ROOMS.find(room => room.number === '401');
    results.rooftopApartment = rooftopApartment ? {
      exists: true,
      isPremium: rooftopApartment.isPremium,
      type: rooftopApartment.type,
      maxOccupancy: rooftopApartment.maxOccupancy
    } : { exists: false };

    if (!rooftopApartment || !rooftopApartment.isPremium) {
      errors.push('Room 401 should be premium rooftop apartment');
    }

    // Test 4: Test pricing calculation
    const testDate = new Date('2025-07-20'); // Peak summer (Period D)
    const testRoomId = 'room-201'; // Standard double room
    const testPricing = calculatePricing(testRoomId, testDate, new Date('2025-07-23'), 2, []);
    
    results.pricingTest = {
      seasonalPeriod: testPricing.seasonalPeriod,
      baseRate: testPricing.baseRate,
      total: testPricing.total,
      vatAmount: testPricing.fees.vat,
      tourismTax: testPricing.fees.tourism
    };

    if (testPricing.seasonalPeriod !== 'D') {
      errors.push(`July 20 should be Period D, got ${testPricing.seasonalPeriod}`);
    }

    // Test 5: Hotel information
    results.hotelInfo = {
      name: HOTEL_POREC.name,
      taxId: HOTEL_POREC.taxId,
      address: HOTEL_POREC.address
    };

    // Test 6: Sample data generation
    results.sampleData = {
      totalGuests: SAMPLE_GUESTS.length,
      totalReservations: SAMPLE_RESERVATIONS.length,
      vipGuests: SAMPLE_DATA_STATS.vipGuests,
      nationalityBreakdown: SAMPLE_DATA_STATS.nationalityBreakdown
    };

    if (SAMPLE_GUESTS.length === 0) {
      errors.push('No sample guests generated');
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };

  } catch (error) {
    errors.push(`Test execution failed: ${error}`);
    return { success: false, results, errors };
  }
}

// Quick test seasonal period calculation
export function testSeasonalPeriods(): Record<string, string> {
  return {
    'January 15': getSeasonalPeriod(new Date('2025-01-15')), // Should be A
    'April 20': getSeasonalPeriod(new Date('2025-04-20')), // Should be B
    'June 15': getSeasonalPeriod(new Date('2025-06-15')), // Should be C
    'July 20': getSeasonalPeriod(new Date('2025-07-20')), // Should be D
    'August 15': getSeasonalPeriod(new Date('2025-08-15')), // Should be D
    'September 15': getSeasonalPeriod(new Date('2025-09-15')), // Should be C
    'October 15': getSeasonalPeriod(new Date('2025-10-15')), // Should be B
  };
}

// Run quick validation
export const HOTEL_DATA_VALIDATION = testHotelData();