/**
 * Unified Pricing Service - Single Source of Truth
 *
 * Generates ReservationCharge[] line items for reservation pricing.
 * Replaces the old flat-pricing model (reservation_daily_details dropped in Phase 1).
 *
 * Croatian Tax Compliance:
 * - Room rates already include 13% VAT (Croatian accommodation law since 2018)
 * - Tourism tax separate (EUR 1.10-1.60 per person per night)
 * - Service fees separate (parking, pets)
 */

import { supabase } from '../../supabase';
import {
  SeasonalPeriod,
  GuestChild,
  PricingCalculation,
  ReservationCharge,
  HOTEL_CONSTANTS,
} from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface PricingConfig {
  vatRate: number; // 0.13 for Croatia accommodation
  vatIncludedInRates: boolean; // true for Croatia
  tourismTaxRates: {
    high: number; // EUR 1.60 Apr-Sep
    low: number; // EUR 1.10 Oct-Mar
  };
  serviceFees: {
    petFeePerNight: number; // EUR 20.00
    parkingFeePerNight: number; // EUR 7.00
    towelRentalPerDay: number; // EUR 5.00
    shortStaySupplementRate: number; // 0.20 (20% for < 3 nights)
  };
  childDiscounts: {
    age0to3: number; // 1.0 = 100% discount (free)
    age3to7: number; // 0.5 = 50% discount
    age7to14: number; // 0.2 = 20% discount
  };
}

const DEFAULT_CONFIG: PricingConfig = {
  vatRate: 0.13,
  vatIncludedInRates: true,
  tourismTaxRates: { high: 1.6, low: 1.1 },
  serviceFees: {
    petFeePerNight: 20.0,
    parkingFeePerNight: 7.0,
    towelRentalPerDay: 5.0,
    shortStaySupplementRate: 0.2,
  },
  childDiscounts: {
    age0to3: 1.0,
    age3to7: 0.5,
    age7to14: 0.2,
  },
};

// ─── Params (kept for backward compat with calculateTotal / calculateReservationPricing) ─────

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

