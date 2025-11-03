# Database Refactoring Implementation Guide

**Project**: Hotel Inventory Management System
**Status**: ✅ **SCHEMA COMPLETE** - Ready for backend integration
**Date**: October 30, 2025

---

## Executive Summary

We've successfully refactored your database from a monolithic 50-column `reservations` table into a clean, scalable architecture that supports:

✅ **4 guests per room** with independent pricing
✅ **Different check-in/checkout times** per guest
✅ **Flexible pricing models** (per-guest, occupancy-based, discounts)
✅ **Daily occupancy tracking** for detailed billing
✅ **OTA integration** isolated from core booking data
✅ **Complete audit trail** with JSONB change tracking

---

## What Was Created

### New Tables (4)

| Table | Purpose | Key Feature |
|-------|---------|------------|
| `guest_stay_pricing` | Per-guest pricing | Different rates for each guest |
| `reservation_pricing_calculation` | Aggregated pricing | Total reservation cost |
| `guest_occupancy_nights` | Daily breakdown | Rates change based on occupancy |
| `reservation_sync` | OTA integration | Moved from bloated reservations |

### New Views (5)

| View | Purpose |
|------|---------|
| `reservations_with_pricing` | Complete booking + pricing (backward compat) |
| `reservation_pricing_summary` | Financial reporting |
| `guest_pricing_detail` | Per-guest breakdown |
| `reservation_occupancy_summary` | Daily occupancy tracking |
| `ota_sync_status` | OTA health monitoring |

---

## How to Use This Schema

### 1. Creating a Multi-Guest Reservation

```typescript
// Step 1: Create the reservation
const reservation = await db.reservations.insert({
  guest_id: 123,        // Primary guest
  room_id: 101,
  check_in_date: '2025-01-15',
  check_out_date: '2025-01-20',
  number_of_guests: 3,
  adults: 2,
  children_count: 1,
  status: 'confirmed'
});
// ID: 999

// Step 2: Create guest stays (one per guest)
const guestA = await db.guest_stays.insert({
  reservation_id: 999,
  guest_id: 123,
  check_in: '2025-01-15T14:00:00Z',
  check_out: '2025-01-20T11:00:00Z'
});

const guestB = await db.guest_stays.insert({
  reservation_id: 999,
  guest_id: 124,
  check_in: '2025-01-15T14:00:00Z',
  check_out: '2025-01-20T11:00:00Z'
});

const guestC = await db.guest_stays.insert({
  reservation_id: 999,
  guest_id: 125,
  check_in: '2025-01-15T14:00:00Z',
  check_out: '2025-01-20T11:00:00Z'
});

// Step 3: Calculate pricing for each guest
const pricingA = await db.guest_stay_pricing.insert({
  guest_stay_id: guestA.id,
  guest_id: 123,
  reservation_id: 999,
  room_id: 101,
  check_in_date: '2025-01-15',
  check_out_date: '2025-01-20',
  guest_type: 'adult',
  is_primary_guest: true,
  base_rate_per_night: 100.00,
  nightly_rate: 100.00,
  subtotal: 500.00,  // 5 nights × €100
  total_amount: 625.00  // with VAT
});

// ... repeat for guests B and C ...

// Step 4: Create daily occupancy records
for (let date = new Date('2025-01-15'); date < new Date('2025-01-20'); date.setDate(date.getDate() + 1)) {
  await db.guest_occupancy_nights.insert({
    reservation_id: 999,
    room_id: 101,
    stay_date: date.toISOString().split('T')[0],
    total_guests_present: 3,
    guest_ids: [123, 124, 125],
    adult_count: 2,
    child_count: 1,
    base_rate: 100.00,
    occupancy_adjustment: 10.00,  // Extra charge for 3 guests
    applied_rate: 110.00,
    daily_accommodation_charge: 110.00,
    daily_subtotal: 137.50  // with VAT
  });
}

// Step 5: Create reservation pricing summary
const totalGuests = 3;
const nights = 5;
const accommodationSubtotal = 1250.00;  // 500 + 500 + 250
const occupancyFee = 50.00;  // 10 × 5 nights
const subtotal = 1300.00;
const vat = 325.00;
const total = 1625.00;

const pricing = await db.reservation_pricing_calculation.insert({
  reservation_id: 999,
  total_guests: totalGuests,
  adult_count: 2,
  child_count: 1,
  reservation_check_in: '2025-01-15',
  reservation_check_out: '2025-01-20',
  accommodation_subtotal: accommodationSubtotal,
  extra_bed_charges: occupancyFee,
  subtotal: subtotal,
  vat_amount: vat,
  total_amount: total,
  calculation_method: 'auto_guest_sum'
});

// Step 6: (Optional) Track OTA booking
if (bookingSource === 'booking.com') {
  await db.reservation_sync.insert({
    reservation_id: 999,
    ota_channel: 'booking.com',
    phobs_reservation_id: 'BK123456789',
    booking_reference: 'ABC123',
    sync_status: 'pending'
  });
}
```

