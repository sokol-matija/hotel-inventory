// 2026 Pricing Data for Hotel Porec
// Complete pricing structure with actual rates

export interface PricingData2026 {
  name: string;
  description: string;
  seasonalRates: {
    A: number; // Winter/Early Spring multiplier
    B: number; // Spring/Late Fall multiplier  
    C: number; // Early Summer/Early Fall multiplier
    D: number; // Peak Summer multiplier
  };
  isDefault: boolean;
  validFrom: Date;
  validTo?: Date;
}

// Seasonal Period Definitions for 2026
export const SEASONAL_PERIODS_2026 = {
  A: {
    name: "Winter/Early Spring",
    periods: [
      { start: "01-04", end: "04-01" }, // 04.01 - 01.04
      { start: "10-25", end: "12-29" }  // 25.10 - 29.12
    ],
    tourismTaxRate: 1.10 // €1.10 for months 1,2,3,10,11,12
  },
  B: {
    name: "Spring/Late Fall/New Year",
    periods: [
      { start: "04-02", end: "05-21" }, // 02.04 - 21.05
      { start: "09-27", end: "10-24" }, // 27.09 - 24.10
      { start: "12-30", end: "01-02" }  // 30.12 - 02.01
    ],
    tourismTaxRate: 1.10 // €1.10 for months transitioning
  },
  C: {
    name: "Early Summer/Early Fall",
    periods: [
      { start: "05-22", end: "07-09" }, // 22.05 - 09.07
      { start: "09-01", end: "09-26" }  // 01.09 - 26.09
    ],
    tourismTaxRate: 1.60 // €1.60 for summer months
  },
  D: {
    name: "Peak Summer",
    periods: [
      { start: "07-10", end: "08-31" }  // 10.07 - 31.08
    ],
    tourismTaxRate: 1.60 // €1.60 for peak summer
  }
};

// Actual 2026 Room Rates (per person, 13% VAT included)
export const ROOM_RATES_2026 = {
  "big-double": { A: 56, B: 70, C: 87, D: 106 },    // Superior Big Double
  "big-single": { A: 83, B: 108, C: 139, D: 169 },  // Superior Big Single
  "double": { A: 47, B: 57, C: 69, D: 90 },         // Regular Double
  "triple": { A: 47, B: 57, C: 69, D: 90 },         // Regular Triple
  "single": { A: 70, B: 88, C: 110, D: 144 },       // Regular Single
  "family": { A: 47, B: 57, C: 69, D: 90 },         // Regular Family
  "apartment": { A: 47, B: 57, C: 69, D: 90 },      // Triple Apartment (min 3 people)
  "rooftop-apartment": { A: 250, B: 300, C: 360, D: 450 } // Room 401 (per apartment, max 2 people)
};

// Standard Pricing Tiers
export const PRICING_TIERS_2026: PricingData2026[] = [
  {
    name: "2026 Standard",
    description: "Standard pricing for 2026 season - same as 2025 for now",
    seasonalRates: {
      A: 1.0, // Base multiplier - uses actual room rates above
      B: 1.0,
      C: 1.0,
      D: 1.0
    },
    isDefault: true,
    validFrom: new Date('2026-01-01'),
    validTo: new Date('2026-12-31')
  },
  {
    name: "2025 Standard", 
    description: "Current 2025 pricing (same rates as 2026)",
    seasonalRates: {
      A: 1.0, // Same rates as 2026 for now
      B: 1.0,
      C: 1.0, 
      D: 1.0
    },
    isDefault: false,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2025-12-31')
  }
];

// Template for agency pricing - you can add specific agencies
export const AGENCY_PRICING_TEMPLATES: PricingData2026[] = [
  {
    name: "TUI Agency Rates",
    description: "Special rates for TUI tour operator",
    seasonalRates: {
      A: 0.85, // 15% discount example
      B: 0.90, // 10% discount
      C: 0.95, // 5% discount
      D: 0.90  // 10% discount in peak season
    },
    isDefault: false,
    validFrom: new Date('2026-01-01'),
    validTo: new Date('2026-12-31')
  },
  {
    name: "Local Travel Agency",
    description: "Rates for Croatian travel agencies",
    seasonalRates: {
      A: 0.80, // 20% discount example
      B: 0.85, // 15% discount
      C: 0.90, // 10% discount
      D: 0.85  // 15% discount
    },
    isDefault: false,
    validFrom: new Date('2026-01-01'),
    validTo: new Date('2026-12-31')
  }
];