export interface VATBreakdown {
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface PricingResult {
  accommodation: {
    baseRate: number;
    numberOfNights: number;
    subtotal: number;
    childDiscounts: number;
    netAccommodation: number;
    vatIncluded: number;
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
    vatCompliant: boolean;
  };
}

// ─── generateCharges params ──────────────────────────────────────────────────

export interface GenerateChargesParams {
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: Array<{ name: string; type: 'adult' | 'child'; age?: number }>;
  hasPets: boolean;
  parkingRequired: boolean;
  pricingTierId?: string;
  guestId?: string; // for returning customer discount
}

/** A season block is a range of consecutive nights with the same season. */
interface SeasonBlock {
  season: SeasonalPeriod;
  startDate: Date;
  nights: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

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

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW — generateCharges()
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate ReservationCharge[] line items for a reservation.
   * This is the new single entry-point that replaces flat pricing fields.
   */
  async generateCharges(params: GenerateChargesParams): Promise<ReservationCharge[]> {
    const charges: Omit<ReservationCharge, 'id' | 'reservationId' | 'createdAt' | 'updatedAt'>[] =
      [];
    let sortOrder = 0;

    // ── Basics ─────────────────────────────────────────────────────────────
    const numberOfNights = Math.ceil(
      (params.checkOut.getTime() - params.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (numberOfNights <= 0) {
      throw new Error('Check-out date must be after check-in date');
    }

    // Detect room info
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*, room_types (*)')
      .eq('id', parseInt(params.roomId))
      .single();

    if (roomError) throw roomError;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roomTypeName: string = (room.room_types as any)?.name || '';
    const isApartment =
      room.room_number === '401' || roomTypeName.toLowerCase().includes('apartment');
    const roomName = `Room ${room.room_number}`;

    // ── Season blocks ──────────────────────────────────────────────────────
    const seasonBlocks = this.buildSeasonBlocks(params.checkIn, numberOfNights);

    // ── Company tier discount percentage ───────────────────────────────────
    let tierDiscountPct = 0;
    if (params.pricingTierId) {
      const { data: tierData, error: tierError } = await supabase
        .from('pricing_tiers')
        .select('discount_percentage')
        .eq('id', parseInt(params.pricingTierId))
        .single();

      if (!tierError && tierData) {
        tierDiscountPct = Number(tierData.discount_percentage) || 0;
      }
    }

    const adults = params.guests.filter((g) => g.type === 'adult');
    const children = params.guests.filter((g) => g.type === 'child');

    // ── Accommodation charges ──────────────────────────────────────────────
    let accommodationSubtotal = 0;

    for (const block of seasonBlocks) {
      const rate = await this.getRoomSeasonalRate(
        params.roomId,
        block.startDate,
        undefined // tier discount applied below as a multiplier
      );
      const discountMultiplier = tierDiscountPct > 0 ? 1 - tierDiscountPct / 100 : 1;

      if (isApartment) {
        // Apartment: one flat charge per season block
        const unitPrice = this.round(rate * discountMultiplier);
        const total = this.round(unitPrice * block.nights);
        accommodationSubtotal += total;
        charges.push({
          chargeType: 'accommodation',
          description: `${roomName} — Season ${block.season}`,
          quantity: block.nights,
          unitPrice,
          total,
          vatRate: HOTEL_CONSTANTS.VAT_RATE,
          sortOrder: sortOrder++,
        });
      } else {
        // Per-person pricing: one charge per guest per season block
        for (const guest of adults) {
          const unitPrice = this.round(rate * discountMultiplier);
          const total = this.round(unitPrice * block.nights);
          accommodationSubtotal += total;
          charges.push({
            chargeType: 'accommodation',
            description: `${roomName} — ${guest.name}, Season ${block.season}`,
            quantity: block.nights,
            unitPrice,
            total,
            vatRate: HOTEL_CONSTANTS.VAT_RATE,
            sortOrder: sortOrder++,
          });
        }

        for (const child of children) {
          const age = child.age ?? 0;
          // age 0-3: free (skip)
          if (age >= 0 && age < 3) continue;

          let childRate: number;
          if (age >= 3 && age < 7) {
            childRate = rate * 0.5;
          } else if (age >= 7 && age < 14) {
            childRate = rate * 0.8;
          } else {
            // 14+: full rate
            childRate = rate;
          }

          const unitPrice = this.round(childRate * discountMultiplier);
          const total = this.round(unitPrice * block.nights);
          accommodationSubtotal += total;
          charges.push({
            chargeType: 'accommodation',
            description: `${roomName} — ${child.name} (age ${age}), Season ${block.season}`,
            quantity: block.nights,
            unitPrice,
            total,
            vatRate: HOTEL_CONSTANTS.VAT_RATE,
            sortOrder: sortOrder++,
          });
        }
      }
    }

    // ── Tourism tax ────────────────────────────────────────────────────────
    // Group by tax period (high/low) across the stay
    const taxPeriods = this.buildTaxPeriods(params.checkIn, numberOfNights);

    // Count eligible persons
    const adultCount = adults.length;
    const eligibleChildCount = children.filter((c) => (c.age ?? 0) >= 12 && (c.age ?? 0) < 18);
    // Children 18+ are counted as adults already in the guests array or should pay full tax
    const fullRateChildren = children.filter((c) => (c.age ?? 0) >= 18);

    for (const period of taxPeriods) {
      const taxRate = period.isHigh
        ? this.config.tourismTaxRates.high
        : this.config.tourismTaxRates.low;
      const periodLabel = period.isHigh ? 'Apr-Sep' : 'Jan-Mar/Oct-Dec';

      // Adults: full rate
      if (adultCount > 0) {
        const quantity = period.nights * adultCount;
        const total = this.round(taxRate * quantity);
        charges.push({
          chargeType: 'tourism_tax',
          description: `Tourism tax (${periodLabel}) — ${adultCount} adult(s)`,
          quantity,
          unitPrice: taxRate,
          total,
          vatRate: 0,
          sortOrder: sortOrder++,
        });
      }

      // Children 12-17: 50% rate
      if (eligibleChildCount.length > 0) {
        const halfRate = this.round(taxRate * 0.5);
        const quantity = period.nights * eligibleChildCount.length;
        const total = this.round(halfRate * quantity);
        charges.push({
          chargeType: 'tourism_tax',
          description: `Tourism tax (${periodLabel}) — ${eligibleChildCount.length} child(ren) 12-17 at 50%`,
          quantity,
          unitPrice: halfRate,
          total,
          vatRate: 0,
          sortOrder: sortOrder++,
        });
      }

      // Children 18+: full rate (if any ended up as 'child' type)
      if (fullRateChildren.length > 0) {
        const quantity = period.nights * fullRateChildren.length;
        const total = this.round(taxRate * quantity);
        charges.push({
          chargeType: 'tourism_tax',
          description: `Tourism tax (${periodLabel}) — ${fullRateChildren.length} child(ren) 18+`,
          quantity,
          unitPrice: taxRate,
          total,
          vatRate: 0,
          sortOrder: sortOrder++,
        });
      }
    }

    // ── Parking ────────────────────────────────────────────────────────────
    if (params.parkingRequired) {
      const parkingRate = this.config.serviceFees.parkingFeePerNight;
      const total = this.round(parkingRate * numberOfNights);
      charges.push({
        chargeType: 'parking',
        description: 'Parking',
        quantity: numberOfNights,
        unitPrice: parkingRate,
        total,
        vatRate: HOTEL_CONSTANTS.VAT_RATE,
        sortOrder: sortOrder++,
      });
    }

    // ── Pet fee ────────────────────────────────────────────────────────────
    if (params.hasPets) {
      const petRate = this.config.serviceFees.petFeePerNight;
      const total = this.round(petRate * numberOfNights);
      charges.push({
        chargeType: 'pet_fee',
        description: 'Pet fee',
        quantity: numberOfNights,
        unitPrice: petRate,
        total,
        vatRate: HOTEL_CONSTANTS.VAT_RATE,
        sortOrder: sortOrder++,
      });
    }

    // ── Short stay supplement ──────────────────────────────────────────────
    if (numberOfNights < HOTEL_CONSTANTS.MIN_NIGHTS_NO_SUPPLEMENT) {
      const supplementAmount = this.round(
        accommodationSubtotal * this.config.serviceFees.shortStaySupplementRate
      );
      charges.push({
        chargeType: 'short_stay_supplement',
        description: `Short stay supplement (${numberOfNights} night${numberOfNights === 1 ? '' : 's'}, +20%)`,
        quantity: 1,
        unitPrice: supplementAmount,
        total: supplementAmount,
        vatRate: HOTEL_CONSTANTS.VAT_RATE,
        sortOrder: sortOrder++,
      });
    }

    // ── Returning customer discount ────────────────────────────────────────
    if (params.guestId) {
      try {
        const { data: stats, error: statsError } = await supabase
          .from('guest_stats')
          .select('total_reservations')
          .eq('guest_id', parseInt(params.guestId))
          .single();

        if (!statsError && stats && Number(stats.total_reservations) >= 2) {
          const discountAmount = this.round(accommodationSubtotal * 0.1);
          charges.push({
            chargeType: 'discount',
            description: 'Returning guest discount (10%)',
            quantity: 1,
            unitPrice: -discountAmount,
            total: -discountAmount,
            vatRate: HOTEL_CONSTANTS.VAT_RATE,
            sortOrder: sortOrder++,
          });
        }
      } catch {
        // guest_stats view may not exist yet — skip silently
        console.warn('Could not check guest_stats for returning customer discount');
      }
    }

    // Cast to full ReservationCharge with placeholder ids (caller will insert into DB)
    return charges.map((c) => ({
      ...c,
      id: 0, // placeholder — DB assigns real id on INSERT
      reservationId: 0, // placeholder — caller sets this
      createdAt: null,
      updatedAt: null,
    })) as ReservationCharge[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY — calculateReservationPricing / calculateTotal
  // Kept for backward compat during phased migration (Phases 4-8)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Main pricing calculation method - VAT compliant
   */
  async calculateReservationPricing(params: ReservationPricingParams): Promise<PricingResult> {
    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*, room_types (*)')
        .eq('id', parseInt(params.roomId))
        .single();

      if (roomError) throw roomError;

      const numberOfNights = Math.ceil(
        (params.checkOutDate.getTime() - params.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (numberOfNights <= 0) {
        throw new Error('Check-out date must be after check-in date');
      }

      const seasonalPeriod = this.getSeasonalPeriod(params.checkInDate);
      const baseRate = await this.getRoomSeasonalRate(
        params.roomId,
        params.checkInDate,
        params.pricingTierId
      );

      const isApartment = room.room_number === '401';

      const accommodation = this.calculateAccommodationCosts(
        baseRate,
        numberOfNights,
        params.adults,
        params.children,
        isApartment
      );

      const services = this.calculateServiceFees(
        params.adults,
        params.children,
        numberOfNights,
        params.checkInDate,
        params.services || {},
        isApartment
      );

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
   * @deprecated Use generateCharges() instead. Kept for backward compat during migration.
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS (public — used by other services)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get seasonal period for a date
   */
  public getSeasonalPeriod(date: Date): SeasonalPeriod {
    const month = date.getMonth() + 1;

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

    // April-September: EUR 1.60
    if (month >= 4 && month <= 9) {
      return this.config.tourismTaxRates.high;
    }

    // October-March: EUR 1.10
    return this.config.tourismTaxRates.low;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get room seasonal rate with pricing tier discount
   */
  private async getRoomSeasonalRate(
    roomId: string,
    stayDate: Date,
    pricingTierId?: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_room_price', {
        p_room_id: parseInt(roomId),
        p_date: stayDate.toISOString().split('T')[0],
      });

      if (error || !data || data.length === 0) {
        console.warn(`No seasonal rate found for room ${roomId} on ${stayDate}, using fallback`);
        return 100.0;
      }

      let finalRate: number = data[0].base_rate;

      if (pricingTierId) {
        const { data: tierData, error: tierError } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('id', parseInt(pricingTierId))
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

  /** VAT-compliant pricing calculation (no double charging) */
  private calculateVATCompliantPricing(baseAmount: number): VATBreakdown {
    const vatAmount = baseAmount * (this.config.vatRate / (1 + this.config.vatRate));
    return {
      baseAmount,
      vatAmount,
      totalAmount: baseAmount,
    };
  }

  /** Calculate accommodation costs with child discounts (legacy path) */
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
      subtotal = baseRate * numberOfNights;
    } else {
      const totalGuests = adults + children.length;
      subtotal = baseRate * totalGuests * numberOfNights;

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

  /** Calculate service fees (legacy path) */
  private calculateServiceFees(
    adults: number,
    children: GuestChild[],
    numberOfNights: number,
    checkInDate: Date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    services: any,
    _isApartment: boolean
  ) {
    const tourismTaxRate = this.getTourismTaxRate(checkInDate);
    let tourismTax = adults * tourismTaxRate * numberOfNights;

    for (const child of children) {
      if (child.age >= 12 && child.age < 18) {
        tourismTax += tourismTaxRate * 0.5 * numberOfNights;
      } else if (child.age >= 18) {
        tourismTax += tourismTaxRate * numberOfNights;
      }
    }

    let parkingFees = 0;
    if (services.parkingSpots && services.parkingSpots > 0) {
      parkingFees =
        services.parkingSpots * this.config.serviceFees.parkingFeePerNight * numberOfNights;
    }

    const petFees = services.hasPets ? this.config.serviceFees.petFeePerNight * numberOfNights : 0;

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
   * Build consecutive season blocks from a check-in date and number of nights.
   * E.g. 5 nights starting Jun 28 might yield: [{C, 2 nights}, {D, 3 nights}]
   */
  private buildSeasonBlocks(checkIn: Date, numberOfNights: number): SeasonBlock[] {
    const blocks: SeasonBlock[] = [];
    let currentDate = new Date(checkIn);
    let currentSeason = this.getSeasonalPeriod(currentDate);
    let blockStart = new Date(currentDate);
    let blockNights = 0;

    for (let i = 0; i < numberOfNights; i++) {
      const season = this.getSeasonalPeriod(currentDate);
      if (season !== currentSeason) {
        // Close previous block
        blocks.push({ season: currentSeason, startDate: blockStart, nights: blockNights });
        currentSeason = season;
        blockStart = new Date(currentDate);
        blockNights = 0;
      }
      blockNights++;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Close final block
    if (blockNights > 0) {
      blocks.push({ season: currentSeason, startDate: blockStart, nights: blockNights });
    }

    return blocks;
  }

  /**
   * Build tourism tax periods (high/low) across the stay.
   * Groups consecutive nights with the same tax rate.
   */
  private buildTaxPeriods(
    checkIn: Date,
    numberOfNights: number
  ): Array<{ isHigh: boolean; nights: number }> {
    const periods: Array<{ isHigh: boolean; nights: number }> = [];
    let currentDate = new Date(checkIn);

    for (let i = 0; i < numberOfNights; i++) {
      const month = currentDate.getMonth() + 1;
      const isHigh = month >= 4 && month <= 9;

      if (periods.length > 0 && periods[periods.length - 1].isHigh === isHigh) {
        periods[periods.length - 1].nights++;
      } else {
        periods.push({ isHigh, nights: 1 });
      }

      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return periods;
  }

  /** Round to 2 decimal places */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// Export singleton instance
export const unifiedPricingService = UnifiedPricingService.getInstance();