### 2. Querying a Reservation

```typescript
// Get everything about a reservation
const fullReservation = await db.query(`
  SELECT * FROM reservations_with_pricing
  WHERE confirmation_number = 'CONF-001'
`);

// Get per-guest pricing breakdown
const guestPricing = await db.query(`
  SELECT * FROM guest_pricing_detail
  WHERE reservation_id = 999
`);

// Get daily occupancy
const occupancy = await db.query(`
  SELECT * FROM reservation_occupancy_summary
  WHERE reservation_id = 999
  ORDER BY stay_date
`);

// Calculate total revenue for a period
const revenue = await db.query(`
  SELECT
    SUM(total_amount) as revenue,
    SUM(ota_commission_amount) as commission,
    SUM(net_revenue) as net,
    COUNT(*) as bookings
  FROM reservation_pricing_summary
  WHERE reservation_check_in >= $1
    AND reservation_check_out <= $2
`, [startDate, endDate]);
```

### 3. Handling Different Check-in/Checkout Times

```typescript
// When guests arrive at different times
const guest1CheckIn = '2025-01-15T14:00:00Z';  // Guest 1: 2 PM
const guest2CheckIn = '2025-01-16T10:00:00Z';  // Guest 2: Next day, 10 AM
const guest3CheckOut = '2025-01-19T14:00:00Z'; // Guest 3: Leaves early

// Each tracked separately in guest_stays
await db.guest_stays.insert({
  reservation_id: 999,
  guest_id: 124,
  check_in: guest2CheckIn,
  check_out: '2025-01-20T11:00:00Z'
});

// And in guest_stay_pricing
await db.guest_stay_pricing.insert({
  guest_stay_id: guestB.id,
  check_in_date: '2025-01-16',  // Different date
  check_out_date: '2025-01-20',
  number_of_nights: 4,  // Calculated automatically
  // ... rest of pricing ...
});

// Daily occupancy automatically tracks presence
// Jan 15: 2 guests (A + C)
// Jan 16: 3 guests (A + B + C)
// Jan 17-18: 3 guests
// Jan 19: 2 guests (A + B, C checked out)
// Jan 20: 2 guests (before 11 AM checkout)
```

### 4. Pricing Rules

```typescript
// Rule 1: Base rate per guest type
const rates = {
  adult: 100.00,      // Full price
  child: 50.00,       // 50% discount
  infant: 0.00        // Free
};

// Rule 2: Occupancy adjustments
const occupancyFee = {
  1: 0.00,           // Single occupancy
  2: 0.00,           // Double (default)
  3: 10.00,          // Triple: +€10/night
  4: 30.00           // Quad: +€30/night
};

// Rule 3: Early check-in / Late checkout
const timeAdjustments = {
  early_checkin_before_2pm: 20.00,
  late_checkout_after_11am: 25.00
};

// All tracked in guest_stay_pricing fields:
// - early_check_in_fee
// - late_check_out_fee
// - guest_discount
// - additional_charges
```

