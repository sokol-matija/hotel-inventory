# Hotel Pricing System Refactor & Day-by-Day Feature Implementation Plan

## Executive Summary
This plan addresses critical pricing calculation issues, implements individual guest/object day tracking, and creates a single source of truth for all pricing calculations.

## Current Issues Analysis

### 1. Double VAT Charging ⚠️ CRITICAL
- **Problem**: Room rates include 25% VAT (Croatian law) but system calculates additional VAT
- **Impact**: Customers are being overcharged by ~20% on total amount
- **Files affected**: `pricingCalculator.ts`, database reservation records

### 2. Multiple Pricing Systems ⚠️ CRITICAL
- **Problem**: 3 different pricing mechanisms conflict with each other
- **Systems**: 
  - `pricingCalculator.ts` (original)
  - `DailyReservationPricingService.ts` (day-by-day)
  - Database fields (base rates, VAT calculations)
- **Impact**: Inconsistent pricing, calculation errors

### 3. Missing Database Infrastructure ❌ BLOCKING
- **Problem**: `reservation_daily_details` table doesn't exist
- **Impact**: Day-by-day breakdown can't save changes
- **Required**: New database schema for individual guest/object day tracking

### 4. useSimpleDragCreate UI Issues 🐛 MEDIUM
- **Problem**: UI updates not consistent with overlay expectations
- **Impact**: Poor user experience during reservation creation

## Implementation Plan

### Phase 1: Database Schema Design & Migration ⏰ 2-3 hours

#### 1.1 Create Individual Guest/Object Day Tracking Schema
```sql
-- New table: reservation_daily_details
CREATE TABLE reservation_daily_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  stay_date DATE NOT NULL,
  
  -- Individual guest tracking
  adults_present INTEGER NOT NULL DEFAULT 0,
  children_present INTEGER[] DEFAULT '{}', -- Array of guest IDs
  
  -- Service tracking
  parking_spots_needed INTEGER DEFAULT 0,
  pets_present BOOLEAN DEFAULT FALSE,
  pet_count INTEGER DEFAULT 0,
  towel_rentals INTEGER DEFAULT 0,
  
  -- Calculated pricing (single source of truth)
  base_accommodation_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  child_discounts DECIMAL(10,2) DEFAULT 0,
  service_fees JSONB DEFAULT '{}', -- {parking: 0, pets: 0, towels: 0, tourism: 0}
  daily_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- VAT handling (already included in room rates)
  vat_included_in_rates DECIMAL(10,2) DEFAULT 0, -- For reporting only
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(reservation_id, stay_date)
);

-- New table: guest_children (if doesn't exist)
CREATE TABLE IF NOT EXISTS guest_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  age INTEGER NOT NULL, -- Calculated field for convenience
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_reservation_daily_details_reservation_id ON reservation_daily_details(reservation_id);
CREATE INDEX idx_reservation_daily_details_stay_date ON reservation_daily_details(stay_date);
CREATE INDEX idx_guest_children_reservation_id ON guest_children(reservation_id);
```

#### 1.2 Add Missing Pricing Configuration Tables
```sql
-- Seasonal pricing periods (if missing)
CREATE TABLE IF NOT EXISTS seasonal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_code VARCHAR(1) NOT NULL UNIQUE, -- A, B, C, D
  name VARCHAR(100) NOT NULL,
  description TEXT,
  tourism_tax_rate DECIMAL(4,2) NOT NULL DEFAULT 1.10,
  date_ranges JSONB NOT NULL, -- Array of {start_date, end_date} objects
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room type seasonal rates (linking rooms to seasonal pricing)
CREATE TABLE IF NOT EXISTS room_seasonal_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  seasonal_period VARCHAR(1) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  vat_included BOOLEAN DEFAULT TRUE, -- Croatian law compliance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(room_id, seasonal_period)
);
```

### Phase 2: Single Source of Truth Pricing Service ⏰ 4-5 hours

#### 2.1 Create Unified Pricing Service
```typescript
// New file: src/lib/hotel/services/UnifiedPricingService.ts
interface PricingConfig {
  vatRate: number; // 0.25 for Croatia
  vatIncludedInRates: boolean; // true for Croatia
  tourismTaxRates: { high: number; low: number };
  serviceFees: {
    petFeePerStay: number;
    parkingFeePerNight: number;
    towelRentalPerDay: number;
    shortStaySupplementRate: number;
  };
  childDiscounts: {
    age0to3: number; // 1.0 = 100% discount (free)
    age3to7: number; // 0.5 = 50% discount
    age7to14: number; // 0.3 = 30% discount
  };
}

class UnifiedPricingService {
  // Single method for all pricing calculations
  async calculateReservationPricing(params: ReservationPricingParams): Promise<PricingResult>
  
  // Day-by-day breakdown using same calculation logic
  async calculateDayByDayBreakdown(reservationId: string): Promise<DayByDayPricingResult>
  
  // Individual guest day tracking
  async updateGuestDayPresence(params: GuestDayPresenceParams): Promise<void>
  
  // VAT-compliant pricing (no double charging)
  private calculateVATCompliantPricing(baseAmount: number): VATBreakdown
}
```

#### 2.2 Deprecate Conflicting Systems
- Mark `pricingCalculator.ts` as deprecated
- Migrate existing `DailyReservationPricingService.ts` to use new unified service
- Update all components to use single pricing service

### Phase 3: Individual Guest/Object Day Tracking ⏰ 3-4 hours

