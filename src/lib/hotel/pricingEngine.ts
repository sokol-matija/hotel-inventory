// Comprehensive Pricing Engine for Hotel Porec
// Handles all pricing calculations with 2026 rates and rules

import { 
  ROOM_RATES_2026, 
  PRICING_RULES_2026, 
  SEASONAL_PERIODS_2026,
  calculateChildDiscount,
  calculateTourismTax,
  needsShortStaySupplement,
  calculateShortStaySupplement
} from './pricingData2026';
import { SeasonalPeriod, RoomType, GuestChild } from './types';

export interface PricingCalculationInput {
  roomType: RoomType;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: GuestChild[];
  
  // Additional services
  hasPets: boolean;
  needsParking: boolean;
  parkingNights?: number; // For Room 401, parking might be included
  towelRental?: number; // Days of towel rental
  
  // Pricing tier selection
  pricingTierId: string; // "2025-standard", "2026-standard", "agency-xyz"
  pricingTierMultiplier?: { A: number; B: number; C: number; D: number };
  
  // Discounts
  vipDiscountPercentage?: number; // VIP discount on accommodation
  
  // Corporate billing
  isR1Bill?: boolean;
  companyId?: string;
  
  // Room-specific overrides
  isRoom401?: boolean;
}

export interface DetailedPricingCalculation {
  // Basic calculation info
  roomType: RoomType;
  roomId: string;
  nights: number;
  seasonalPeriod: SeasonalPeriod;
  pricingTierId: string;
  
  // Base accommodation pricing
  baseRoomRate: number; // Per person rate from ROOM_RATES_2026
  totalPersons: number; // Adults + paying children
  accommodationSubtotal: number; // Before discounts and supplements
  
  // Discounts (accommodation only)
  discounts: {
    children0to3: { count: number; amount: number };
    children3to7: { count: number; amount: number };
    children7to14: { count: number; amount: number };
    vipDiscount: number;
    totalDiscounts: number;
  };
  
  // Accommodation final
  accommodationAfterDiscounts: number;
  shortStaySupplement: number; // +20% if < 3 nights
  accommodationTotal: number; // Final accommodation cost
  
  // Additional services (not subject to children discounts)
  services: {
    tourism: {
      adults: { count: number; rate: number; total: number };
      children12to18: { count: number; rate: number; total: number };
      total: number;
    };
    parking: {
      nights: number;
      rate: number;
      vatRate: number;
      subtotal: number;
      vatAmount: number;
      total: number;
    };
    pets: {
      count: number;
      rate: number;
      vatRate: number;
      subtotal: number;
      vatAmount: number;
      total: number;
    };
    towelRental: {
      days: number;
      rate: number;
      vatRate: number;
      subtotal: number;
      vatAmount: number;
      total: number;
    };
  };
  
  // VAT breakdown
  vat: {
    accommodationVAT: number; // 13% already included in room rates
    servicesVAT: number; // 25% on parking, pets, towels
    totalVAT: number;
  };
  
  // Final totals
  subtotalBeforeVAT: number;
  totalVATAmount: number;
  grandTotal: number;
  
  // Special room rules applied
  room401Rules?: {
    isPricingPerRoom: boolean;
    includedParkingSpaces: number;
    minimumStayMet: boolean;
  };
  
  // Metadata
  calculatedAt: Date;
  calculationVersion: string;
}

export class HotelPricingEngine {
  private static instance: HotelPricingEngine;
  
  private constructor() {}
  
  public static getInstance(): HotelPricingEngine {
    if (!HotelPricingEngine.instance) {
      HotelPricingEngine.instance = new HotelPricingEngine();
    }
    return HotelPricingEngine.instance;
  }
  
