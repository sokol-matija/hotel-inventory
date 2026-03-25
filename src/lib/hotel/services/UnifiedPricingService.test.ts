/**
 * UnifiedPricingService tests
 *
 * Tests the per-person, per-season charge model (generateCharges) and
 * season detection (getSeasonalPeriod).
 *
 * NOTE: Season detection is month-based (not exact spec dates).
 *   A: Jan–Apr + Dec   B: May + Oct–Nov   C: Jun + Sep   D: Jul–Aug
 *
 * All dates use UTC noon (T12:00:00Z) to avoid timezone ambiguity
 * with Date.toISOString() used in the RPC call.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedPricingService } from './UnifiedPricingService';

// ─── Mutable mock state (vi.hoisted so it's available inside vi.mock) ─────────

const mocks = vi.hoisted(() => ({
  roomData: null as Record<string, unknown> | null,
  pricingTierData: null as Record<string, unknown> | null,
  guestStatsData: null as Record<string, unknown> | null,
  /** Date string → base_rate for get_room_price RPC. Unset keys fall back to 69. */
  rpcRateByDate: {} as Record<string, number>,
}));

vi.mock('@/lib/supabase', () => {
  /** Builds a chainable Supabase query builder that resolves via .single() */
  function makeChain(getResult: () => { data: unknown; error: unknown }) {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        if (prop === 'single') return () => Promise.resolve(getResult());
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'rooms') return makeChain(() => ({ data: mocks.roomData, error: null }));
        if (table === 'pricing_tiers')
          return makeChain(() => ({ data: mocks.pricingTierData, error: null }));
        if (table === 'guest_stats')
          return makeChain(() => ({ data: mocks.guestStatsData, error: null }));
        return makeChain(() => ({ data: null, error: null }));
      }),
      rpc: vi.fn((_name: string, params: { p_date?: string }) => {
        const rate = mocks.rpcRateByDate[params?.p_date ?? ''] ?? 69;
        return Promise.resolve({ data: [{ base_rate: rate, season_code: 'x' }], error: null });
      }),
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** UTC noon date — avoids toISOString() timezone drift */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function defaultDoubleRoom() {
  return { room_number: '101', room_types: { name: 'Double Room' } };
}

function defaultApartment() {
  return { room_number: '401', room_types: { name: 'Apartment' } };
}