// Helper function to create pricing tiers from room base rates
export function createPricingTierFromRoomRates(
  name: string,
  description: string,
  baseRoomRates: { A: number; B: number; C: number; D: number; },
  multipliers: { A: number; B: number; C: number; D: number; }
) {
  return {
    name,
    description,
    seasonalRates: {
      A: multipliers.A, // Will be applied to room's base A rate
      B: multipliers.B,
      C: multipliers.C,
      D: multipliers.D
    },
    isDefault: false,
    validFrom: new Date('2026-01-01'),
    validTo: new Date('2026-12-31')
  };
}

// Sample company data for R1 billing
export const SAMPLE_COMPANIES = [
  {
    name: "TechCorp d.o.o.",
    oib: "12345678901",
    address: "Ul. Hrvatskih velikana 1",
    city: "Zagreb",
    postalCode: "10000",
    country: "Croatia",
    contactPerson: "Marko Marković",
    email: "booking@techcorp.hr",
    phone: "+385 1 234 5678",
    pricingTierId: "tech-corp-rates", // Custom pricing
    roomAllocationGuarantee: 5, // 5 rooms guaranteed
    isActive: true,
    notes: "Premium corporate client"
  },
  {
    name: "DER Touristik Croatia",
    oib: "98765432109", 
    address: "Savska cesta 41",
    city: "Zagreb",
    postalCode: "10000",
    country: "Croatia",
    contactPerson: "Ana Anić",
    email: "reservations@der-touristik.hr",
    phone: "+385 1 987 6543",
    pricingTierId: "der-touristik-rates",
    roomAllocationGuarantee: 10, // 10 rooms guaranteed
    isActive: true,
    notes: "Major tour operator partner"
  }
];

// Default fiscal registers setup
export const DEFAULT_FISCAL_REGISTERS = [
  {
    name: "Register 1",
    registerNumber: 1,
    businessSpaceCode: "POSL1",
    operatorOib: "12345678901", // Replace with actual operator OIB
    isActive: true,
    isDefault: true,
    lastInvoiceNumber: 0,
    lastSequenceNumber: 0
  },
  {
    name: "Register 2", 
    registerNumber: 2,
    businessSpaceCode: "POSL1",
    operatorOib: "12345678901",
    isActive: true,
    isDefault: false,
    lastInvoiceNumber: 0,
    lastSequenceNumber: 0
  },
  {
    name: "Register 3",
    registerNumber: 3,
    businessSpaceCode: "POSL1", 
    operatorOib: "12345678901",
    isActive: true,
    isDefault: false,
    lastInvoiceNumber: 0,
    lastSequenceNumber: 0
  },
  {
    name: "Register 4",
    registerNumber: 4,
    businessSpaceCode: "POSL1",
    operatorOib: "12345678901", 
    isActive: true,
    isDefault: false,
    lastInvoiceNumber: 0,
    lastSequenceNumber: 0
  }
];

// Room 401 specific rules
export const ROOM_401_RULES = [
  {
    roomId: "401", // Assuming Room 401 has id "401"
    ruleType: "cleaning-day" as const,
    cleaningDaysBetween: 1,
    isActive: true,
    effectiveFrom: new Date('2025-01-01')
  },
  {
    roomId: "401",
    ruleType: "minimum-stay" as const,
    minimumNights: 4,
    isActive: true,
    effectiveFrom: new Date('2025-01-01')
  },
  {
    roomId: "401", 
    ruleType: "fixed-pricing" as const,
    isFixedPricing: true,
    isActive: true,
    effectiveFrom: new Date('2025-01-01')
  },
  {
    roomId: "401",
    ruleType: "included-services" as const,
    includedParkingSpaces: 3,
    isActive: true,
    effectiveFrom: new Date('2025-01-01')
  }
];

