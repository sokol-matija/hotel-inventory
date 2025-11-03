# Hotel Inventory Database Architecture

## Clean Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE RESERVATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  reservations (CORE - Minimal, focused)                                     │
│  ├─ id, confirmation_number                                                 │
│  ├─ guest_id, room_id, company_id                                          │
│  ├─ check_in_date, check_out_date, number_of_nights                       │
│  ├─ number_of_guests, adults, children_count                              │
│  ├─ status, status_id                                                      │
│  ├─ booking_source, booking_source_id                                      │
│  ├─ special_requests, internal_notes                                       │
│  ├─ has_pets, parking_required                                             │
│  ├─ checked_in_at, checked_out_at                                          │
│  └─ created_at, updated_at                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
        ┌───────────▼────────┐  ┌──▼─────────┐  ┌─▼──────────┐
        │  PRICING LAYER     │  │ OTA LAYER  │  │GUEST LAYER │
        └────────────────────┘  └────────────┘  └────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRICING CALCULATION LAYER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  reservation_pricing_calculation (AGGREGATE - Reservation Level)            │
│  ├─ reservation_id (FK)                                                     │
│  ├─ total_guests, adult_count, child_count, infant_count                  │
│  ├─ accommodation_subtotal                                                  │
│  ├─ guest_discounts_total                                                   │
│  ├─ early_checkin_fees, late_checkout_fees, extra_bed_charges             │
│  ├─ pet_fee, parking_fee, short_stay_supplement                            │
│  ├─ subtotal, tourism_tax, vat_amount, total_amount                       │
│  ├─ deposit_amount, paid_amount, balance_due                              │
│  ├─ ota_commission_rate, ota_commission_amount, net_revenue               │
│  └─ pricing_tier_id, seasonal_period                                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ guest_stay_pricing (DETAIL - Per Guest Level)                     │     │
│  ├─ guest_stay_id (FK → guest_stays)                                │     │
│  ├─ guest_id, reservation_id, room_id (FKs)                         │     │
│  ├─ check_in_date, check_out_date, number_of_nights               │     │
│  ├─ guest_type (adult|child|infant)                               │     │
│  ├─ is_primary_guest                                              │     │
│  ├─ base_rate_per_night, nightly_rate                            │     │
│  ├─ subtotal, early_check_in_fee, late_check_out_fee             │     │
│  ├─ guest_discount, extra_bed_charge                             │     │
│  ├─ total_amount, vat_amount                                      │     │
│  └─ seasonal_period, pricing_tier_applied                         │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ guest_occupancy_nights (DETAIL - Daily Level)                    │     │
│  ├─ reservation_id, room_id, stay_date (UNQ)                       │     │
│  ├─ total_guests_present (max 4)                                   │     │
│  ├─ guest_ids (ARRAY of guest IDs)                                │     │
│  ├─ adult_count, child_count, infant_count                        │     │
│  ├─ base_rate, occupancy_adjustment, applied_rate                 │     │
│  ├─ daily_accommodation_charge                                     │     │
│  ├─ daily_guest_discounts, daily_additional_charges               │     │
│  └─ daily_subtotal                                                 │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    OTA SYNCHRONIZATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  reservation_sync (OTA Integration)                                         │
│  ├─ reservation_id (FK)                                                     │
│  ├─ phobs_reservation_id, ota_channel                                      │
│  ├─ booking_reference                                                       │
│  ├─ sync_status (pending|synced|error|conflict|manual)                    │
│  ├─ sync_errors[], last_sync_error                                         │
│  ├─ last_synced_at, next_retry_at                                         │
│  ├─ sync_attempts, last_successful_sync                                   │
│  ├─ has_conflicts, conflict_notes                                          │
│  └─ created_at, updated_at                                                 │
│                                                                              │
│  Integrates with existing Phobs tables:                                     │
│  ├─ phobs_channels (13 OTA channels)                                       │
│  ├─ phobs_sync_log (operation history)                                     │
│  ├─ phobs_conflicts (conflict detection)                                   │
│  └─ phobs_channel_metrics (performance)                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXISTING SUPPORT LAYERS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  payments (PAYMENT TRACKING)                                               │
│  ├─ invoice_id, reservation_id (FK)                                        │
│  ├─ amount, currency, payment_method                                       │
│  ├─ status (pending|completed|failed|cancelled|refunded)                  │
│  └─ ... payment details ...                                                │
│                                                                              │
│  invoices (BILLING)                                                         │
│  ├─ reservation_id, guest_id, company_id (FKs)                           │
│  ├─ invoice_number, issue_date, due_date, paid_date                      │
│  ├─ subtotal, total_amount, paid_amount, balance_due                      │
│  └─ status (draft|sent|paid|overdue|cancelled)                            │
│                                                                              │
│  guest_stays (GUEST TRACKING)                                              │
│  ├─ reservation_id, guest_id (FKs)                                        │
│  ├─ check_in, check_out (timestamps)                                      │
│  ├─ actual_check_in, actual_check_out                                     │
│  └─ Linked to guest_stay_pricing                                          │
│                                                                              │
│  guests (GUEST PROFILES)                                                   │
│  ├─ first_name, last_name, email, phone                                   │
│  ├─ passport_number, id_card_number                                       │
│  ├─ vip_status, is_vip, vip_level                                         │
│  └─ preferences, dietary_restrictions, special_needs                      │
│                                                                              │
│  rooms (ROOM MASTER)                                                        │
│  ├─ room_number, floor_number, room_type                                  │
│  ├─ max_occupancy, is_premium                                             │
│  ├─ amenities, is_clean                                                   │
│  └─ Linked to room_pricing by season                                      │
│                                                                              │
│  room_types, pricing_seasons, pricing_tiers (REFERENCE DATA)              │
│  └─ Configuration for pricing calculations                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      REPORTING & ANALYSIS VIEWS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✓ reservations_with_pricing        (Full booking + pricing data)          │
│  ✓ reservation_pricing_summary      (Financial reporting)                  │
│  ✓ guest_pricing_detail             (Per-guest breakdown)                  │
│  ✓ reservation_occupancy_summary    (Daily occupancy & rates)             │
│  ✓ ota_sync_status                  (OTA health monitoring)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Relationships

