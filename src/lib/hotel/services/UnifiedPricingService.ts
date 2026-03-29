/**
 * Unified Pricing Service — Thin Facade
 *
 * Single entry-point for reservation pricing. Orchestrates:
 *   1. SeasonalRateService  — season detection, Supabase rate lookups
 *   2. GuestPricingCalculator — pure charge-line calculations
 *
 * Croatian Tax Compliance:
 * - Room rates already include 13% VAT (Croatian accommodation law since 2018)
 * - Tourism tax is separate (EUR 1.10–1.60 per person per night)
 * - Service fees are separate (parking, pets)
 */

import { supabase } from '@/lib/supabase';
import type {
  SeasonalPeriod,
  GuestChild,
  PricingCalculation,
  ReservationCharge,
} from '@/lib/hotel/types';
import { HOTEL_CONSTANTS } from '@/lib/hotel/types';
import { seasonalRateService } from '@/lib/hotel/services/SeasonalRateService';
import {
  buildAccommodationCharges,
  buildTourismTaxCharges,
  buildServiceCharges,
  buildShortStaySupplement,
} from '@/lib/hotel/services/GuestPricingCalculator';

// ─── Configuration ────────────────────────────────────────────────────────────

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

// ─── Params ───────────────────────────────────────────────────────────────────

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

