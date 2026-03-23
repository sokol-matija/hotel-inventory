/**
 * Unified Pricing Service - Single Source of Truth
 *
 * Fixes VAT double-charging and provides consistent pricing calculations
 * across all features including day-by-day breakdown.
 *
 * Croatian Tax Compliance:
 * - Room rates already include 13% VAT (Croatian accommodation law since 2018)
 * - Tourism tax separate (€1.10-€1.50 per person per night)
 * - Service fees separate (parking, pets, towels)
 */

import { supabase } from '../../supabase';
import { SeasonalPeriod, GuestChild, PricingCalculation } from '../types';

// Configuration for Croatian hotel pricing
export interface PricingConfig {
  vatRate: number; // 0.13 for Croatia accommodation (Croatian VAT law since 2018)
  vatIncludedInRates: boolean; // true for Croatia
  tourismTaxRates: {
    high: number; // €1.50 Apr-Sep
    low: number; // €1.10 Oct-Mar
  };
  serviceFees: {
    petFeePerNight: number; // €20.00 per night
    parkingFeePerNight: number; // €7.00 per night
    towelRentalPerDay: number; // €5.00 per towel per day
    shortStaySupplementRate: number; // 0.20 (20% for < 3 nights)
  };
  childDiscounts: {
    age0to3: number; // 1.0 = 100% discount (free)
    age3to7: number; // 0.5 = 50% discount
    age7to14: number; // 0.2 = 20% discount
  };
}

const DEFAULT_CONFIG: PricingConfig = {
  vatRate: 0.13, // Croatian accommodation VAT rate (13% per law since 2018)
  vatIncludedInRates: true,
  tourismTaxRates: { high: 1.5, low: 1.1 },
  serviceFees: {
    petFeePerNight: 20.0,
    parkingFeePerNight: 7.0,
    towelRentalPerDay: 5.0,
    shortStaySupplementRate: 0.2,
  },
  childDiscounts: {
    age0to3: 1.0,
    age3to7: 0.5,
    age7to14: 0.2, // 20% discount (consistent with pricingCalculator.ts and pricingData2026.ts)
  },
};

export interface ReservationPricingParams {
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: GuestChild[];
  pricingTierId?: string;
  services?: {
    parkingSpots?: number;
    hasPets?: boolean;
    petCount?: number;
    towelRentals?: number;
  };
}

export interface DayByDayPricingParams {
  reservationId: string;
  dailyDetails?: Array<{
    date: Date;
    adultsPresent: number;
    childrenPresent: string[]; // guest_children.id's
    parkingSpots: number;
    hasPets: boolean;
    towelRentals: number;
  }>;
}

export interface VATBreakdown {
  baseAmount: number;
  vatAmount: number; // Amount included in rates (for reporting)
  totalAmount: number; // Same as baseAmount (no additional VAT)
}

export interface PricingResult {
  accommodation: {
    baseRate: number;
    numberOfNights: number;
    subtotal: number;
    childDiscounts: number;
    netAccommodation: number;
    vatIncluded: number; // For reporting only
  };
  services: {
    tourismTax: number;
    parkingFees: number;
    petFees: number;
    towelRentals: number;
    shortStaySuplement: number;
    total: number;
  };
  totals: {
    accommodationTotal: number;
    servicesTotal: number;
    grandTotal: number;
  };
  breakdown: {
    seasonalPeriod: SeasonalPeriod;
    numberOfNights: number;
    isShortStay: boolean;
    vatCompliant: boolean; // Always true with this service
  };
}

export interface DayByDayPricingResult {
  reservationId: string;
  dailyBreakdown: Array<{
    date: Date;
    occupancy: {
      adults: number;
      children: Array<{
        id: string;
        name: string;
        age: number;
      }>;
    };
    pricing: {
      seasonalPeriod: SeasonalPeriod;
      baseRate: number;
      baseAccommodation: number;
      childDiscounts: number;
      netAccommodation: number;
      serviceFees: {
        parking: number;
        pets: number;
        towels: number;
        tourism: number;
        total: number;
      };
      dailyTotal: number;
    };
    editable: boolean;
  }>;
  summary: {
    totalNights: number;
    totalAccommodation: number;
    totalServices: number;
    grandTotal: number;
  };
}