### Reservation Hierarchy
```
reservation (1)
├── guest_stays (N) - One for each guest
│   └── guest_stay_pricing (1) - Pricing for that guest's stay
│       └── guest_occupancy_nights (N) - Daily breakdown
└── reservation_pricing_calculation (1) - Aggregated pricing
    └── reservation_sync (1) - OTA tracking
```

### Example: 3-Guest Reservation

```
Reservation #999
├─ Guest A: Jan 15 14:00 → Jan 20 11:00
│  ├─ guest_stays: ID 500
│  ├─ guest_stay_pricing: ID 1000 (5 nights @ €100 = €500)
│  └─ guest_occupancy_nights: 5 rows (Jan 15-19)
│
├─ Guest B: Jan 15 14:00 → Jan 20 11:00
│  ├─ guest_stays: ID 501
│  ├─ guest_stay_pricing: ID 1001 (5 nights @ €100 = €500)
│  └─ guest_occupancy_nights: 5 rows (Jan 15-19)
│
├─ Guest C: Jan 15 14:00 → Jan 20 11:00
│  ├─ guest_stays: ID 502
│  ├─ guest_stay_pricing: ID 1002 (5 nights @ €50 = €250, child)
│  └─ guest_occupancy_nights: 5 rows (Jan 15-19)
│
├─ reservation_pricing_calculation: ID 2000
│  ├─ Accommodation subtotal: €1,250
│  ├─ Occupancy adjustment: €50 (3 guests)
│  ├─ Subtotal: €1,300
│  ├─ VAT: €325
│  └─ Total: €1,625
│
└─ reservation_sync: ID 3000
   ├─ OTA channel: booking.com
   ├─ Phobs ID: PH123456
   └─ Status: synced
```

