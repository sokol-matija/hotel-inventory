# Reservations Table Refactoring Plan

## Current Problem: Bloated Reservations Table

**Current columns: 50+**

The `reservations` table currently contains data for 5 different concerns:

### 1. **Core Booking Information** (Essential - KEEP)
- `id`, `guest_id`, `room_id`
- `check_in_date`, `check_out_date`
- `status`, `booking_source`
- `confirmation_number`, `booking_date`
- `number_of_guests`, `adults`, `children_count`
- `company_id` (for corporate bookings)

**Current columns: ~11**

### 2. **Pricing & Calculation** (MOVE to `reservation_pricing_calculation`)
- `seasonal_period`
- `base_room_rate`, `subtotal`
- `children_discounts`, `tourism_tax`, `vat_amount`
- `pet_fee`, `parking_fee`, `short_stay_supplement`, `additional_charges`
- `total_amount`
- `pricing_tier_id`
- `commission_rate`, `commission_amount`, `net_amount`

**Current columns: ~14 → MOVE to pricing table**

### 3. **Payment Tracking** (MOVE to `payments` + `invoices`)
- `payment_status`, `payment_method`
- `deposit_amount`, `balance_due`

**Current columns: ~4 → MOVE to payments table**

### 4. **OTA Sync & Integration** (MOVE to `phobs_sync_log`)
- `phobs_reservation_id`
- `ota_channel`, `booking_reference`
- `sync_status`, `sync_errors`, `last_synced_at`

**Current columns: ~5 → MOVE to phobs tables**

### 5. **Notes & Metadata** (KEEP or MOVE)
- `special_requests`, `internal_notes`
- `has_pets`, `parking_required`
- `checked_in_at`, `checked_out_at`
- `last_modified`

**Current columns: ~6 → KEEP or MOVE to separate notes table**

---

## Proposed New Structure

### **REFACTORED: reservations** (Core Only)
**~15-18 columns** (down from 50+)

```sql
CREATE TABLE reservations_refactored (
  -- Identity
  id SERIAL PRIMARY KEY,
  confirmation_number VARCHAR UNIQUE,

  -- Core relationships
  guest_id INTEGER NOT NULL,      -- Primary guest
  room_id INTEGER NOT NULL,       -- Room booked
  company_id INTEGER,             -- Optional corporate booking

  -- Core booking info
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_nights INTEGER GENERATED,

  -- Guest composition
  number_of_guests INTEGER NOT NULL,
  adults INTEGER DEFAULT 1,
  children_count INTEGER DEFAULT 0,

  -- Booking source
  booking_source VARCHAR,         -- 'booking.com', 'airbnb', 'direct', etc.
  booking_source_id INTEGER,      -- FK to booking_sources
  booking_date TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  status VARCHAR,                 -- 'confirmed', 'checked-in', etc.
  status_id INTEGER,              -- FK to reservation_statuses

  -- Timeline
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,

  -- Metadata
  special_requests TEXT,
  internal_notes TEXT,
  has_pets BOOLEAN DEFAULT false,
  parking_required BOOLEAN DEFAULT false,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_guest FOREIGN KEY (guest_id) REFERENCES guests(id),
  CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_status FOREIGN KEY (status_id) REFERENCES reservation_statuses(id),
  CONSTRAINT fk_booking_source FOREIGN KEY (booking_source_id) REFERENCES booking_sources(id)
);
```

### **EXISTING: reservation_pricing_calculation** (Already Created ✅)
Handles all pricing calculations, VAT, commissions, etc.

### **EXISTING: guest_stay_pricing** (Already Created ✅)
Handles per-guest pricing with different check-in/checkout times

### **EXISTING: guest_occupancy_nights** (Already Created ✅)
Daily occupancy tracking for detailed pricing

### **ENHANCE: payments** (Existing table)
Link to reservations for payment tracking:
```sql
ALTER TABLE payments ADD COLUMN reservation_id INTEGER;
-- Track deposit, partial payments, refunds
```

### **NEW: reservation_sync** (Replace phobs fields in reservations)
```sql
CREATE TABLE reservation_sync (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL UNIQUE,
  phobs_reservation_id VARCHAR UNIQUE,
  ota_channel VARCHAR,           -- 'booking.com', 'airbnb', etc.
  booking_reference VARCHAR,
  sync_status VARCHAR,           -- 'pending', 'synced', 'error'
  sync_errors TEXT[],
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);
```

---

## Benefits of Refactoring

| Issue | Before | After |
|-------|--------|-------|
| **Table Width** | 50+ columns | 15-18 columns |
| **Query Speed** | Slower (lots of unused data) | Faster (focused data) |
| **Update Complexity** | Complex (many concerns) | Simple (single responsibility) |
| **Pricing Changes** | Edit core table | Edit pricing table |
| **Payment Tracking** | Duplicated in reservations | Centralized in payments |
| **OTA Sync** | Clutters core booking | Isolated in sync table |
| **Audit Trail** | Hard to track | Easy per-table audit logs |

---

## Migration Path (Non-Destructive)

### Phase 1: Create New Tables ✅
- `guest_stay_pricing` ✅
- `reservation_pricing_calculation` ✅
- `guest_occupancy_nights` ✅
- `reservation_sync` (new)

### Phase 2: Copy Data
```sql
-- Copy pricing data to reservation_pricing_calculation
-- Copy OTA sync data to reservation_sync
-- Copy payment data to payments table
```

### Phase 3: Add Views (backward compatibility)
Create views with old column names so existing code continues to work

### Phase 4: Deprecate Old Columns
- Mark old columns as deprecated in comments
- Add triggers to update new tables when old columns change
- Update application code gradually

### Phase 5: Drop Old Columns
- Once application is fully migrated
- Remove deprecated columns

---

## Implementation Timeline

1. **Create reservation_sync table** (5 min)
2. **Migrate OTA data** (10 min)
3. **Create compatibility views** (20 min)
4. **Update application queries** (TBD)
5. **Test with production data** (1 day)
6. **Deprecate old columns** (gradual)
7. **Final cleanup** (when safe)

---

## Queries That Will Improve

```sql
-- Current (slow - scans all pricing columns)
SELECT * FROM reservations
WHERE check_in_date BETWEEN '2025-01-01' AND '2025-12-31';

-- After refactor (fast - focused data)
SELECT * FROM reservations
WHERE check_in_date BETWEEN '2025-01-01' AND '2025-12-31';
-- Then join to pricing_calculation when needed
```

---

## Questions for You

1. ✅ Should we keep `special_requests` and `internal_notes` in reservations? (Core booking info)
2. ✅ Should we keep `has_pets` and `parking_required`? (Core booking requirements)
3. ❓ Do you want to deprecate old columns or drop them immediately?
4. ❓ Should we create views for backward compatibility?