const svc = () => UnifiedPricingService.getInstance();

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UnifiedPricingService', () => {
  // ── getSeasonalPeriod ────────────────────────────────────────────────────────

  describe('getSeasonalPeriod', () => {
    it.each([
      [1, 'A', 'January'],
      [2, 'A', 'February'],
      [3, 'A', 'March'],
      [4, 'A', 'April'],
      [5, 'B', 'May'],
      [6, 'C', 'June'],
      [7, 'D', 'July'],
      [8, 'D', 'August'],
      [9, 'C', 'September'],
      [10, 'B', 'October'],
      [11, 'B', 'November'],
      [12, 'A', 'December'],
    ])('month %i (%s) → Season %s', (month, expected) => {
      const date = utcDate(2026, month, 15);
      expect(svc().getSeasonalPeriod(date)).toBe(expected);
    });
  });

  // ── generateCharges ──────────────────────────────────────────────────────────

  describe('generateCharges', () => {
    beforeEach(() => {
      mocks.roomData = defaultDoubleRoom();
      mocks.pricingTierData = null;
      mocks.guestStatsData = null;
      mocks.rpcRateByDate = {};
    });

    afterEach(() => vi.clearAllMocks());

    // ── Error handling ─────────────────────────────────────────────────────────

    it('throws when check-out is not after check-in', async () => {
      await expect(
        svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 18),
          checkOut: utcDate(2026, 6, 15),
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        })
      ).rejects.toThrow('Check-out date must be after check-in date');
    });

    // ── Season-crossing stay: C → D (June 28 → July 5, 7 nights) ───────────────
    // 3 nights in Season C (June), 4 nights in Season D (July)

    describe('season-crossing stay (C → D, Jun 28 – Jul 5)', () => {
      const checkIn = utcDate(2026, 6, 28);
      const checkOut = utcDate(2026, 7, 5);

      beforeEach(() => {
        // C block startDate: Jun 28 → D block startDate: Jul 1
        mocks.rpcRateByDate = {
          '2026-06-28': 69, // Season C rate for Double Room
          '2026-07-01': 90, // Season D rate for Double Room
        };
      });

      it('creates one accommodation line per guest per season block (2 guests × 2 seasons = 4 lines)', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Ivan', type: 'adult' },
            { name: 'Marija', type: 'adult' },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const acc = charges.filter((c) => c.chargeType === 'accommodation');
        expect(acc).toHaveLength(4);
      });

      it('Season C block: 3 nights × rate 69 per guest', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Ivan', type: 'adult' },
            { name: 'Marija', type: 'adult' },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const seasonC = charges.filter(
          (c) => c.chargeType === 'accommodation' && c.description.includes('Season C')
        );
        expect(seasonC).toHaveLength(2);
        seasonC.forEach((c) => {
          expect(c.quantity).toBe(3);
          expect(c.unitPrice).toBe(69);
          expect(c.total).toBe(207);
        });
      });

      it('Season D block: 4 nights × rate 90 per guest', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Ivan', type: 'adult' },
            { name: 'Marija', type: 'adult' },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const seasonD = charges.filter(
          (c) => c.chargeType === 'accommodation' && c.description.includes('Season D')
        );
        expect(seasonD).toHaveLength(2);
        seasonD.forEach((c) => {
          expect(c.quantity).toBe(4);
          expect(c.unitPrice).toBe(90);
          expect(c.total).toBe(360);
        });
      });

      it('includes guest name in accommodation description', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [{ name: 'Ivan', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        const acc = charges.find((c) => c.chargeType === 'accommodation');
        expect(acc?.description).toContain('Ivan');
      });

      it('tourism tax: 1 line for all-high-season stay (2 adults × 7 nights at €1.60)', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Ivan', type: 'adult' },
            { name: 'Marija', type: 'adult' },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const tax = charges.filter((c) => c.chargeType === 'tourism_tax');
        expect(tax).toHaveLength(1);
        expect(tax[0].quantity).toBe(14); // 7 nights × 2 adults
        expect(tax[0].unitPrice).toBe(1.6);
        expect(tax[0].total).toBe(22.4);
      });

      it('charges are ordered (accommodation first, then tax)', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [{ name: 'Ivan', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        const accOrder = charges.find((c) => c.chargeType === 'accommodation')!.sortOrder!;
        const taxOrder = charges.find((c) => c.chargeType === 'tourism_tax')!.sortOrder!;
        expect(accOrder).toBeLessThan(taxOrder);
      });
    });

    // ── Child discounts ────────────────────────────────────────────────────────
    // Jun 15 → Jun 18: 3 nights, all Season C

    describe('child discounts', () => {
      const checkIn = utcDate(2026, 6, 15);
      const checkOut = utcDate(2026, 6, 18);

      beforeEach(() => {
        mocks.rpcRateByDate = { '2026-06-15': 69 };
      });

      it('child age 0–2: free — no accommodation line created', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Adult', type: 'adult' },
            { name: 'Baby', type: 'child', age: 2 },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const childCharge = charges.find(
          (c) => c.chargeType === 'accommodation' && c.description.includes('Baby')
        );
        expect(childCharge).toBeUndefined();
      });

      it('child age 3–6: 50% discount on unit price', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Adult', type: 'adult' },
            { name: 'Ana', type: 'child', age: 5 },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const childCharge = charges.find(
          (c) => c.chargeType === 'accommodation' && c.description.includes('Ana')
        );
        expect(childCharge).toBeDefined();
        expect(childCharge!.unitPrice).toBe(34.5); // 69 × 0.5
        expect(childCharge!.total).toBe(103.5);
        expect(childCharge!.description).toContain('age 5');
      });

      it('child age 7–13: 20% discount (80% of rate)', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Adult', type: 'adult' },
            { name: 'Luka', type: 'child', age: 10 },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const childCharge = charges.find(
          (c) => c.chargeType === 'accommodation' && c.description.includes('Luka')
        );
        expect(childCharge).toBeDefined();
        expect(childCharge!.unitPrice).toBe(55.2); // 69 × 0.8
        expect(childCharge!.total).toBe(165.6);
      });

      it('child age 14+: full rate (no discount)', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Adult', type: 'adult' },
            { name: 'Teen', type: 'child', age: 14 },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const childCharge = charges.find(
          (c) => c.chargeType === 'accommodation' && c.description.includes('Teen')
        );
        expect(childCharge?.unitPrice).toBe(69); // full rate
      });

      it('children under 12 are exempt from tourism tax', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Adult', type: 'adult' },
            { name: 'Child', type: 'child', age: 5 },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const tax = charges.find((c) => c.chargeType === 'tourism_tax');
        // Only 1 adult charged; child age 5 is exempt
        expect(tax?.quantity).toBe(3); // 3 nights × 1 adult
        expect(tax?.total).toBeCloseTo(4.8);
      });

      it('children age 12–17 pay 50% tourism tax', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [
            { name: 'Adult', type: 'adult' },
            { name: 'Teen', type: 'child', age: 15 },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const taxLines = charges.filter((c) => c.chargeType === 'tourism_tax');
        const reducedTax = taxLines.find((c) => c.description.includes('50%'));
        expect(reducedTax).toBeDefined();
        expect(reducedTax!.unitPrice).toBe(0.8); // 1.60 × 0.5
      });
    });

    // ── Apartment 401: flat rate per stay ──────────────────────────────────────
    // Aug 1 → Aug 6: 5 nights, all Season D

    describe('apartment flat rate', () => {
      beforeEach(() => {
        mocks.roomData = defaultApartment();
        mocks.rpcRateByDate = { '2026-08-01': 460 };
      });

      it('generates a single accommodation line regardless of guest count', async () => {
        const charges = await svc().generateCharges({
          roomId: '5',
          checkIn: utcDate(2026, 8, 1),
          checkOut: utcDate(2026, 8, 6),
          guests: [
            { name: 'Ivan', type: 'adult' },
            { name: 'Marija', type: 'adult' },
            { name: 'Ana', type: 'adult' },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const acc = charges.filter((c) => c.chargeType === 'accommodation');
        expect(acc).toHaveLength(1);
        expect(acc[0].quantity).toBe(5);
        expect(acc[0].unitPrice).toBe(460);
        expect(acc[0].total).toBe(2300);
      });

      it('apartment description includes season but not guest names', async () => {
        const charges = await svc().generateCharges({
          roomId: '5',
          checkIn: utcDate(2026, 8, 1),
          checkOut: utcDate(2026, 8, 6),
          guests: [{ name: 'Ivan', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        const acc = charges.find((c) => c.chargeType === 'accommodation');
        expect(acc?.description).toContain('Season D');
        expect(acc?.description).not.toContain('Ivan');
      });

      it('still calculates per-person tourism tax for apartment guests', async () => {
        const charges = await svc().generateCharges({
          roomId: '5',
          checkIn: utcDate(2026, 8, 1),
          checkOut: utcDate(2026, 8, 6),
          guests: [
            { name: 'Ivan', type: 'adult' },
            { name: 'Marija', type: 'adult' },
          ],
          hasPets: false,
          parkingRequired: false,
        });

        const tax = charges.find((c) => c.chargeType === 'tourism_tax');
        expect(tax?.quantity).toBe(10); // 5 nights × 2 adults
        expect(tax?.total).toBe(16); // 10 × €1.60 (Aug = high season)
      });
    });

    // ── Tourism tax split across high/low season ───────────────────────────────
    // Sep 28 → Oct 2: 4 nights — 3 in Sep (high €1.60), 1 in Oct (low €1.10)

    describe('tourism tax split across high/low season (Sep → Oct)', () => {
      beforeEach(() => {
        // Sep=C, Oct=B — rate doesn't matter for this test, default 69 is fine
        mocks.rpcRateByDate = {
          '2026-09-28': 69,
          '2026-10-01': 57, // Season B rate
        };
      });

      it('creates two tourism tax lines when stay spans Apr-Sep and Oct-Mar', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 9, 28),
          checkOut: utcDate(2026, 10, 2), // 4 nights: Sep 28,29,30 (high) + Oct 1 (low)
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        const tax = charges.filter((c) => c.chargeType === 'tourism_tax');
        expect(tax).toHaveLength(2);

        const highTax = tax.find((c) => c.description.includes('Apr-Sep'));
        const lowTax = tax.find((c) => c.description.includes('Jan-Mar'));

        expect(highTax).toBeDefined();
        expect(highTax!.quantity).toBe(3); // 3 Sep nights × 1 adult
        expect(highTax!.unitPrice).toBe(1.6);
        expect(highTax!.total).toBeCloseTo(4.8);

        expect(lowTax).toBeDefined();
        expect(lowTax!.quantity).toBe(1); // 1 Oct night × 1 adult
        expect(lowTax!.unitPrice).toBe(1.1);
        expect(lowTax!.total).toBeCloseTo(1.1);
      });
    });

    // ── Short stay supplement ──────────────────────────────────────────────────

    describe('short stay supplement (<3 nights = +20%)', () => {
      beforeEach(() => {
        mocks.rpcRateByDate = { '2026-06-15': 69 };
      });

      it('adds 20% supplement for a 2-night stay', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 17), // 2 nights
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        const supplement = charges.find((c) => c.chargeType === 'short_stay_supplement');
        expect(supplement).toBeDefined();
        // accommodation: 69 × 2 = 138; supplement: 138 × 0.20 = 27.6
        expect(supplement!.total).toBe(27.6);
        expect(supplement!.description).toContain('2 night');
      });

      it('does not add supplement for a 3-night stay (boundary)', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 18), // 3 nights
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        expect(charges.find((c) => c.chargeType === 'short_stay_supplement')).toBeUndefined();
      });
    });

    // ── Parking and pets ───────────────────────────────────────────────────────

    describe('parking and pet fees', () => {
      const checkIn = utcDate(2026, 6, 15);
      const checkOut = utcDate(2026, 6, 22); // 7 nights

      beforeEach(() => {
        mocks.rpcRateByDate = { '2026-06-15': 69 };
      });

      it('adds parking charge: 7 nights × €7.00', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: true,
        });

        const parking = charges.find((c) => c.chargeType === 'parking');
        expect(parking).toBeDefined();
        expect(parking!.quantity).toBe(7);
        expect(parking!.unitPrice).toBe(7);
        expect(parking!.total).toBe(49);
      });

      it('adds pet fee: 7 nights × €20.00', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: true,
          parkingRequired: false,
        });

        const pets = charges.find((c) => c.chargeType === 'pet_fee');
        expect(pets).toBeDefined();
        expect(pets!.quantity).toBe(7);
        expect(pets!.unitPrice).toBe(20);
        expect(pets!.total).toBe(140);
      });

      it('does not add parking when not required', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        expect(charges.find((c) => c.chargeType === 'parking')).toBeUndefined();
      });

      it('does not add pet fee when no pets', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn,
          checkOut,
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        expect(charges.find((c) => c.chargeType === 'pet_fee')).toBeUndefined();
      });
    });

    // ── Company tier discount ─────────────────────────────────────────────────

    describe('company tier discount', () => {
      beforeEach(() => {
        mocks.pricingTierData = { discount_percentage: 10 }; // 10% off
        mocks.rpcRateByDate = { '2026-06-15': 69 };
      });

      it('applies tier discount as multiplier to accommodation unit price', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 18), // 3 nights
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
          pricingTierId: '5',
        });

        const acc = charges.find((c) => c.chargeType === 'accommodation');
        expect(acc?.unitPrice).toBe(62.1); // 69 × 0.9
        expect(acc?.total).toBe(186.3); // 62.1 × 3
      });

      it('does not apply discount when pricingTierId is not provided', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 18),
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        const acc = charges.find((c) => c.chargeType === 'accommodation');
        expect(acc?.unitPrice).toBe(69); // no discount
      });
    });

    // ── Returning customer discount ────────────────────────────────────────────

    describe('returning customer discount', () => {
      beforeEach(() => {
        // 3 nights, 1 adult, rate 100 → accommodation = 300
        mocks.rpcRateByDate = { '2026-06-15': 100 };
      });

      it('adds a negative 10% discount line for guest with ≥2 prior stays', async () => {
        mocks.guestStatsData = { total_reservations: 3 };

        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 18), // 3 nights → acc = 300
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
          guestId: '42',
        });

        const discount = charges.find((c) => c.chargeType === 'discount');
        expect(discount).toBeDefined();
        expect(discount!.total).toBe(-30); // -10% of 300
        expect(discount!.unitPrice).toBe(-30);
        expect(discount!.description).toContain('10%');
      });

      it('no discount for first-time guest (1 reservation)', async () => {
        mocks.guestStatsData = { total_reservations: 1 };

        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 18),
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
          guestId: '42',
        });

        expect(charges.find((c) => c.chargeType === 'discount')).toBeUndefined();
      });

      it('no discount when guestId is not provided', async () => {
        mocks.guestStatsData = { total_reservations: 5 };

        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 18),
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
          // no guestId
        });

        expect(charges.find((c) => c.chargeType === 'discount')).toBeUndefined();
      });
    });

    // ── Charge shape ───────────────────────────────────────────────────────────

    describe('charge shape', () => {
      beforeEach(() => {
        mocks.rpcRateByDate = { '2026-06-15': 69 };
      });

      it('all charges have sortOrder assigned in sequence starting at 0', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 20), // 5 nights
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: true,
          parkingRequired: true,
        });

        const orders = charges.map((c) => c.sortOrder!);
        expect(orders[0]).toBe(0);
        // Monotonically increasing
        for (let i = 1; i < orders.length; i++) {
          expect(orders[i]).toBeGreaterThan(orders[i - 1]);
        }
      });

      it('accommodation charges have VAT rate 0.13', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 18),
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        const acc = charges.find((c) => c.chargeType === 'accommodation');
        expect(acc?.vatRate).toBe(0.13);
      });

      it('tourism tax charges have VAT rate 0 (not subject to accommodation VAT)', async () => {
        const charges = await svc().generateCharges({
          roomId: '1',
          checkIn: utcDate(2026, 6, 15),
          checkOut: utcDate(2026, 6, 18),
          guests: [{ name: 'Guest', type: 'adult' }],
          hasPets: false,
          parkingRequired: false,
        });

        const tax = charges.find((c) => c.chargeType === 'tourism_tax');
        expect(tax?.vatRate).toBe(0);
      });
    });
  });
});