---

## Query Patterns

### Pattern 1: Get Full Reservation Details
```sql
SELECT * FROM reservations_with_pricing
WHERE confirmation_number = 'CONF-001';
```
**Returns**: Booking info + pricing + OTA status (all in one view)

### Pattern 2: Calculate Guest-Level Pricing
```sql
SELECT * FROM guest_pricing_detail
WHERE reservation_id = 999;
```
**Returns**: Individual pricing for each guest

### Pattern 3: Get Daily Occupancy
```sql
SELECT * FROM reservation_occupancy_summary
WHERE reservation_id = 999
ORDER BY stay_date;
```
**Returns**: Day-by-day breakdown of occupancy and rates

### Pattern 4: Financial Reporting
```sql
SELECT * FROM reservation_pricing_summary
WHERE check_out_date <= CURRENT_DATE
AND check_out_date >= CURRENT_DATE - INTERVAL '30 days';
```
**Returns**: Revenue, commission, profit for closed reservations

### Pattern 5: OTA Monitoring
```sql
SELECT * FROM ota_sync_status
WHERE sync_status IN ('error', 'pending')
ORDER BY last_synced_at;
```
**Returns**: Problem bookings needing attention

---

## Normalization Summary

| Concern | Before | After |
|---------|--------|-------|
| **Reservation table size** | 50+ cols | 15 cols |
| **Pricing logic** | Mixed in reservation | Dedicated tables |
| **Multi-guest support** | Limited | Full (4 guests max) |
| **Different check-in times** | Not supported | Full support |
| **OTA data** | Cluttered | Isolated |
| **Daily breakdown** | Manual calc | Automated |
| **Query flexibility** | Poor | Excellent |

---

## Constraints & Validation

### At Table Level
- `total_guests <= 4` (occupancy limit)
- `check_out_date > check_in_date` (date logic)
- `status IN (...)` (allowed statuses)
- `guest_type IN ('adult', 'child', 'infant')`
- Unique constraints on `confirmation_number`, `phobs_reservation_id`

### At Application Level
- Verify all guests have guest_stays
- Verify sum of guest_stay_pricing matches reservation_pricing_calculation
- Validate payment flow (deposit → partial → full)
- Enforce OTA sync requirements

---

## Performance Optimization

### Indexes Created
```sql
-- guest_stay_pricing
idx_guest_stay_pricing_reservation
idx_guest_stay_pricing_guest
idx_guest_stay_pricing_room
idx_guest_stay_pricing_dates

-- reservation_pricing_calculation
idx_reservation_pricing_calc_reservation
idx_reservation_pricing_calc_dates

-- guest_occupancy_nights
idx_guest_occupancy_reservation
idx_guest_occupancy_date_range
idx_guest_occupancy_room

-- reservation_sync
idx_reservation_sync_reservation
idx_reservation_sync_phobs_id
idx_reservation_sync_status
idx_reservation_sync_channel
idx_reservation_sync_needs_sync
```

### View Optimization
- Views leverage underlying table indexes
- No separate index needed for views
- Use views for ease; join directly for complex queries

---

## Next Steps

1. **Update Application Types** - Reflect new schema in TypeScript
2. **Implement Triggers** - Auto-calculate pricing when guest_stays change
3. **Create Stored Procedures** - Common pricing operations
4. **Add API Endpoints** - New endpoints for multi-guest bookings
5. **Test Edge Cases** - Different check-in times, occupancy changes
6. **Performance Test** - Monitor view and query performance
7. **Migrate Existing Data** - Map old reservations to new structure

---

**Version**: 1.0
**Created**: October 30, 2025
**Status**: Ready for Implementation
