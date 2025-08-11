// DatabasePricingService - Pricing calculations using Supabase data
// Integrates with database room types, pricing tiers, and fee configurations

import { supabase } from '../../supabase';
import { SeasonalPeriod, RoomType, GuestChild, PricingCalculation } from '../types';
import { hotelDataService } from './HotelDataService';

interface DatabasePricingInput {
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: GuestChild[];
  hasPets?: boolean;
  needsParking?: boolean;
  pricingTierId?: string;
}

interface RoomTypePricing {
  id: string;
  price_period_a: number;
  price_period_b: number;
  price_period_c: number;
  price_period_d: number;
  minimum_stay_nights?: number;
}

interface FeeConfiguration {
  fee_name: string;
  fee_type: string;
  calculation_method: string;
  fixed_amount?: number;
  percentage_rate?: number;
  vat_rate?: number;
}

export class DatabasePricingService {
  private static instance: DatabasePricingService;
  private static readonly HOTEL_POREC_ID = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for Hotel Porec
  
  private constructor() {}
  
  public static getInstance(): DatabasePricingService {
    if (!DatabasePricingService.instance) {
      DatabasePricingService.instance = new DatabasePricingService();
    }
    return DatabasePricingService.instance;
  }

  /**
   * Calculate pricing using database data
   */
  async calculatePricing(input: DatabasePricingInput): Promise<PricingCalculation> {
    try {
      // Get room information
      const room = await hotelDataService.getRoomById(input.roomId);
      if (!room) {
        throw new Error(`Room not found: ${input.roomId}`);
      }

      // Calculate nights
      const checkInDate = new Date(input.checkIn);
      const checkOutDate = new Date(input.checkOut);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get seasonal period
      const seasonalPeriod = this.getSeasonalPeriod(checkInDate);

      // Get room type pricing from database
      const pricing = await this.getRoomTypePricing(room.id, input.pricingTierId);
      
      // Get base rate for the seasonal period
      const baseRate = this.getSeasonalRate(pricing, seasonalPeriod);
      const subtotal = baseRate * nights;

      // Calculate discounts
      const childrenDiscount = this.calculateChildrenDiscounts(input.children, baseRate, nights);

      // Calculate fees
      const fees = await this.calculateFees(input, nights);

      // Calculate totals
      const discountedSubtotal = subtotal - childrenDiscount;
      const totalFees = Object.values(fees).reduce((sum, fee) => sum + fee, 0);
      const total = discountedSubtotal + totalFees;

      return {
        baseRate,
        numberOfNights: nights,
        seasonalPeriod,
        subtotal: discountedSubtotal,
        discounts: {
          children0to3: this.getChildDiscountByAge(input.children, 0, 3, baseRate, nights),
          children3to7: this.getChildDiscountByAge(input.children, 3, 7, baseRate, nights),
          children7to14: this.getChildDiscountByAge(input.children, 7, 14, baseRate, nights),
          longStay: 0 // TODO: Implement long stay discounts
        },
        totalDiscounts: childrenDiscount,
        fees,
        totalFees,
        total
      };

    } catch (error) {
      console.error('Error calculating pricing:', error);
      
      // Return fallback pricing
      return this.getFallbackPricing(input);
    }
  }