// ─── Service ──────────────────────────────────────────────────────────────────

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
  // PUBLIC API — generateCharges (new entry-point)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate ReservationCharge[] line items for a reservation.
   * Orchestrates SeasonalRateService + GuestPricingCalculator.
   */
  async generateCharges(params: GenerateChargesParams): Promise<ReservationCharge[]> {
    const numberOfNights = this.computeNights(params.checkIn, params.checkOut);

    // ── Room metadata ──────────────────────────────────────────────────────
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*, room_types (*)')
      .eq('id', parseInt(params.roomId))
      .single();

    if (roomError) throw roomError;

    const roomTypeName: string =
      (room.room_types as unknown as { name?: string } | null)?.name || '';
    const isApartment =
      room.room_number === '401' || roomTypeName.toLowerCase().includes('apartment');
    const roomName = `Room ${room.room_number}`;

    // ── Tier discount ──────────────────────────────────────────────────────
    let tierDiscountPct = 0;
    if (params.pricingTierId) {
      tierDiscountPct = await seasonalRateService.getTierDiscountPct(params.pricingTierId);
    }
    const discountMultiplier = tierDiscountPct > 0 ? 1 - tierDiscountPct / 100 : 1;

    const adults = params.guests.filter((g) => g.type === 'adult');
    const children = params.guests.filter((g) => g.type === 'child');

    // ── Accommodation charges (one batch per season block) ─────────────────
    const seasonBlocks = seasonalRateService.buildSeasonBlocks(params.checkIn, numberOfNights);
    const allCharges: Omit<
      ReservationCharge,
      'id' | 'reservationId' | 'createdAt' | 'updatedAt'
    >[] = [];
    let sortOrder = 0;
    let accommodationSubtotal = 0;

    for (const block of seasonBlocks) {
      const rate = await seasonalRateService.getRoomSeasonalRate(
        params.roomId,
        block.startDate,
        undefined // tier discount applied via discountMultiplier below
      );

      const batch = buildAccommodationCharges({
        roomName,
        isApartment,
        block,
        rate,
        discountMultiplier,
        guests: params.guests,
        startingSortOrder: sortOrder,
      });

      allCharges.push(...batch.charges);
      sortOrder = batch.nextSortOrder;
      accommodationSubtotal += batch.subtotal;
    }

    // ── Tourism tax ────────────────────────────────────────────────────────
    const taxPeriods = seasonalRateService.buildTaxPeriods(params.checkIn, numberOfNights);
    const taxBatch = buildTourismTaxCharges({
      periods: taxPeriods,
      adults,
      children,
      highRate: this.config.tourismTaxRates.high,
      lowRate: this.config.tourismTaxRates.low,
      startingSortOrder: sortOrder,
    });
    allCharges.push(...taxBatch.charges);
    sortOrder = taxBatch.nextSortOrder;

    // ── Service fees (parking, pets) ───────────────────────────────────────
    const serviceBatch = buildServiceCharges({
      numberOfNights,
      parkingRequired: params.parkingRequired,
      hasPets: params.hasPets,
      parkingFeePerNight: this.config.serviceFees.parkingFeePerNight,
      petFeePerNight: this.config.serviceFees.petFeePerNight,
      startingSortOrder: sortOrder,
    });
    allCharges.push(...serviceBatch.charges);
    sortOrder = serviceBatch.nextSortOrder;

    // ── Short-stay supplement ──────────────────────────────────────────────
    const supplement = buildShortStaySupplement({
      numberOfNights,
      accommodationSubtotal,
      supplementRate: this.config.serviceFees.shortStaySupplementRate,
      minNightsNoSupplement: HOTEL_CONSTANTS.MIN_NIGHTS_NO_SUPPLEMENT,
      sortOrder: sortOrder++,
    });
    if (supplement) {
      allCharges.push(supplement);
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
          const discountAmount = Math.round(accommodationSubtotal * 0.1 * 100) / 100;
          allCharges.push({
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
        console.warn('Could not check guest_stats for returning customer discount');
      }
    }

    // Stamp placeholder IDs — DB assigns real IDs on INSERT
    return allCharges.map((c) => ({
      ...c,
      id: 0,
      reservationId: 0,
      createdAt: null,
      updatedAt: null,
    })) as ReservationCharge[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY — calculateReservationPricing / calculateTotal
  // Kept for backward compat during phased migration (Phases 4-8)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Main pricing calculation method - VAT compliant */
  async calculateReservationPricing(params: ReservationPricingParams): Promise<PricingResult> {
    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*, room_types (*)')
        .eq('id', parseInt(params.roomId))
        .single();

      if (roomError) throw roomError;

      const numberOfNights = this.computeNights(params.checkInDate, params.checkOutDate);
      const seasonalPeriod = seasonalRateService.getSeasonalPeriod(params.checkInDate);
      const baseRate = await seasonalRateService.getRoomSeasonalRate(
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
  // PUBLIC HELPERS (used by other services, e.g. eracuniService)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Delegates to SeasonalRateService — kept for backward compat. */
  public getSeasonalPeriod(date: Date): SeasonalPeriod {
    return seasonalRateService.getSeasonalPeriod(date);
  }

  /** Returns the tourism tax rate for a date. */
  public getTourismTaxRate(date: Date): number {
    return seasonalRateService.isHighTaxSeason(date)
      ? this.config.tourismTaxRates.high
      : this.config.tourismTaxRates.low;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private computeNights(from: Date, to: Date): number {
    const nights = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) throw new Error('Check-out date must be after check-in date');
    return nights;
  }

  /** VAT-compliant breakdown (VAT included in price, not added on top). */
  private calculateVATCompliantPricing(baseAmount: number): VATBreakdown {
    const vatAmount = baseAmount * (this.config.vatRate / (1 + this.config.vatRate));
    return { baseAmount, vatAmount, totalAmount: baseAmount };
  }

  /** Legacy accommodation cost calculation used by calculateReservationPricing. */
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

    return { baseRate, numberOfNights, subtotal, childDiscounts, netAccommodation, vatIncluded };
  }

  /** Legacy service fee calculation used by calculateReservationPricing. */
  private calculateServiceFees(
    adults: number,
    children: GuestChild[],
    numberOfNights: number,
    checkInDate: Date,
    services: { parkingSpots?: number; hasPets?: boolean; towelRentals?: number },
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
}

// Export singleton instance
export const unifiedPricingService = UnifiedPricingService.getInstance();