  // Main pricing calculation method
  public calculatePricing(input: PricingCalculationInput): DetailedPricingCalculation {
    const nights = this.calculateNights(input.checkIn, input.checkOut);
    const seasonalPeriod = this.getSeasonalPeriod(input.checkIn, input.checkOut);
    const isHighTourismSeason = this.isHighTourismSeason(input.checkIn);
    
    // Get base room rate
    const baseRoomRate = this.getBaseRoomRate(input.roomType, seasonalPeriod, input.pricingTierMultiplier);
    
    // Handle Room 401 special pricing (per apartment, not per person)
    const isRoom401 = input.roomId === '401' || input.isRoom401 || false;
    let accommodationSubtotal: number;
    let totalPersons: number;
    
    if (isRoom401) {
      // Room 401: Fixed price per apartment, not per person
      accommodationSubtotal = baseRoomRate * nights;
      totalPersons = input.adults; // Still count persons for tourism tax
    } else {
      // Regular rooms: Per person pricing
      totalPersons = input.adults + input.children.length;
      accommodationSubtotal = baseRoomRate * nights * totalPersons;
    }
    
    // Calculate children discounts (only for accommodation)
    const discounts = this.calculateDiscounts(
      input.children, 
      baseRoomRate, 
      nights, 
      input.vipDiscountPercentage,
      isRoom401
    );
    
    const accommodationAfterDiscounts = accommodationSubtotal - discounts.totalDiscounts;
    
    // Short stay supplement (+20% on accommodation if < 3 nights)
    const shortStaySupplement = calculateShortStaySupplement(accommodationAfterDiscounts, nights);
    const accommodationTotal = accommodationAfterDiscounts + shortStaySupplement;
    
    // Calculate additional services
    const services = this.calculateServices(
      input.adults,
      input.children,
      nights,
      isHighTourismSeason,
      input.hasPets,
      input.needsParking,
      input.towelRental || 0,
      isRoom401
    );
    
    // Calculate VAT breakdown (for display purposes - already included in prices)
    const vat = this.calculateVAT(accommodationTotal, services);

    // Final totals
    // NOTE: VAT is already included in all prices, we just extract it for display
    // Do NOT add VAT on top - it's already in accommodationTotal and service totals
    const grandTotal = accommodationTotal +
                       services.tourism.total +
                       services.parking.total +
                       services.pets.total +
                       services.towelRental.total;

    const subtotalBeforeVAT = grandTotal - vat.totalVAT;
    const totalVATAmount = vat.totalVAT;
    
    return {
      roomType: input.roomType,
      roomId: input.roomId,
      nights,
      seasonalPeriod,
      pricingTierId: input.pricingTierId,
      baseRoomRate,
      totalPersons,
      accommodationSubtotal,
      discounts,
      accommodationAfterDiscounts,
      shortStaySupplement,
      accommodationTotal,
      services,
      vat,
      subtotalBeforeVAT,
      totalVATAmount,
      grandTotal,
      room401Rules: isRoom401 ? {
        isPricingPerRoom: true,
        includedParkingSpaces: PRICING_RULES_2026.room401Rules.includedParkingSpaces,
        minimumStayMet: nights >= PRICING_RULES_2026.room401Rules.minimumStay
      } : undefined,
      calculatedAt: new Date(),
      calculationVersion: '2026.1.0'
    };
  }
  