  /**
   * Get active price list for hotel
   */
  private async getActivePriceList(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('price_lists')
        .select('id')
        .eq('hotel_id', DatabasePricingService.HOTEL_POREC_ID)
        .eq('is_active', true)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      
      return data.id;
    } catch (error) {
      console.error('Error getting active price list:', error);
      // Return fallback price list ID
      return 'price-list-2025';
    }
  }

  /**
   * Get room type pricing from database
   */
  private async getRoomTypePricing(roomId: string, pricingTierId?: string): Promise<RoomTypePricing> {
    try {
      // First get the room to find its room type
      const room = await hotelDataService.getRoomById(roomId);
      if (!room) throw new Error('Room not found');

      // Get room type ID from database
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('room_type_id')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      // Get active price list
      const priceListId = await this.getActivePriceList();

      // Get pricing for this room type
      const { data, error } = await supabase
        .from('room_type_pricing')
        .select('*')
        .eq('room_type_id', roomData.room_type_id)
        .eq('price_list_id', priceListId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting room type pricing:', error);
      
      // Return fallback pricing based on room type
      return {
        id: 'fallback',
        price_period_a: 50,
        price_period_b: 60,
        price_period_c: 80,
        price_period_d: 100
      };
    }
  }

  /**
   * Get fee configurations from database
   */
  private async getFeeConfigurations(): Promise<FeeConfiguration[]> {
    try {
      const priceListId = await this.getActivePriceList();

      const { data, error } = await supabase
        .from('fee_configurations')
        .select('*')
        .eq('price_list_id', priceListId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting fee configurations:', error);
      return [];
    }
  }

  /**
   * Calculate all fees
   */
  private async calculateFees(input: DatabasePricingInput, nights: number): Promise<{
    tourism: number;
    vat: number;
    pets: number;
    parking: number;
    shortStay: number;
    additional: number;
  }> {
    const fees = {
      tourism: 0,
      vat: 0,
      pets: 0,
      parking: 0,
      shortStay: 0,
      additional: 0
    };

    try {
      const feeConfigs = await this.getFeeConfigurations();

      for (const config of feeConfigs) {
        switch (config.fee_type) {
          case 'tourism_tax':
            fees.tourism = this.calculateTourismTax(input.adults, input.children, nights);
            break;
          case 'pet_fee':
            if (input.hasPets && config.fixed_amount) {
              fees.pets = config.fixed_amount;
            }
            break;
          case 'parking_fee':
            if (input.needsParking && config.fixed_amount) {
              fees.parking = config.fixed_amount * nights;
            }
            break;
          case 'short_stay_supplement':
            if (nights < 3 && config.percentage_rate) {
              fees.shortStay = 0; // Will be calculated based on accommodation subtotal
            }
            break;
        }
      }

      // Calculate VAT (25% on accommodation, already included in Croatian hotel rates)
      fees.vat = 0; // VAT is already included in room rates

    } catch (error) {
      console.error('Error calculating fees:', error);
      
      // Fallback fee calculations
      fees.tourism = this.calculateTourismTax(input.adults, input.children, nights);
      if (input.hasPets) fees.pets = 20; // €20 pet fee
      if (input.needsParking) fees.parking = 7 * nights; // €7 per night
    }

    return fees;
  }

  /**
   * Calculate tourism tax
   */
  private calculateTourismTax(adults: number, children: GuestChild[], nights: number): number {
    const seasonalRate = 1.50; // €1.50 per person per night (high season rate)
    
    // Only adults and children over 18 pay tourism tax
    const taxableGuests = adults + children.filter(child => child.age >= 18).length;
    
    return taxableGuests * seasonalRate * nights;
  }

  /**
   * Calculate children discounts
   */
  private calculateChildrenDiscounts(children: GuestChild[], baseRate: number, nights: number): number {
    let totalDiscount = 0;

    for (const child of children) {
      if (child.age < 3) {
        // Children under 3: Free
        totalDiscount += baseRate * nights;
      } else if (child.age < 7) {
        // Children 3-7: 50% discount
        totalDiscount += baseRate * nights * 0.5;
      } else if (child.age < 14) {
        // Children 7-14: 20% discount
        totalDiscount += baseRate * nights * 0.2;
      }
      // Children 14+ pay full rate
    }

    return totalDiscount;
  }

  /**
   * Get discount amount for specific age range
   */
  private getChildDiscountByAge(children: GuestChild[], minAge: number, maxAge: number, baseRate: number, nights: number): number {
    const eligibleChildren = children.filter(child => child.age >= minAge && child.age < maxAge);
    
    let discountRate = 0;
    if (minAge === 0 && maxAge === 3) discountRate = 1.0; // Free
    else if (minAge === 3 && maxAge === 7) discountRate = 0.5; // 50% off
    else if (minAge === 7 && maxAge === 14) discountRate = 0.2; // 20% off

    return eligibleChildren.length * baseRate * nights * discountRate;
  }

  /**
   * Get seasonal rate from pricing data
   */
  private getSeasonalRate(pricing: RoomTypePricing, period: SeasonalPeriod): number {
    switch (period) {
      case 'A': return pricing.price_period_a;
      case 'B': return pricing.price_period_b;
      case 'C': return pricing.price_period_c;
      case 'D': return pricing.price_period_d;
      default: return pricing.price_period_a;
    }
  }

  /**
   * Determine seasonal period from date
   */
  private getSeasonalPeriod(date: Date): SeasonalPeriod {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Simplified seasonal period logic for 2025
    if (month <= 4 || month === 12) return 'A'; // Winter/Early Spring
    if (month === 5 || month === 10) return 'B'; // Spring/Late Fall
    if (month === 6 || month === 9) return 'C'; // Early Summer/Early Fall
    if (month >= 7 && month <= 8) return 'D'; // Peak Summer

    return 'A';
  }

  /**
   * Fallback pricing when database is unavailable
   */
  private getFallbackPricing(input: DatabasePricingInput): PricingCalculation {
    const nights = Math.ceil((input.checkOut.getTime() - input.checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const baseRate = 60; // Fallback base rate
    const seasonalPeriod = this.getSeasonalPeriod(input.checkIn);
    const subtotal = baseRate * nights;
    
    const childrenDiscount = this.calculateChildrenDiscounts(input.children, baseRate, nights);
    const tourismTax = this.calculateTourismTax(input.adults, input.children, nights);
    
    const fees = {
      tourism: tourismTax,
      vat: 0,
      pets: input.hasPets ? 20 : 0,
      parking: input.needsParking ? 7 * nights : 0,
      shortStay: nights < 3 ? subtotal * 0.2 : 0,
      additional: 0
    };

    const totalFees = Object.values(fees).reduce((sum, fee) => sum + fee, 0);
    const discountedSubtotal = subtotal - childrenDiscount;

    return {
      baseRate,
      numberOfNights: nights,
      seasonalPeriod,
      subtotal: discountedSubtotal,
      discounts: {
        children0to3: this.getChildDiscountByAge(input.children, 0, 3, baseRate, nights),
        children3to7: this.getChildDiscountByAge(input.children, 3, 7, baseRate, nights),
        children7to14: this.getChildDiscountByAge(input.children, 7, 14, baseRate, nights),
        longStay: 0
      },
      totalDiscounts: childrenDiscount,
      fees,
      totalFees,
      total: discountedSubtotal + totalFees
    };
  }
}

export const databasePricingService = DatabasePricingService.getInstance();