---

## TypeScript Integration

### Type Definitions

```typescript
// Core reservation
interface Reservation {
  id: number;
  confirmationNumber: string;
  guestId: number;
  roomId: number;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  adults: number;
  childrenCount: number;
  status: ReservationStatus;
  bookingSource: BookingSource;
  specialRequests?: string;
  internalNotes?: string;
  hasPets: boolean;
  parkingRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

// Per-guest pricing
interface GuestStayPricing {
  id: number;
  guestStayId: number;
  guestId: number;
  reservationId: number;
  roomId: number;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  guestType: 'adult' | 'child' | 'infant';
  isPrimaryGuest: boolean;
  baseRatePerNight: number;
  nightlyRate: number;
  subtotal: number;
  earlyCheckInFee: number;
  lateCheckOutFee: number;
  guestDiscount: number;
  extraBedCharge: number;
  additionalCharges: number;
  totalAmount: number;
  vatRate: number;
  vatAmount: number;
  seasonalPeriod: 'A' | 'B' | 'C' | 'D';
}

// Aggregated pricing
interface ReservationPricingCalculation {
  id: number;
  reservationId: number;
  totalGuests: number;
  adultCount: number;
  childCount: number;
  infantCount: number;
  reservationCheckIn: string;
  reservationCheckOut: string;
  reservationNights: number;
  accommodationSubtotal: number;
  guestDiscountsTotal: number;
  earlyCheckinFees: number;
  lateCheckoutFees: number;
  extraBedCharges: number;
  petFee: number;
  parkingFee: number;
  shortStaySupplement: number;
  additionalCharges: number;
  subtotal: number;
  tourismTax: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  balanceDue: number;
  otaCommissionRate: number;
  otaCommissionAmount: number;
  netRevenue: number;
}

// Daily occupancy
interface GuestOccupancyNights {
  id: number;
  reservationId: number;
  roomId: number;
  stayDate: string;
  totalGuestsPresent: number;
  guestIds: number[];
  adultCount: number;
  childCount: number;
  infantCount: number;
  baseRate: number;
  occupancyAdjustment: number;
  appliedRate: number;
  dailyAccommodationCharge: number;
  dailyGuestDiscounts: number;
  dailyAdditionalCharges: number;
  dailySubtotal: number;
}

// OTA sync
interface ReservationSync {
  id: number;
  reservationId: number;
  phobsReservationId?: string;
  otaChannel?: string;
  bookingReference?: string;
  syncStatus: 'pending' | 'synced' | 'error' | 'conflict' | 'manual';
  syncErrors?: string[];
  lastSyncedAt?: string;
  hasConflicts: boolean;
  conflictNotes?: string;
}
```

---

## Service Layer

### Pricing Service

```typescript
class PricingService {
  async calculateReservationPricing(
    reservationId: number
  ): Promise<ReservationPricingCalculation> {
    // 1. Get all guest_stay_pricing records
    // 2. Sum up totals
    // 3. Add room-level fees (pet, parking, etc)
    // 4. Calculate taxes
    // 5. Update reservation_pricing_calculation
    // 6. Return result
  }

  async calculateGuestPricing(
    guestStayId: number,
    guestType: 'adult' | 'child' | 'infant',
    baseRate: number,
    numberOfNights: number
  ): Promise<GuestStayPricing> {
    // Calculate per-guest pricing with discounts
  }

  async generateDailyOccupancy(
    reservationId: number
  ): Promise<GuestOccupancyNights[]> {
    // Generate occupancy records for each day
    // Calculate daily rates based on occupancy level
  }
}
```

---

## Common Queries