  private calculateNights(checkIn: Date, checkOut: Date): number {
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  
  private getSeasonalPeriod(checkIn: Date, checkOut: Date): SeasonalPeriod {
    // For multi-day stays, use the check-in date's period
    // In future, we might want to pro-rate across periods
    return this.determinePeriodForDate(checkIn);
  }
  
  private determinePeriodForDate(date: Date): SeasonalPeriod {
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    const monthDay = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    // Check each period's date ranges
    for (const [period, config] of Object.entries(SEASONAL_PERIODS_2026)) {
      for (const range of config.periods) {
        if (this.isDateInRange(monthDay, range.start, range.end)) {
          return period as SeasonalPeriod;
        }
      }
    }
    
    // Default to Period A if no match found
    return 'A';
  }
  
  private isDateInRange(date: string, start: string, end: string): boolean {
    // Handle year-crossing ranges (e.g., 12-30 to 01-02)
    if (start > end) {
      return date >= start || date <= end;
    }
    return date >= start && date <= end;
  }
  
  private getBaseRoomRate(
    roomType: RoomType, 
    period: SeasonalPeriod, 
    tierMultiplier?: { A: number; B: number; C: number; D: number }
  ): number {
    const baseRates = ROOM_RATES_2026[roomType];
    if (!baseRates) return 0;
    
    const seasonalRate = baseRates[period];
    const multiplier = tierMultiplier?.[period] || 1.0;
    
    return seasonalRate * multiplier;
  }
  
  private calculateDiscounts(
    children: GuestChild[], 
    baseRoomRate: number, 
    nights: number, 
    vipDiscountPercentage: number = 0,
    isRoom401: boolean = false
  ) {
    let children0to3 = { count: 0, amount: 0 };
    let children3to7 = { count: 0, amount: 0 };
    let children7to14 = { count: 0, amount: 0 };
    
    // Calculate children discounts (only for accommodation)
    children.forEach(child => {
      const discount = calculateChildDiscount(child.age);
      const childAccommodationCost = isRoom401 ? 0 : baseRoomRate * nights; // Room 401 is per apartment
      const discountAmount = childAccommodationCost * (1 - discount);
      
      if (child.age < 3) {
        children0to3.count++;
        children0to3.amount += discountAmount;
      } else if (child.age < 7) {
        children3to7.count++;
        children3to7.amount += discountAmount;
      } else if (child.age < 14) {
        children7to14.count++;
        children7to14.amount += discountAmount;
      }
    });
    
    // VIP discount (on accommodation total before children discounts)
    const accommodationBeforeVip = (baseRoomRate * nights * (children.length + 1)) - 
      (children0to3.amount + children3to7.amount + children7to14.amount);
    const vipDiscount = accommodationBeforeVip * (vipDiscountPercentage / 100);
    
    const totalDiscounts = children0to3.amount + children3to7.amount + children7to14.amount + vipDiscount;
    
    return {
      children0to3,
      children3to7,
      children7to14,
      vipDiscount,
      totalDiscounts
    };
  }
  
  private isHighTourismSeason(date: Date): boolean {
    const month = date.getMonth() + 1; // 1-12
    return month >= 4 && month <= 9; // Months 4,5,6,7,8,9
  }
  
  private calculateServices(
    adults: number,
    children: GuestChild[],
    nights: number,
    isHighTourismSeason: boolean,
    hasPets: boolean,
    needsParking: boolean,
    towelRentalDays: number,
    isRoom401: boolean
  ) {
    // Tourism tax calculation
    const tourismTax = this.calculateTourismTaxTotal(adults, children, nights, isHighTourismSeason);
    
    // Parking (Room 401 includes 3 parking spaces)
    const parkingNights = isRoom401 ? Math.max(0, nights - PRICING_RULES_2026.room401Rules.includedParkingSpaces) : 
      (needsParking ? nights : 0);
    const parkingSubtotal = parkingNights * PRICING_RULES_2026.additionalServices.parking;
    const parkingVAT = parkingSubtotal * PRICING_RULES_2026.vatRates.parking;
    
    // Pet fee
    const petSubtotal = hasPets ? PRICING_RULES_2026.additionalServices.pets : 0;
    const petVAT = petSubtotal * PRICING_RULES_2026.vatRates.pets;
    
    // Towel rental
    const towelSubtotal = towelRentalDays * PRICING_RULES_2026.additionalServices.towelRental;
    const towelVAT = towelSubtotal * PRICING_RULES_2026.vatRates.towelRental;
    
    return {
      tourism: tourismTax,
      parking: {
        nights: parkingNights,
        rate: PRICING_RULES_2026.additionalServices.parking,
        vatRate: PRICING_RULES_2026.vatRates.parking,
        subtotal: parkingSubtotal,
        vatAmount: parkingVAT,
        total: parkingSubtotal + parkingVAT
      },
      pets: {
        count: hasPets ? 1 : 0,
        rate: PRICING_RULES_2026.additionalServices.pets,
        vatRate: PRICING_RULES_2026.vatRates.pets,
        subtotal: petSubtotal,
        vatAmount: petVAT,
        total: petSubtotal + petVAT
      },
      towelRental: {
        days: towelRentalDays,
        rate: PRICING_RULES_2026.additionalServices.towelRental,
        vatRate: PRICING_RULES_2026.vatRates.towelRental,
        subtotal: towelSubtotal,
        vatAmount: towelVAT,
        total: towelSubtotal + towelVAT
      }
    };
  }
  
  private calculateTourismTaxTotal(adults: number, children: GuestChild[], nights: number, isHighSeason: boolean) {
    const adultsTotal = adults * nights * calculateTourismTax(25, isHighSeason); // Assume adult age 25
    
    let children12to18Count = 0;
    let children12to18Total = 0;
    
    children.forEach(child => {
      if (child.age >= 12 && child.age < 18) {
        children12to18Count++;
        children12to18Total += nights * calculateTourismTax(child.age, isHighSeason);
      }
    });
    
    return {
      adults: {
        count: adults,
        rate: calculateTourismTax(25, isHighSeason),
        total: adultsTotal
      },
      children12to18: {
        count: children12to18Count,
        rate: calculateTourismTax(15, isHighSeason), // Example 15-year-old rate
        total: children12to18Total
      },
      total: adultsTotal + children12to18Total
    };
  }
  
  private calculateVAT(accommodationTotal: number, services: any) {
    // Accommodation VAT (13% already included in prices)
    const accommodationVAT = accommodationTotal * (PRICING_RULES_2026.vatRates.accommodation / (1 + PRICING_RULES_2026.vatRates.accommodation));
    
    // Services VAT (25% on parking, pets, towels)
    const servicesVAT = services.parking.vatAmount + services.pets.vatAmount + services.towelRental.vatAmount;
    
    return {
      accommodationVAT,
      servicesVAT,
      totalVAT: accommodationVAT + servicesVAT
    };
  }
  
  private sumServicesSubtotal(services: any): number {
    return services.parking.subtotal + services.pets.subtotal + services.towelRental.subtotal;
  }
  
  // Validation methods
  public validateRoom401Booking(checkIn: Date, checkOut: Date, existingReservations: any[]): { isValid: boolean; errors: string[] } {
    const nights = this.calculateNights(checkIn, checkOut);
    const errors: string[] = [];
    
    // Check minimum stay requirement
    if (nights < PRICING_RULES_2026.room401Rules.minimumStay) {
      errors.push(`Room 401 requires minimum ${PRICING_RULES_2026.room401Rules.minimumStay} night stay. Selected: ${nights} nights.`);
    }
    
    // Check for cleaning day gaps (would need existing reservations to validate)
    // This would be implemented based on your reservation data structure
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Utility method to get available pricing tiers
  public getAvailablePricingTiers(): Array<{ id: string; name: string; description: string }> {
    return [
      { id: '2025-standard', name: '2025 Standard', description: 'Current 2025 pricing' },
      { id: '2026-standard', name: '2026 Standard', description: 'New 2026 pricing (default)' },
      // Additional agency tiers would be loaded from localStorage
    ];
  }
}