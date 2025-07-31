// Hotel Porec - Pricing Calculator with Croatian Tax Compliance
import { 
  SeasonalPeriod, 
  PricingCalculation, 
  GuestChild, 
  Room,
  HOTEL_CONSTANTS 
} from './types';
import { HOTEL_POREC_ROOMS, SEASONAL_PERIODS } from './hotelData';
import { format, isWithinInterval, parseISO } from 'date-fns';

// Determine seasonal period for a given date
export function getSeasonalPeriod(date: Date): SeasonalPeriod {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  for (const periodDef of SEASONAL_PERIODS) {
    // Handle periods with multiple date ranges (B and C)
    if (periodDef.periods) {
      for (const range of periodDef.periods) {
        if (isWithinInterval(date, {
          start: parseISO(range.startDate),
          end: parseISO(range.endDate)
        })) {
          return periodDef.period;
        }
      }
    } else {
      // Handle single date range periods (A and D)
      if (periodDef.endDate && isWithinInterval(date, {
        start: parseISO(periodDef.startDate),
        end: parseISO(periodDef.endDate)
      })) {
        return periodDef.period;
      }
    }
  }
  
  // Default to Period A if no match (shouldn't happen with proper data)
  return 'A';
}

// Get tourism tax rate for a specific date
export function getTourismTaxRate(date: Date): number {
  const month = date.getMonth() + 1; // 1-12
  
  // Periods IV, V, VI, VII, VIII, IX (April-September): €1.50
  if (month >= 4 && month <= 9) {
    return HOTEL_CONSTANTS.TOURISM_TAX_HIGH;
  }
  
  // Periods I, II, III, X, XI, XII (October-March): €1.10
  return HOTEL_CONSTANTS.TOURISM_TAX_LOW;
}

// Calculate children discounts based on age
export function calculateChildrenDiscounts(
  baseRoomRate: number,
  numberOfNights: number,
  children: GuestChild[]
): {
  children0to3: number;
  children3to7: number;
  children7to14: number;
  totalDiscount: number;
} {
  let children0to3 = 0;
  let children3to7 = 0;
  let children7to14 = 0;
  
  const nightlyRate = baseRoomRate;
  
  for (const child of children) {
    if (child.age <= HOTEL_CONSTANTS.CHILDREN_FREE_AGE) {
      // Children 0-3: Free (no charge, so no discount calculation needed)
      children0to3 += 0;
    } else if (child.age <= HOTEL_CONSTANTS.CHILDREN_HALF_PRICE_AGE) {
      // Children 3-7: 50% discount
      children3to7 += (nightlyRate * 0.5 * numberOfNights);
    } else if (child.age <= HOTEL_CONSTANTS.CHILDREN_DISCOUNT_AGE) {
      // Children 7-14: 20% discount
      children7to14 += (nightlyRate * 0.2 * numberOfNights);
    }
    // Children 14+: Adult rate (no discount)
  }
  
  const totalDiscount = children0to3 + children3to7 + children7to14;
  
  return {
    children0to3,
    children3to7,
    children7to14,
    totalDiscount
  };
}

