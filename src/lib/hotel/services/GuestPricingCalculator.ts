/**
 * GuestPricingCalculator
 *
 * Pure calculation functions (no Supabase) for:
 * - Per-adult / per-child accommodation charge line items
 * - Apartment flat-rate charge line items
 * - Tourism tax line items (high/low season, child age brackets)
 * - Short-stay supplement
 * - Service fee line items (parking, pets)
 *
 * All functions take pre-fetched rates as inputs; callers supply Supabase data.
 */

import type { ReservationCharge } from '@/lib/hotel/types';
import { HOTEL_CONSTANTS } from '@/lib/hotel/types';
import type { SeasonBlock, TaxPeriod } from '@/lib/hotel/services/SeasonalRateService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuestEntry {
  name: string;
  type: 'adult' | 'child';
  age?: number;
}

export interface AccommodationChargeParams {
  roomName: string;
  isApartment: boolean;
  block: SeasonBlock;
  rate: number;
  discountMultiplier: number;
  guests: GuestEntry[];
  startingSortOrder: number;
}

export interface TourismTaxChargeParams {
  periods: TaxPeriod[];
  adults: GuestEntry[];
  children: GuestEntry[];
  highRate: number;
  lowRate: number;
  startingSortOrder: number;
}

export interface ServiceChargeParams {
  numberOfNights: number;
  parkingRequired: boolean;
  hasPets: boolean;
  parkingFeePerNight: number;
  petFeePerNight: number;
  startingSortOrder: number;
}

export interface ShortStaySupplementParams {
  numberOfNights: number;
  accommodationSubtotal: number;
  supplementRate: number; // e.g. 0.20
  minNightsNoSupplement: number;
  sortOrder: number;
}

/** A computed batch of charges and the next available sort-order index. */
export interface ChargesBatch {
  charges: Omit<ReservationCharge, 'id' | 'reservationId' | 'createdAt' | 'updatedAt'>[];
  nextSortOrder: number;
  /** For accommodation: the sum of all totals in this batch (used for supplement base). */
  subtotal: number;
}

// ─── Calculator (stateless, exported as a plain object for easy mocking) ──────

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Build accommodation charge line items for one season block.
 *
 * - Apartment: one flat charge for the block (guest-count agnostic)
 * - Per-person room: one charge per adult; children 0–2 are free (skipped),
 *   3–6 get 50%, 7–13 get 80%, 14+ get full rate.
 */