export interface GuestDayPresenceParams {
  reservationId: string;
  stayDate: Date;
  adultsPresent: number;
  childrenPresent: string[]; // guest_children.id's
  parkingSpots: number;
  hasPets: boolean;
  petCount?: number;
  towelRentals: number;
  notes?: string;
}

export class UnifiedPricingService {
  private static instance: UnifiedPricingService;
  private config: PricingConfig;

  private constructor(config: PricingConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  public static getInstance(config?: PricingConfig): UnifiedPricingService {
    if (!UnifiedPricingService.instance) {
      UnifiedPricingService.instance = new UnifiedPricingService(config);
    }
    return UnifiedPricingService.instance;
  }

  /**
   * Main pricing calculation method - VAT compliant
   */
  async calculateReservationPricing(params: ReservationPricingParams): Promise<PricingResult> {
    try {
      // Get room and pricing data
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*, room_types (*)')
        .eq('id', params.roomId)
        .single();

      if (roomError) throw roomError;

      // Calculate number of nights
      const numberOfNights = Math.ceil(
        (params.checkOutDate.getTime() - params.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (numberOfNights <= 0) {
        throw new Error('Check-out date must be after check-in date');
      }

      // Get seasonal period and rate
      const seasonalPeriod = this.getSeasonalPeriod(params.checkInDate);
      const baseRate = await this.getRoomSeasonalRate(
        params.roomId,
        params.checkInDate,
        params.pricingTierId
      );

      // Special handling for Room 401 (apartment)
      const isApartment = room.number === '401';

      // Calculate accommodation costs
      const accommodation = this.calculateAccommodationCosts(
        baseRate,
        numberOfNights,
        params.adults,
        params.children,
        isApartment
      );

      // Calculate service fees
      const services = this.calculateServiceFees(
        params.adults,
        params.children,
        numberOfNights,
        params.checkInDate,
        params.services || {},
        isApartment
      );

      // Apply short stay supplement if applicable
      const isShortStay = numberOfNights < 3;
      const shortStaySuplement = isShortStay
        ? accommodation.netAccommodation * this.config.serviceFees.shortStaySupplementRate
        : 0;

      const totals = {
        accommodationTotal: accommodation.netAccommodation,
        servicesTotal: services.total + shortStaySuplement,
        grandTotal: accommodation.netAccommodation + services.total + shortStaySuplement,
      };

      return {
        accommodation,
        services: {
          ...services,
          shortStaySuplement,
          total: services.total + shortStaySuplement,
        },
        totals,
        breakdown: {
          seasonalPeriod,
          numberOfNights,
          isShortStay,
          vatCompliant: true,
        },
      };
    } catch (error) {
      console.error('Error calculating reservation pricing:', error);
      throw error;
    }
  }

  /**
   * Calculate total pricing for a reservation — drop-in replacement for the old pricingCalculator
   * and pricingEngine. Returns PricingCalculation so existing callers need minimal changes.
   */
  async calculateTotal(params: {
    roomId: string;
    checkIn: Date;
    checkOut: Date;
    adults: number;
    children: GuestChild[];
    hasPets?: boolean;
    needsParking?: boolean;
    additionalCharges?: number;
    pricingTierId?: string;
  }): Promise<PricingCalculation> {
    const result = await this.calculateReservationPricing({
      roomId: params.roomId,
      checkInDate: params.checkIn,
      checkOutDate: params.checkOut,
      adults: params.adults,
      children: params.children,
      pricingTierId: params.pricingTierId,
      services: {
        hasPets: params.hasPets,
        parkingSpots: params.needsParking ? 1 : 0,
      },
    });

    return {
      baseRate: result.accommodation.baseRate,
      numberOfNights: result.breakdown.numberOfNights,
      seasonalPeriod: result.breakdown.seasonalPeriod,
      subtotal: result.accommodation.subtotal,
      discounts: {
        children0to3: 0,
        children3to7: 0,
        children7to14: 0,
        longStay: 0,
      },
      totalDiscounts: result.accommodation.childDiscounts,
      fees: {
        tourism: result.services.tourismTax,
        vat: result.accommodation.vatIncluded,
        pets: result.services.petFees,
        parking: result.services.parkingFees,
        shortStay: result.services.shortStaySuplement,
        additional: params.additionalCharges || 0,
      },
      totalFees: result.services.total,
      total: result.totals.grandTotal + (params.additionalCharges || 0),
    };
  }

  /**
   * Day-by-day pricing breakdown with individual guest tracking
   */
  async calculateDayByDayBreakdown(params: DayByDayPricingParams): Promise<DayByDayPricingResult> {
    try {
      // Get reservation details
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select(
          `
          *,
          rooms (*),
          pricing_tiers (*)
        `
        )
        .eq('id', params.reservationId)
        .single();

      if (reservationError) throw reservationError;

      // Get or create daily details
      let dailyDetails = await this.getReservationDailyDetails(params.reservationId);

      if (params.dailyDetails) {
        // Update with provided daily details
        dailyDetails = await this.updateDailyDetails(params.reservationId, params.dailyDetails);
      }

      // Calculate pricing for each day
      const dailyBreakdown = [];

      for (const day of dailyDetails) {
        const breakdown = await this.calculateSingleDayPricing(reservation, day);
        dailyBreakdown.push(breakdown);
      }

      // Calculate summary
      const summary = {
        totalNights: dailyBreakdown.length,
        totalAccommodation: dailyBreakdown.reduce(
          (sum, day) => sum + day.pricing.netAccommodation,
          0
        ),
        totalServices: dailyBreakdown.reduce((sum, day) => sum + day.pricing.serviceFees.total, 0),
        grandTotal: dailyBreakdown.reduce((sum, day) => sum + day.pricing.dailyTotal, 0),
      };

      return {
        reservationId: params.reservationId,
        dailyBreakdown,
        summary,
      };
    } catch (error) {
      console.error('Error calculating day-by-day breakdown:', error);
      throw error;
    }
  }

  /**
   * Update individual guest day presence
   */
  async updateGuestDayPresence(params: GuestDayPresenceParams): Promise<void> {
    try {
      // Update daily detail record
      const { error } = await supabase.from('reservation_daily_details').upsert(
        {
          reservation_id: params.reservationId,
          stay_date: params.stayDate.toISOString().split('T')[0],
          adults_present: params.adultsPresent,
          children_present: params.childrenPresent,
          parking_spots_needed: params.parkingSpots,
          pets_present: params.hasPets,
          pet_count: params.petCount || 0,
          towel_rentals: params.towelRentals,
          notes: params.notes,
        },
        {
          onConflict: 'reservation_id,stay_date',
        }
      );

      if (error) throw error;

      // Recalculate pricing for this day
      await this.recalculateDayPricing(params.reservationId, params.stayDate);
    } catch (error) {
      console.error('Error updating guest day presence:', error);
      throw error;
    }
  }

  /**
   * VAT-compliant pricing calculation (no double charging)
   */
  private calculateVATCompliantPricing(baseAmount: number): VATBreakdown {
    // Croatian room rates already include VAT
    // This method extracts the VAT portion for reporting purposes only
    const vatAmount = baseAmount * (this.config.vatRate / (1 + this.config.vatRate));

    return {
      baseAmount,
      vatAmount, // For reporting only
      totalAmount: baseAmount, // No additional VAT charged
    };
  }

  /**
   * Calculate accommodation costs with child discounts
   */
  private calculateAccommodationCosts(
    baseRate: number,
    numberOfNights: number,
    adults: number,
    children: GuestChild[],
    isApartment: boolean
  ) {
    let subtotal: number;
    let childDiscounts = 0;

    if (isApartment) {
      // Room 401: Fixed price per apartment, not per person
      subtotal = baseRate * numberOfNights;
      // No child discounts for apartment (fixed pricing)
    } else {
      // Regular rooms: Per person pricing
      const totalGuests = adults + children.length;
      subtotal = baseRate * totalGuests * numberOfNights;

      // Calculate child discounts
      for (const child of children) {
        const childRate = baseRate * numberOfNights;
        if (child.age <= 3) {
          childDiscounts += childRate * this.config.childDiscounts.age0to3;
        } else if (child.age <= 7) {
          childDiscounts += childRate * this.config.childDiscounts.age3to7;
        } else if (child.age <= 14) {
          childDiscounts += childRate * this.config.childDiscounts.age7to14;
        }
      }
    }

    const netAccommodation = subtotal - childDiscounts;
    const vatIncluded = this.calculateVATCompliantPricing(netAccommodation).vatAmount;

    return {
      baseRate,
      numberOfNights,
      subtotal,
      childDiscounts,
      netAccommodation,
      vatIncluded,
    };
  }

  /**
   * Calculate service fees
   */
  private calculateServiceFees(
    adults: number,
    children: GuestChild[],
    numberOfNights: number,
    checkInDate: Date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    services: any,
    isApartment: boolean
  ) {
    // Tourism tax
    const tourismTaxRate = this.getTourismTaxRate(checkInDate);
    let tourismTax = adults * tourismTaxRate * numberOfNights;

    // Add tourism tax for children 12+
    for (const child of children) {
      if (child.age >= 12 && child.age < 18) {
        tourismTax += tourismTaxRate * 0.5 * numberOfNights; // 50% for 12-18
      } else if (child.age >= 18) {
        tourismTax += tourismTaxRate * numberOfNights; // Full rate for 18+
      }
      // Children under 12: free
    }

    // Parking fees
    let parkingFees = 0;
    if (services.parkingSpots && services.parkingSpots > 0) {
      if (isApartment) {
        // Room 401 includes 3 free parking spaces
        const extraSpaces = Math.max(0, services.parkingSpots - 3);
        parkingFees = extraSpaces * this.config.serviceFees.parkingFeePerNight * numberOfNights;
      } else {
        parkingFees =
          services.parkingSpots * this.config.serviceFees.parkingFeePerNight * numberOfNights;
      }
    }

    // Pet fees (per night)
    const petFees = services.hasPets ? this.config.serviceFees.petFeePerNight * numberOfNights : 0;

    // Towel rentals
    const towelRentals =
      (services.towelRentals || 0) * this.config.serviceFees.towelRentalPerDay * numberOfNights;

    return {
      tourismTax,
      parkingFees,
      petFees,
      towelRentals,
      total: tourismTax + parkingFees + petFees + towelRentals,
    };
  }

  /**
   * Get seasonal period for a date
   */
  public getSeasonalPeriod(date: Date): SeasonalPeriod {
    const month = date.getMonth() + 1;

    // Simplified Croatian seasonal logic
    if (month <= 4 || month === 12) return 'A'; // Winter/Early Spring
    if (month === 5 || month >= 10) return 'B'; // Spring/Late Fall
    if (month === 6 || month === 9) return 'C'; // Early Summer/Early Fall
    if (month >= 7 && month <= 8) return 'D'; // Peak Summer

    return 'A';
  }

  /**
   * Get tourism tax rate for a date
   */
  public getTourismTaxRate(date: Date): number {
    const month = date.getMonth() + 1;

    // April-September: €1.50
    if (month >= 4 && month <= 9) {
      return this.config.tourismTaxRates.high;
    }

    // October-March: €1.10
    return this.config.tourismTaxRates.low;
  }

  /**
   * Get room seasonal rate with pricing tier discount
   */
  private async getRoomSeasonalRate(
    roomId: string,
    stayDate: Date,
    pricingTierId?: string
  ): Promise<number> {
    try {
      // Use the DB function which correctly matches by date range, is_active, and priority
      const { data, error } = await supabase.rpc('get_room_price', {
        p_room_id: parseInt(roomId),
        p_date: stayDate.toISOString().split('T')[0],
      });

      if (error || !data || data.length === 0) {
        console.warn(`No seasonal rate found for room ${roomId} on ${stayDate}, using fallback`);
        return 100.0;
      }

      let finalRate: number = data[0].base_rate;

      // Apply pricing tier discount if applicable
      if (pricingTierId) {
        const { data: tierData, error: tierError } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('id', pricingTierId)
          .single();

        if (!tierError && tierData) {
          const seasonCode = data[0].season_code?.toLowerCase();
          const discountKey = `seasonal_rate_${seasonCode}`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const discountValue = (tierData as any)[discountKey];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((tierData as any).is_percentage_discount && discountValue) {
            finalRate = finalRate * (1 - Number(discountValue));
          }
        }
      }

      return finalRate;
    } catch (error) {
      console.error('Error getting room seasonal rate:', error);
      return 100.0;
    }
  }

  /**
   * Get or create daily details for a reservation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getReservationDailyDetails(reservationId: string): Promise<any[]> {
    try {
      // Check if daily details exist
      const { data: existingDetails, error: detailsError } = await supabase
        .from('reservation_daily_details')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('stay_date');

      if (detailsError) throw detailsError;

      if (existingDetails && existingDetails.length > 0) {
        return existingDetails;
      }

      // Create initial daily details from reservation
      return await this.createInitialDailyDetails(reservationId);
    } catch (error) {
      console.error('Error getting reservation daily details:', error);
      throw error;
    }
  }

  /**
   * Create initial daily details from main reservation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createInitialDailyDetails(reservationId: string): Promise<any[]> {
    try {
      // Get reservation data
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select(
          `
          *,
          guest_children (id, name, age)
        `
        )
        .eq('id', reservationId)
        .single();

      if (reservationError) throw reservationError;

      const checkIn = new Date(reservation.check_in);
      const checkOut = new Date(reservation.check_out);
      const dailyDetails = [];

      // Get children IDs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childrenIds = (reservation.guest_children || []).map((child: any) => child.id);

      // Create daily detail for each night
      for (let date = new Date(checkIn); date < checkOut; date.setDate(date.getDate() + 1)) {
        const dailyDetail = {
          reservation_id: reservationId,
          stay_date: date.toISOString().split('T')[0],
          adults_present: reservation.adults,
          children_present: childrenIds,
          parking_spots_needed: reservation.parking_required ? 1 : 0,
          pets_present: reservation.has_pets || false,
          pet_count: reservation.pet_count || 0,
          towel_rentals: 0,
        };

        dailyDetails.push(dailyDetail);
      }

      // Insert into database
      const { data: insertedDetails, error: insertError } = await supabase
        .from('reservation_daily_details')
        .insert(dailyDetails)
        .select();

      if (insertError) throw insertError;

      return insertedDetails || dailyDetails;
    } catch (error) {
      console.error('Error creating initial daily details:', error);
      throw error;
    }
  }

  /**
   * Calculate pricing for a single day
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async calculateSingleDayPricing(reservation: any, dailyDetail: any): Promise<any> {
    try {
      const stayDate = new Date(dailyDetail.stay_date);
      const seasonalPeriod = this.getSeasonalPeriod(stayDate);
      const baseRate = await this.getRoomSeasonalRate(
        reservation.room_id,
        stayDate,
        reservation.pricing_tier_id
      );

      const isApartment = reservation.rooms?.number === '401';

      // Get children details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let childrenPresent: any[] = [];
      if (dailyDetail.children_present && dailyDetail.children_present.length > 0) {
        const { data: children } = await supabase
          .from('guest_children')
          .select('id, name, age')
          .in('id', dailyDetail.children_present);

        childrenPresent = children || [];
      }

      // Calculate base accommodation
      let baseAccommodation: number;
      if (isApartment) {
        baseAccommodation = baseRate;
      } else {
        baseAccommodation = baseRate * (dailyDetail.adults_present + childrenPresent.length);
      }

      // Calculate child discounts
      let childDiscounts = 0;
      if (!isApartment) {
        for (const child of childrenPresent) {
          if (child.age <= 3) {
            childDiscounts += baseRate * this.config.childDiscounts.age0to3;
          } else if (child.age <= 7) {
            childDiscounts += baseRate * this.config.childDiscounts.age3to7;
          } else if (child.age <= 14) {
            childDiscounts += baseRate * this.config.childDiscounts.age7to14;
          }
        }
      }

      const netAccommodation = baseAccommodation - childDiscounts;

      // Calculate service fees for this day
      const serviceFees = this.calculateDailyServiceFees(
        dailyDetail.adults_present,
        childrenPresent,
        dailyDetail.parking_spots_needed || 0,
        dailyDetail.pets_present || false,
        dailyDetail.towel_rentals || 0,
        isApartment,
        stayDate
      );

      return {
        date: new Date(dailyDetail.stay_date),
        occupancy: {
          adults: dailyDetail.adults_present,
          children: childrenPresent,
        },
        pricing: {
          seasonalPeriod,
          baseRate,
          baseAccommodation,
          childDiscounts,
          netAccommodation,
          serviceFees,
          dailyTotal: netAccommodation + serviceFees.total,
        },
        editable: true,
      };
    } catch (error) {
      console.error('Error calculating single day pricing:', error);
      throw error;
    }
  }

  /**
   * Calculate service fees for a single day
   */
  private calculateDailyServiceFees(
    adults: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: any[],
    parkingSpots: number,
    hasPets: boolean,
    towelRentals: number,
    isApartment: boolean,
    stayDate: Date
  ) {
    // Tourism tax
    const tourismTaxRate = this.getTourismTaxRate(stayDate);
    let tourism = adults * tourismTaxRate;
    tourism += children.filter((child) => child.age >= 12).length * tourismTaxRate;

    // Parking
    let parking = 0;
    if (parkingSpots > 0) {
      if (isApartment) {
        const extraSpaces = Math.max(0, parkingSpots - 3);
        parking = extraSpaces * this.config.serviceFees.parkingFeePerNight;
      } else {
        parking = parkingSpots * this.config.serviceFees.parkingFeePerNight;
      }
    }

    // Pets (per night — called once per day so no further multiplication)
    const pets = hasPets ? this.config.serviceFees.petFeePerNight : 0;

    // Towels
    const towels = towelRentals * this.config.serviceFees.towelRentalPerDay;

    return {
      parking,
      pets,
      towels,
      tourism,
      total: parking + pets + towels + tourism,
    };
  }

  /**
   * Update daily details
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async updateDailyDetails(reservationId: string, dailyDetails: any[]): Promise<any[]> {
    try {
      const updates = dailyDetails.map((detail) => ({
        reservation_id: reservationId,
        stay_date: detail.date.toISOString().split('T')[0],
        adults_present: detail.adultsPresent,
        children_present: detail.childrenPresent,
        parking_spots_needed: detail.parkingSpots,
        pets_present: detail.hasPets,
        towel_rentals: detail.towelRentals,
      }));

      const { data: updatedDetails, error } = await supabase
        .from('reservation_daily_details')
        .upsert(updates, { onConflict: 'reservation_id,stay_date' })
        .select();

      if (error) throw error;

      return updatedDetails || [];
    } catch (error) {
      console.error('Error updating daily details:', error);
      throw error;
    }
  }

  /**
   * Recalculate pricing for a specific day
   */
  private async recalculateDayPricing(reservationId: string, stayDate: Date): Promise<void> {
    try {
      // Get updated reservation and daily detail
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select(`*, rooms (*), pricing_tiers (*)`)
        .eq('id', reservationId)
        .single();

      if (reservationError) throw reservationError;

      const { data: dailyDetail, error: dailyError } = await supabase
        .from('reservation_daily_details')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('stay_date', stayDate.toISOString().split('T')[0])
        .single();

      if (dailyError) throw dailyError;

      // Calculate new pricing
      const pricingBreakdown = await this.calculateSingleDayPricing(reservation, dailyDetail);

      // Update pricing in database
      const { error: updateError } = await supabase
        .from('reservation_daily_details')
        .update({
          daily_base_accommodation: pricingBreakdown.pricing.baseAccommodation,
          daily_child_discounts: pricingBreakdown.pricing.childDiscounts,
          daily_service_fees: pricingBreakdown.pricing.serviceFees,
          daily_total: pricingBreakdown.pricing.dailyTotal,
        })
        .eq('id', dailyDetail.id);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error recalculating day pricing:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const unifiedPricingService = UnifiedPricingService.getInstance();
