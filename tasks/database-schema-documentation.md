# Hotel Database Schema Documentation

## Overview
Supabase Project: **hp-duga** (gkbpthurkucotikjefra)
Database: PostgreSQL 17.4.1.054
Status: ACTIVE_HEALTHY

## Core Tables Structure

### rooms table
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval() | Primary key |
| room_number | varchar | NO | - | Room identifier (e.g., "101", "102") |
| floor_number | integer | NO | - | Physical floor location |
| room_type | varchar | NO | - | Type: "family", "double", "triple" |
| max_occupancy | integer | YES | 2 | Maximum guests allowed |
| is_premium | boolean | YES | false | Premium room flag |
| seasonal_rate_a | numeric | YES | - | Season A pricing |
| seasonal_rate_b | numeric | YES | - | Season B pricing |
| seasonal_rate_c | numeric | YES | - | Season C pricing |
| seasonal_rate_d | numeric | YES | - | Season D pricing |
| amenities | jsonb | YES | '[]' | Room features array |
| is_active | boolean | YES | true | Room availability |
| is_clean | boolean | YES | false | Housekeeping status |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

**Sample Data:**
- Room 101: family type, 4 max occupancy, floor 1
- Room 102-110: double type, 2 max occupancy, floor 1
- All rooms currently active and clean

### reservations table
**Primary Key:** `id` (integer, auto-increment)
**Foreign Keys:** 
- `guest_id` → guests.id
- `room_id` → rooms.id  
- `company_id` → companies.id (optional)
- `pricing_tier_id` → pricing_tiers.id (optional)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval() | Primary key |
| guest_id | integer | NO | - | FK to guests table |
| room_id | integer | NO | - | FK to rooms table |
| check_in_date | date | NO | - | Arrival date |
| check_out_date | date | NO | - | Departure date |
| number_of_nights | integer | YES | - | Calculated nights |
| number_of_guests | integer | NO | 1 | Total guest count |
| adults | integer | NO | 1 | Adult count |
| children_count | integer | YES | 0 | Children count |
| status | varchar | YES | 'confirmed' | Booking status |
| booking_source | varchar | YES | 'direct' | Origin channel |
| special_requests | text | YES | - | Guest requests |
| internal_notes | text | YES | - | Staff notes |

**Pricing & Financial Fields:**
| Column | Type | Description |
|--------|------|-------------|
| seasonal_period | varchar | Season classification |
| base_room_rate | numeric | Base nightly rate |
| subtotal | numeric | Pre-tax subtotal |
| children_discounts | numeric | Child rate discounts |
| tourism_tax | numeric | Local tax amount |
| vat_amount | numeric | VAT/tax amount |
| pet_fee | numeric | Pet accommodation fee |
| parking_fee | numeric | Parking charges |
| short_stay_supplement | numeric | Short stay surcharge |
| additional_charges | numeric | Miscellaneous fees |
| total_amount | numeric | Final total |

**Payment & Status Fields:**
| Column | Type | Description |
|--------|------|-------------|
| payment_status | varchar | 'pending', 'paid', etc. |
| payment_method | varchar | Payment type |
| deposit_amount | numeric | Advance payment |
| balance_due | numeric | Remaining amount |

**Channel Manager Integration:**
| Column | Type | Description |
|--------|------|-------------|
| phobs_reservation_id | varchar | External reservation ID |
| booking_reference | varchar | OTA booking reference |
| ota_channel | varchar | Source OTA platform |
| commission_rate | numeric | OTA commission % |
| commission_amount | numeric | Commission fee |
| net_amount | numeric | Net revenue |
| sync_status | varchar | Sync state with OTAs |
| sync_errors | array | Sync error messages |
| last_synced_at | timestamptz | Last sync timestamp |

**Audit Fields:**
| Column | Type | Description |
|--------|------|-------------|
| booking_date | timestamptz | When booking was made |
| confirmation_number | varchar | Unique booking reference |
| checked_in_at | timestamptz | Actual check-in time |
| checked_out_at | timestamptz | Actual check-out time |
| created_at | timestamptz | Record creation |
| updated_at | timestamptz | Last modification |
| last_modified | timestamptz | Business logic update |

## Related Tables

### guests table
Contains guest personal information linked via `guest_id`

### guest_children table  
Child guest details for family bookings

### pricing_tiers table
Seasonal and rate plan configurations

### companies table
Corporate booking management

### phobs_* tables
Channel manager integration tables:
- `phobs_channels`: OTA platform configurations
- `phobs_availability`: Room availability sync
- `phobs_rate_plans`: Rate plan mappings
- `phobs_room_mappings`: Room type mappings
- `phobs_channel_status`: Connection status
- `phobs_channel_metrics`: Performance metrics
- `phobs_conflicts`: Booking conflicts
- `phobs_sync_log`: Sync operation logs
- `phobs_webhook_events`: Webhook processing

## Key Relationships

```
rooms (1) ←→ (many) reservations
guests (1) ←→ (many) reservations  
companies (1) ←→ (many) reservations [optional]
pricing_tiers (1) ←→ (many) reservations [optional]
guests (1) ←→ (many) guest_children
```

## Room-Booking Flow

1. **Room Selection**: User clicks on room → room.id selected
2. **Guest Creation**: Create/select guest → guest.id 
3. **Reservation Creation**: Create reservation linking room_id + guest_id
4. **Pricing Calculation**: Apply seasonal rates from rooms table
5. **Channel Sync**: Sync with OTAs via phobs_* tables

## Next Steps for Testing

1. ✅ Database schema documented
2. 🔄 Examine front-desk UI room selection components  
3. 🔄 Test room-to-database mapping
4. 🔄 Create booking creation integration tests
5. 🔄 Verify all pricing calculations work with Supabase