export function buildAccommodationCharges(params: AccommodationChargeParams): ChargesBatch {
  const { roomName, isApartment, block, rate, discountMultiplier, guests, startingSortOrder } =
    params;
  const charges: Omit<ReservationCharge, 'id' | 'reservationId' | 'createdAt' | 'updatedAt'>[] = [];
  let sortOrder = startingSortOrder;
  let subtotal = 0;

  const adults = guests.filter((g) => g.type === 'adult');
  const children = guests.filter((g) => g.type === 'child');

  if (isApartment) {
    const unitPrice = round(rate * discountMultiplier);
    const total = round(unitPrice * block.nights);
    subtotal += total;
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
    // Adults — full rate
    for (const guest of adults) {
      const unitPrice = round(rate * discountMultiplier);
      const total = round(unitPrice * block.nights);
      subtotal += total;
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

    // Children — age-based discounts
    for (const child of children) {
      const age = child.age ?? 0;
      if (age < 3) continue; // free — no charge

      let childRateMultiplier: number;
      if (age < 7) {
        childRateMultiplier = 0.5; // 50% discount
      } else if (age < 14) {
        childRateMultiplier = 0.8; // 20% discount
      } else {
        childRateMultiplier = 1.0; // full rate
      }

      const unitPrice = round(rate * childRateMultiplier * discountMultiplier);
      const total = round(unitPrice * block.nights);
      subtotal += total;
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

  return { charges, nextSortOrder: sortOrder, subtotal };
}

/**
 * Build tourism tax charge line items for all tax periods.
 *
 * Croatian sojourn tax rules:
 * - Adults: full rate
 * - Children 12–17: 50% rate
 * - Children 18+: full rate (rare — guests typed as 'child')
 * - Children under 12: exempt
 */
export function buildTourismTaxCharges(params: TourismTaxChargeParams): ChargesBatch {
  const { periods, adults, children, highRate, lowRate, startingSortOrder } = params;
  const charges: Omit<ReservationCharge, 'id' | 'reservationId' | 'createdAt' | 'updatedAt'>[] = [];
  let sortOrder = startingSortOrder;
  let subtotal = 0;

  const adultCount = adults.length;
  const children12to17 = children.filter((c) => {
    const age = c.age ?? 0;
    return age >= 12 && age < 18;
  });
  const children18plus = children.filter((c) => (c.age ?? 0) >= 18);

  for (const period of periods) {
    const taxRate = period.isHigh ? highRate : lowRate;
    const periodLabel = period.isHigh ? 'Apr-Sep' : 'Jan-Mar/Oct-Dec';

    // Adults: full rate
    if (adultCount > 0) {
      const quantity = period.nights * adultCount;
      const total = round(taxRate * quantity);
      subtotal += total;
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

    // Children 12–17: 50% rate
    if (children12to17.length > 0) {
      const halfRate = round(taxRate * 0.5);
      const quantity = period.nights * children12to17.length;
      const total = round(halfRate * quantity);
      subtotal += total;
      charges.push({
        chargeType: 'tourism_tax',
        description: `Tourism tax (${periodLabel}) — ${children12to17.length} child(ren) 12-17 at 50%`,
        quantity,
        unitPrice: halfRate,
        total,
        vatRate: 0,
        sortOrder: sortOrder++,
      });
    }

    // Children 18+: full rate
    if (children18plus.length > 0) {
      const quantity = period.nights * children18plus.length;
      const total = round(taxRate * quantity);
      subtotal += total;
      charges.push({
        chargeType: 'tourism_tax',
        description: `Tourism tax (${periodLabel}) — ${children18plus.length} child(ren) 18+`,
        quantity,
        unitPrice: taxRate,
        total,
        vatRate: 0,
        sortOrder: sortOrder++,
      });
    }
  }

  return { charges, nextSortOrder: sortOrder, subtotal };
}

/**
 * Build service fee line items (parking, pets).
 */
export function buildServiceCharges(params: ServiceChargeParams): ChargesBatch {
  const {
    numberOfNights,
    parkingRequired,
    hasPets,
    parkingFeePerNight,
    petFeePerNight,
    startingSortOrder,
  } = params;
  const charges: Omit<ReservationCharge, 'id' | 'reservationId' | 'createdAt' | 'updatedAt'>[] = [];
  let sortOrder = startingSortOrder;
  let subtotal = 0;

  if (parkingRequired) {
    const total = round(parkingFeePerNight * numberOfNights);
    subtotal += total;
    charges.push({
      chargeType: 'parking',
      description: 'Parking',
      quantity: numberOfNights,
      unitPrice: parkingFeePerNight,
      total,
      vatRate: HOTEL_CONSTANTS.VAT_RATE,
      sortOrder: sortOrder++,
    });
  }

  if (hasPets) {
    const total = round(petFeePerNight * numberOfNights);
    subtotal += total;
    charges.push({
      chargeType: 'pet_fee',
      description: 'Pet fee',
      quantity: numberOfNights,
      unitPrice: petFeePerNight,
      total,
      vatRate: HOTEL_CONSTANTS.VAT_RATE,
      sortOrder: sortOrder++,
    });
  }

  return { charges, nextSortOrder: sortOrder, subtotal };
}

/**
 * Build a short-stay supplement charge if applicable.
 * Returns null if numberOfNights >= minNightsNoSupplement.
 */
export function buildShortStaySupplement(
  params: ShortStaySupplementParams
): Omit<ReservationCharge, 'id' | 'reservationId' | 'createdAt' | 'updatedAt'> | null {
  const {
    numberOfNights,
    accommodationSubtotal,
    supplementRate,
    minNightsNoSupplement,
    sortOrder,
  } = params;

  if (numberOfNights >= minNightsNoSupplement) return null;

  const supplementAmount = round(accommodationSubtotal * supplementRate);
  return {
    chargeType: 'short_stay_supplement',
    description: `Short stay supplement (${numberOfNights} night${numberOfNights === 1 ? '' : 's'}, +20%)`,
    quantity: 1,
    unitPrice: supplementAmount,
    total: supplementAmount,
    vatRate: HOTEL_CONSTANTS.VAT_RATE,
    sortOrder,
  };
}