// Main pricing calculation function
export function calculatePricing(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  adults: number,
  children: GuestChild[] = [],
  options: {
    hasPets?: boolean;
    needsParking?: boolean;
    additionalCharges?: number;
  } = {}
): PricingCalculation {
  // Find the room
  const room = HOTEL_POREC_ROOMS.find(r => r.id === roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }
  
  // Calculate number of nights
  const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  if (numberOfNights <= 0) {
    throw new Error('Check-out date must be after check-in date');
  }
  
  // Determine seasonal period (use check-in date)
  const seasonalPeriod = getSeasonalPeriod(checkIn);
  const baseRate = room.seasonalRates[seasonalPeriod];
  const subtotal = baseRate * numberOfNights;
  
  // Calculate children discounts
  const childrenDiscounts = calculateChildrenDiscounts(baseRate, numberOfNights, children);
  
  // Calculate tourism tax
  const tourismTaxRate = getTourismTaxRate(checkIn);
  const totalGuests = adults + children.length;
  let tourismTax = 0;
  
  // Tourism tax calculation with age-based rates
  tourismTax += adults * tourismTaxRate * numberOfNights; // Full rate for adults
  
  for (const child of children) {
    if (child.age <= 12) {
      tourismTax += 0; // Children 0-12: Free
    } else if (child.age <= 18) {
      tourismTax += (tourismTaxRate * 0.5) * numberOfNights; // Children 12-18: 50%
    } else {
      tourismTax += tourismTaxRate * numberOfNights; // 18+: Full rate
    }
  }
  
  // Calculate additional fees
  const petFee = options.hasPets ? HOTEL_CONSTANTS.PET_FEE : 0;
  const parkingFee = options.needsParking ? (HOTEL_CONSTANTS.PARKING_FEE * numberOfNights) : 0;
  const shortStayFee = numberOfNights < HOTEL_CONSTANTS.MIN_NIGHTS_NO_SUPPLEMENT 
    ? (subtotal * HOTEL_CONSTANTS.SHORT_STAY_SUPPLEMENT) : 0;
  const additionalCharges = options.additionalCharges || 0;
  
  // Calculate subtotal before VAT
  const subtotalBeforeVAT = subtotal - childrenDiscounts.totalDiscount + tourismTax + petFee + parkingFee + shortStayFee + additionalCharges;
  
  // Calculate VAT (25% on accommodation, not on tourism tax)
  const vatableAmount = subtotal - childrenDiscounts.totalDiscount + petFee + parkingFee + shortStayFee + additionalCharges;
  const vatAmount = vatableAmount * HOTEL_CONSTANTS.VAT_RATE;
  
  // Total fees
  const totalFees = tourismTax + petFee + parkingFee + shortStayFee + additionalCharges + vatAmount;
  
  // Final total
  const total = subtotal - childrenDiscounts.totalDiscount + totalFees;
  
  return {
    baseRate,
    numberOfNights,
    seasonalPeriod,
    subtotal,
    discounts: {
      ...childrenDiscounts,
      longStay: 0 // Future feature - not implemented yet
    },
    totalDiscounts: childrenDiscounts.totalDiscount,
    fees: {
      tourism: tourismTax,
      vat: vatAmount,
      pets: petFee,
      parking: parkingFee,
      shortStay: shortStayFee,
      additional: additionalCharges
    },
    totalFees,
    total
  };
}

// Utility function to format pricing for display
export function formatPricingBreakdown(pricing: PricingCalculation): {
  summary: string;
  details: Array<{ label: string; amount: number; isDiscount?: boolean }>;
} {
  const details: Array<{ label: string; amount: number; isDiscount?: boolean }> = [
    { label: `Room rate (${pricing.numberOfNights} nights)`, amount: pricing.subtotal },
  ];
  
  // Add discounts
  if (pricing.discounts.children3to7 > 0) {
    details.push({ label: 'Children 3-7 discount (50%)', amount: -pricing.discounts.children3to7, isDiscount: true });
  }
  if (pricing.discounts.children7to14 > 0) {
    details.push({ label: 'Children 7-14 discount (20%)', amount: -pricing.discounts.children7to14, isDiscount: true });
  }
  
  // Add fees
  if (pricing.fees.tourism > 0) {
    details.push({ label: 'Tourism tax', amount: pricing.fees.tourism });
  }
  if (pricing.fees.pets > 0) {
    details.push({ label: 'Pet fee', amount: pricing.fees.pets });
  }
  if (pricing.fees.parking > 0) {
    details.push({ label: 'Parking fee', amount: pricing.fees.parking });
  }
  if (pricing.fees.shortStay > 0) {
    details.push({ label: 'Short stay supplement (+20%)', amount: pricing.fees.shortStay });
  }
  if (pricing.fees.additional > 0) {
    details.push({ label: 'Additional charges', amount: pricing.fees.additional });
  }
  
  details.push({ label: 'VAT (25%)', amount: pricing.fees.vat });
  
  const summary = `€${pricing.total.toFixed(2)} total (${pricing.numberOfNights} nights, Period ${pricing.seasonalPeriod})`;
  
  return { summary, details };
}

// Quick pricing lookup for room types
export function getQuickPricing(roomType: string, period: SeasonalPeriod): number {
  const room = HOTEL_POREC_ROOMS.find(r => r.type === roomType);
  return room ? room.seasonalRates[period] : 0;
}

// Seasonal period info for UI
export function getSeasonalPeriodInfo(period: SeasonalPeriod) {
  return SEASONAL_PERIODS.find(p => p.period === period);
}