// Discount and Fee Structure
export const PRICING_RULES_2026 = {
  // Children Discounts (apply only to accommodation, not total bill)
  childrenDiscounts: {
    age0to3: 1.0,   // 100% free (gratis)
    age3to7: 0.5,   // 50% discount
    age7to14: 0.8,  // 20% discount (pay 80%)
    age14plus: 1.0  // Full price
  },
  
  // Tourism Tax (no VAT, never discounted)
  tourismTax: {
    lowSeason: 1.10,  // €1.10 for months 1,2,3,10,11,12
    highSeason: 1.60, // €1.60 for months 4,5,6,7,8,9
    childrenDiscount: {
      age0to12: 0.0,  // Children 0-12 don't pay tourism tax
      age12to18: 0.5, // Children 12-18 pay 50% tourism tax
      age18plus: 1.0  // Adults pay full tourism tax
    }
  },
  
  // Short Stay Supplement
  shortStayRule: {
    minimumNights: 3,
    supplement: 0.20, // +20% on accommodation price only
    appliesTo: 'accommodation' // Not parking, drinks, or pet fees
  },
  
  // VAT Rates
  vatRates: {
    accommodation: 0.13, // 13% VAT (already included in prices)
    parking: 0.25,      // 25% VAT
    pets: 0.25,         // 25% VAT
    drinks: 0.25,       // 25% VAT
    towelRental: 0.25,  // 25% VAT
    tourismTax: 0.0     // No VAT on tourism tax
  },
  
  // Additional Services
  additionalServices: {
    parking: 7.00,      // €7 per night
    pets: 20.00,        // €20 per stay
    towelRental: 5.00   // €5 per day (example rate)
  },
  
  // Room 401 Special Rules
  room401Rules: {
    cleaningDaysBetween: 1,    // 1 day mandatory cleaning between bookings
    minimumStay: 4,            // 4 day minimum stay
    pricingType: 'per_room',   // Fixed per apartment, not per person
    maxOccupancy: 2,           // Maximum 2 people
    includedParkingSpaces: 3   // 3 parking spaces included
  }
};

// Pricing Calculation Helper Functions
export function calculateSeasonalRate(roomType: string, period: 'A' | 'B' | 'C' | 'D', pricingTier: PricingData2026): number {
  const baseRate = ROOM_RATES_2026[roomType as keyof typeof ROOM_RATES_2026];
  if (!baseRate) return 0;
  
  const seasonalRate = baseRate[period];
  const tierMultiplier = pricingTier.seasonalRates[period];
  
  return seasonalRate * tierMultiplier;
}

export function calculateChildDiscount(age: number): number {
  if (age < 3) return PRICING_RULES_2026.childrenDiscounts.age0to3;
  if (age < 7) return PRICING_RULES_2026.childrenDiscounts.age3to7;
  if (age < 14) return PRICING_RULES_2026.childrenDiscounts.age7to14;
  return PRICING_RULES_2026.childrenDiscounts.age14plus;
}

export function calculateTourismTax(age: number, isHighSeason: boolean): number {
  const baseRate = isHighSeason ? 
    PRICING_RULES_2026.tourismTax.highSeason : 
    PRICING_RULES_2026.tourismTax.lowSeason;
    
  if (age < 12) return baseRate * PRICING_RULES_2026.tourismTax.childrenDiscount.age0to12;
  if (age < 18) return baseRate * PRICING_RULES_2026.tourismTax.childrenDiscount.age12to18;
  return baseRate * PRICING_RULES_2026.tourismTax.childrenDiscount.age18plus;
}

export function needsShortStaySupplement(nights: number): boolean {
  return nights < PRICING_RULES_2026.shortStayRule.minimumNights;
}

export function calculateShortStaySupplement(accommodationPrice: number, nights: number): number {
  if (needsShortStaySupplement(nights)) {
    return accommodationPrice * PRICING_RULES_2026.shortStayRule.supplement;
  }
  return 0;
}