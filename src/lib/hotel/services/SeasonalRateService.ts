/**
 * SeasonalRateService
 *
 * Responsible for:
 * - Season/period detection by date
 * - Building consecutive season blocks for a stay
 * - Building tourism-tax periods (high/low) for a stay
 * - Fetching room rates from Supabase (get_room_price RPC + pricing_tier discount)
 */

import { supabase } from '@/lib/supabase';
import type { SeasonalPeriod } from '@/lib/hotel/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A consecutive block of nights sharing the same seasonal pricing period. */
export interface SeasonBlock {
  season: SeasonalPeriod;
  /** The first date of this block (used for the rate RPC call). */
  startDate: Date;
  nights: number;
}

/** A consecutive block of nights sharing the same tourism-tax band. */
export interface TaxPeriod {
  /** true = Apr–Sep (EUR 1.60), false = Oct–Mar (EUR 1.10) */
  isHigh: boolean;
  nights: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class SeasonalRateService {
  // ── Season detection ────────────────────────────────────────────────────────

  /**
   * Returns the season code (A/B/C/D) for a given date.
   *
   * A: Jan–Apr + Dec  (low winter/shoulder)
   * B: May + Oct–Nov  (shoulder)
   * C: Jun + Sep      (early/late summer)
   * D: Jul–Aug        (peak summer)
   */
  getSeasonalPeriod(date: Date): SeasonalPeriod {
    const month = date.getMonth() + 1;

    if (month <= 4 || month === 12) return 'A';
    if (month === 5 || month >= 10) return 'B';
    if (month === 6 || month === 9) return 'C';
    if (month >= 7 && month <= 8) return 'D';

    return 'A';
  }

  /**
   * Returns whether a date falls in the high tourism-tax band (Apr–Sep).
   * High = EUR 1.60/person/night; Low = EUR 1.10/person/night.
   */
  isHighTaxSeason(date: Date): boolean {
    const month = date.getMonth() + 1;
    return month >= 4 && month <= 9;
  }

  // ── Block builders ──────────────────────────────────────────────────────────

  /**
   * Splits a stay into consecutive SeasonBlock entries.
   * E.g. 5 nights starting Jun 28 → [{C, Jun 28, 2 nights}, {D, Jul 1, 3 nights}]
   */
  buildSeasonBlocks(checkIn: Date, numberOfNights: number): SeasonBlock[] {
    const blocks: SeasonBlock[] = [];
    let currentDate = new Date(checkIn);
    let currentSeason = this.getSeasonalPeriod(currentDate);
    let blockStart = new Date(currentDate);
    let blockNights = 0;

    for (let i = 0; i < numberOfNights; i++) {
      const season = this.getSeasonalPeriod(currentDate);

      if (season !== currentSeason) {
        blocks.push({ season: currentSeason, startDate: blockStart, nights: blockNights });
        currentSeason = season;
        blockStart = new Date(currentDate);
        blockNights = 0;
      }

      blockNights++;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (blockNights > 0) {
      blocks.push({ season: currentSeason, startDate: blockStart, nights: blockNights });
    }

    return blocks;
  }

  /**
   * Groups a stay's nights into high/low tourism-tax bands.
   * E.g. 4 nights Sep 28 → [{high: true, 3 nights}, {high: false, 1 night}]
   */
  buildTaxPeriods(checkIn: Date, numberOfNights: number): TaxPeriod[] {
    const periods: TaxPeriod[] = [];
    let currentDate = new Date(checkIn);

    for (let i = 0; i < numberOfNights; i++) {
      const isHigh = this.isHighTaxSeason(currentDate);

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

  // ── Supabase rate lookup ─────────────────────────────────────────────────────

  /**
   * Fetches the base nightly rate for a room on a given date via the
   * `get_room_price` RPC, then optionally applies a pricing-tier percentage
   * discount (looked up from `pricing_tiers`).
   *
   * Falls back to EUR 100 if no rate is configured.
   */
  async getRoomSeasonalRate(
    roomId: string,
    stayDate: Date,
    pricingTierId?: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_room_price', {
        p_room_id: parseInt(roomId),
        p_date: stayDate.toISOString().split('T')[0],
      });

      if (error || !data || data.length === 0 || data[0].base_rate == null) {
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
    } catch (err) {
      console.error('Error getting room seasonal rate:', err);
      return 100.0;
    }
  }

  /**
   * Fetches the tier discount percentage (0–100) for a pricing tier ID.
   * Returns 0 if no tier or no discount is configured.
   */
  async getTierDiscountPct(pricingTierId: string): Promise<number> {
    const { data: tierData, error: tierError } = await supabase
      .from('pricing_tiers')
      .select('discount_percentage')
      .eq('id', parseInt(pricingTierId))
      .single();

    if (!tierError && tierData) {
      return Number(tierData.discount_percentage) || 0;
    }

    return 0;
  }
}

export const seasonalRateService = new SeasonalRateService();