### 1. Revenue Report
```sql
SELECT
  DATE(rpc.reservation_check_in) as date,
  COUNT(DISTINCT rpc.reservation_id) as bookings,
  SUM(rpc.accommodation_subtotal) as room_revenue,
  SUM(rpc.pet_fee + rpc.parking_fee) as ancillary_revenue,
  SUM(rpc.ota_commission_amount) as commission_paid,
  SUM(rpc.net_revenue) as net_revenue
FROM reservation_pricing_calculation rpc
WHERE rpc.reservation_check_in >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(rpc.reservation_check_in)
ORDER BY date DESC;
```

### 2. Occupancy Report
```sql
SELECT
  gon.stay_date,
  COUNT(DISTINCT gon.reservation_id) as reservations,
  SUM(gon.total_guests_present) as total_guests,
  AVG(gon.applied_rate)::NUMERIC(10,2) as avg_rate,
  SUM(gon.daily_subtotal) as daily_revenue
FROM guest_occupancy_nights gon
WHERE gon.stay_date >= CURRENT_DATE
  AND gon.stay_date < CURRENT_DATE + INTERVAL '30 days'
GROUP BY gon.stay_date
ORDER BY gon.stay_date;
```

### 3. Guest Contribution
```sql
SELECT
  g.id,
  g.first_name || ' ' || g.last_name as name,
  COUNT(DISTINCT gsp.reservation_id) as reservations,
  SUM(gsp.number_of_nights) as total_nights,
  SUM(gsp.total_amount)::NUMERIC(10,2) as total_spent,
  AVG(gsp.total_amount)::NUMERIC(10,2) as avg_reservation
FROM guest_stay_pricing gsp
JOIN guests g ON gsp.guest_id = g.id
WHERE gsp.created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY g.id, g.first_name, g.last_name
ORDER BY SUM(gsp.total_amount) DESC;
```

---

## Migration Checklist

### Phase 1: Setup ✅
- [x] Create guest_stay_pricing table
- [x] Create reservation_pricing_calculation table
- [x] Create guest_occupancy_nights table
- [x] Create reservation_sync table
- [x] Create views for backward compatibility

### Phase 2: Data Prep (This Week)
- [ ] Verify no data loss from migrations
- [ ] Check existing OTA bookings migrated to reservation_sync
- [ ] Test views with existing data
- [ ] Update application error handling

### Phase 3: Backend Integration (Next Week)
- [ ] Update TypeScript types
- [ ] Create PricingService class
- [ ] Create API endpoints for multi-guest bookings
- [ ] Implement validation (4-guest max, date logic)
- [ ] Add triggers for auto-calculation (optional)

### Phase 4: Frontend Updates (Week 3)
- [ ] Create multi-guest reservation form
- [ ] Add guest check-in/checkout time inputs
- [ ] Display pricing breakdown per guest
- [ ] Show daily occupancy summary
- [ ] Add real-time price calculation

### Phase 5: Testing & Deployment (Week 4)
- [ ] Unit tests for pricing calculations
- [ ] Integration tests with sample data
- [ ] Performance testing on views
- [ ] UAT with team
- [ ] Deploy to production

---

## Troubleshooting

### Issue: Guest pricing doesn't match reservation total
**Solution**: Run `calculateReservationPricing()` service to recalculate and verify sums

### Issue: Daily occupancy shows wrong guest count
**Solution**: Regenerate guest_occupancy_nights using `generateDailyOccupancy()` after changes

### Issue: OTA sync status shows errors
**Solution**: Check `reservation_sync.sync_errors` and `last_sync_error` fields

### Issue: Views running slowly
**Solution**: Check indexes are created and run EXPLAIN ANALYZE on queries

---

## Support & Questions

- **Schema Design**: See `/docs/SCHEMA_ARCHITECTURE.md`
- **Refactoring Plan**: See `/docs/DATABASE_REFACTORING_PLAN.md`
- **Full Summary**: See `/docs/REFACTORING_SUMMARY.md`
- **Implementation**: This document

---

**Version**: 1.0
**Status**: Ready for Backend Development
**Last Updated**: October 30, 2025