#### 3.1 Enhanced Day-by-Day UI
- **Individual Guest Management**: Add/remove guests for specific days
- **Service Tracking**: Parking spots, pets, towels per day
- **Real-time Pricing**: Update totals as changes are made
- **Save Functionality**: Persist changes to database

#### 3.2 Guest Presence Management
```typescript
interface GuestDayPresence {
  guestId: string;
  guestName: string;
  guestType: 'adult' | 'child';
  age?: number; // for children
  checkInDay: Date;  // Day they arrive (can be after reservation start)
  checkOutDay: Date; // Day they leave (can be before reservation end)
  discountApplicable: boolean;
}
```

### Phase 4: Fix useSimpleDragCreate UI Issues ⏰ 1-2 hours

#### 4.1 Investigate Current Issues
- Review HotelTimeline component usage of useSimpleDragCreate
- Fix overlay positioning and visual feedback
- Ensure proper state management between hook and UI

#### 4.2 Enhance Drag-to-Create Experience
- Improve visual feedback during drag operations
- Fix overlay alignment issues
- Add better error handling and validation

### Phase 5: Migration & Data Integrity ⏰ 2-3 hours

#### 5.1 Data Migration Strategy
```sql
-- Migrate existing reservations to new day-by-day structure
INSERT INTO reservation_daily_details (
  reservation_id, stay_date, adults_present, children_present,
  parking_spots_needed, pets_present, base_accommodation_cost,
  service_fees, daily_total
)
SELECT 
  r.id,
  generate_series(r.check_in::date, r.check_out::date - interval '1 day', interval '1 day')::date,
  r.adults,
  COALESCE((SELECT array_agg(gc.id) FROM guest_children gc WHERE gc.reservation_id = r.id), '{}'),
  CASE WHEN r.parking_required THEN 1 ELSE 0 END,
  r.has_pets,
  -- Calculate daily accommodation cost without double VAT
  (r.base_room_rate / r.number_of_nights),
  jsonb_build_object(
    'parking', CASE WHEN r.parking_required THEN 7.00 ELSE 0 END,
    'pets', CASE WHEN r.has_pets THEN (r.pet_fee_subtotal / r.number_of_nights) ELSE 0 END,
    'tourism', (r.tourism_tax / r.number_of_nights),
    'towels', 0
  ),
  ((r.base_room_rate / r.number_of_nights) + 
   CASE WHEN r.parking_required THEN 7.00 ELSE 0 END +
   CASE WHEN r.has_pets THEN (r.pet_fee_subtotal / r.number_of_nights) ELSE 0 END +
   (r.tourism_tax / r.number_of_nights))
FROM reservations r
WHERE NOT EXISTS (
  SELECT 1 FROM reservation_daily_details rd 
  WHERE rd.reservation_id = r.id
);
```

#### 5.2 Data Validation & Cleanup
- Verify pricing calculations match between old and new systems
- Identify and fix any VAT double-charging in existing reservations
- Create reports showing pricing differences

### Phase 6: Frontend Implementation ⏰ 4-5 hours

#### 6.1 Redesigned Day-by-Day Modal
```typescript
// Enhanced ExpandedDailyViewModal.tsx features:
- Individual guest presence management per day
- Visual calendar showing who's present when
- Real-time pricing updates
- Service fee management (parking, pets, towels)
- Save/cancel functionality with optimistic updates
- Conflict detection (e.g., child present but no adult)
```

#### 6.2 Integration with Timeline
- Right-click context menu for day-by-day view
- Quick edit functionality
- Visual indicators for complex bookings (varying occupancy)

### Phase 7: Testing & Validation ⏰ 2-3 hours

#### 7.1 Pricing Calculation Tests
- Unit tests for VAT-compliant calculations
- Integration tests for day-by-day pricing
- Regression tests to ensure no double VAT charging

#### 7.2 UI/UX Testing
- Drag-to-create functionality
- Day-by-day editing workflows
- Data persistence and error handling

## Risk Mitigation

### 1. Data Loss Prevention
- Complete database backup before migration
- Incremental migration with rollback capability
- Parallel system validation during transition

### 2. Customer Impact
- Price verification scripts before go-live
- Customer notification for any pricing corrections needed
- Clear audit trail for all pricing changes

### 3. System Availability
- Implement feature flags for gradual rollout
- Maintain backward compatibility during transition
- Monitor performance impact of new features

## Success Criteria

### Technical
- ✅ Single source of truth for all pricing calculations
- ✅ No double VAT charging
- ✅ Individual guest/object day tracking working
- ✅ All existing functionality preserved
- ✅ Zero TypeScript build errors

### Business
- ✅ Accurate pricing calculations (Croatian VAT compliance)
- ✅ Enhanced user experience for complex bookings
- ✅ Improved operational efficiency
- ✅ Better reporting and audit capabilities

## Timeline Summary
- **Phase 1**: Database Schema (2-3 hours)
- **Phase 2**: Pricing Service (4-5 hours)  
- **Phase 3**: Day Tracking (3-4 hours)
- **Phase 4**: UI Fixes (1-2 hours)
- **Phase 5**: Migration (2-3 hours)
- **Phase 6**: Frontend (4-5 hours)
- **Phase 7**: Testing (2-3 hours)

**Total Estimated Time**: 18-25 hours over 3-4 days

## Next Steps
1. User approval of this plan
2. Database backup and preparation
3. Begin Phase 1 implementation
4. Iterative development with frequent builds and testing

---
*This plan ensures we solve the VAT double-charging issue, create a single source of truth for pricing, and implement the requested individual guest day tracking feature while maintaining system stability.*