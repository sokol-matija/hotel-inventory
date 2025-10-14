# Hotel Management System - Enhanced Features Specification

## Overview
This document details the new requirements for extending the existing Hotel Porec management system with advanced corporate billing, reservation management, and operational features.

## Current System Context
- **Technology Stack**: React 19 + TypeScript, Supabase, Tailwind CSS
- **Existing Features**: Front desk timeline, reservations, room service integration, NTFY notifications, Croatian fiscalization
- **Database**: PostgreSQL via Supabase with existing tables for reservations, guests, rooms
- **Current Reservation Interface**: `src/lib/hotel/types.ts` with pricing breakdown and room service items

## Feature Categories & Requirements

### 1. Corporate Billing System (R1 Bills)

#### 1.1 Company/Firm Management
**Requirement**: Store and manage corporate clients for R1 billing
- **New Entity**: `Company/Firm` object with fields:
  - Company name (required)
  - OIB (Croatian tax number, required, unique)
  - Address
  - Contact person
  - Email
  - Phone number
  - Special pricing tier (if applicable)
  - Room allocation guarantee settings
  - Creation and modification timestamps

#### 1.2 R1 Bill Toggle & Selection
**Requirement**: Enable corporate billing during booking creation
- **UI Enhancement**: Toggle switch in `CreateBookingModal` for "R1 Bill"
- **When enabled**: 
  - Show company selection dropdown with search functionality
  - Search by company name OR OIB
  - Auto-complete with existing companies
  - Option to create new company if not found
- **Data Storage**: Link reservation to selected company
- **Invoice Impact**: Company details appear on generated invoices instead of individual guest billing

#### 1.3 Individual vs Corporate Payment Split
**Requirement**: Handle room upgrades where company pays base rate, individual pays upgrade
- **Scenario**: Company books standard room via R1, guest upgrades to superior
- **Calculation**: Guest pays (Superior rate - Standard rate) + 13% VAT
- **Invoice Generation**: Two separate invoices - R1 for company, regular for individual upgrade

### 2. Enhanced Pricing & Discounts

#### 2.1 VIP Customer Discounts
**Requirement**: Apply discounts to total bill for VIP customers
- **UI**: Discount percentage field in booking creation/modification
- **Calculation**: Applied to total amount before VAT
- **Invoice Display**: Show original amount, discount, and final amount

#### 2.2 Variable VAT Rates
**Requirement**: Apply correct VAT based on service type
- **Room accommodation**: 13% VAT
- **Parking**: 25% VAT  
- **Pet/Dog fees**: 25% VAT
- **System Impact**: Update pricing calculations throughout system

#### 2.3 Drinks Billing Simplification
**Requirement**: Aggregate drink charges on final invoice
- **Current**: Individual drink items listed
- **New**: Single line item "Drinks: [Total Amount]"
- **Backend**: Maintain detailed records for internal use
- **Invoice Display**: Show only aggregated total

### 3. Additional Services & Fees

#### 3.1 Towel Rental Service
**Requirement**: Add towel rental option
- **Daily Rate**: Define pricing for towel rental
- **Booking Integration**: Option to add during reservation or check-in
- **Billing**: Calculate based on days stayed
- **Invoice Line Item**: "Towel Rental: [X days] × [Rate] = [Total]"

#### 3.2 Guest Addition During Stay
**Requirement**: Add guests to existing reservation
- **Scenario**: Additional person joins existing room
- **Calculation**: Pro-rated charge based on remaining days
- **Rate**: Per-person daily rate with 13% VAT
- **Update**: Modify existing reservation, adjust final bill

### 4. Register Selection System

#### 4.1 Multi-Register Support
**Requirement**: Select from 4 different fiscal registers during billing
- **Registers**: Register 1, Register 2, Register 3, Register 4
- **UI**: Dropdown selection during invoice creation
- **Croatian Fiscal**: Each register has separate fiscal sequence
- **Default**: Configurable default register per user/session

### 5. Advanced Pricing Structures

#### 5.1 Multi-Tier Pricing System
**Requirement**: Different pricing schedules for different customer types
- **Regular Pricing**: Standard guest rates
- **Corporate Pricing**: Special rates for business partners
- **Agency Pricing**: Tour operator/travel agency rates
- **Implementation**: Pricing tier selection during booking
- **Database**: Store pricing tier with reservation

#### 5.2 Room Allocation Guarantees
**Requirement**: Guarantee room availability for key corporate partners
- **Configuration**: Set guaranteed room count per company
- **Availability Check**: Reserve rooms for guaranteed partners
- **Alert System**: Email notification when guaranteed rooms exhausted
- **Override**: Manual booking still possible with confirmation

### 6. Group Booking Management

#### 6.1 Group Labeling System
**Requirement**: Visual grouping of related reservations
- **Use Cases**: 
  - Bicycle groups (e.g., "Bicycle Group #1")
  - Family groups (e.g., "Smith Family")
  - Corporate groups (e.g., "TechCorp Retreat")
- **Visual Indicator**: Colored labels/badges on timeline view
- **Floor Preference**: Try to allocate same floor when possible
- **Group Operations**: Bulk check-in/out, group billing options

### 7. Reservation Status Extensions

#### 7.1 Tentative Reservations
**Requirement**: Handle unconfirmed bookings
- **Status**: "Tentative" reservation status
- **Visual**: Dotted grey outline on timeline
- **Behavior**: 
  - Shows in availability calculations with lower priority
  - Can be overridden by confirmed bookings
  - Automatic confirmation deadline
  - Email reminders for confirmation

### 8. Room-Specific Rules

#### 8.1 Room 401 Enhanced Rules
**Requirement**: Special handling for premium room
- **Cleaning Day**: Mandatory 1-day gap between bookings
- **Minimum Stay**: 4-day minimum for all bookings
- **Pricing**: Fixed rate (not per person)
- **Parking**: 3 parking spaces included
- **UI**: Enforce rules during booking creation

### 9. Advanced Timeline Features

#### 9.1 Same-Day Room Movement Mode
**Requirement**: Restrict reservation movement to same dates
- **Mode Toggle**: "Same-day move" mode in timeline
- **Behavior**: 
  - Highlight available rooms for selected dates only
  - Prevent horizontal (date) movement
  - Allow only vertical (room) movement
- **Visual Feedback**: Show valid drop zones, disable invalid areas

### 10. Visual & UX Improvements

#### 10.1 Enhanced Icons
**Requirement**: Improve visibility of timeline indicators
- **Dog Icon**: Change to white color for better visibility
- **Group Indicators**: Add visual group membership indicators
- **Status Icons**: Enhanced status indicators (tentative, confirmed, checked-in)

### 11. Payment Integration

#### 11.1 Booking.com Credit Card Storage
**Requirement**: Secure storage of payment information
- **Challenge**: Secure handling of sensitive payment data
- **Compliance**: PCI DSS requirements
- **Questions for Clarification**:
  - What level of PCI compliance is acceptable?
  - Should we use tokenization service?
  - Local storage vs. third-party secure vault?
  - What payment operations need to be supported?

## Implementation Priority Matrix

### Phase 1 (High Priority - Core Business Logic)
1. Corporate billing system (R1 bills)
2. Variable VAT rates implementation
3. Register selection system
4. Room 401 enhanced rules

### Phase 2 (Medium Priority - Operational Features)
1. Multi-tier pricing system
2. Group booking management
3. Tentative reservation status
4. VIP discount system

### Phase 3 (Low Priority - UX Enhancements)
1. Same-day movement mode
2. Visual improvements
3. Towel rental service
4. Advanced guest addition

### Phase 4 (Research Required)
1. Payment integration analysis
2. Room allocation guarantee system
3. Advanced reporting features

## Updated Requirements Based on Feedback ✅

### Corporate Billing - **CLARIFIED**
1. ✅ **No credit limits** - Simple company management for now
2. ✅ **No corporate discounts** - Use pricing tiers instead  
3. ✅ **Pricing tiers approach** - Create named tiers (2025 Standard, 2026 Standard, Agency Names)

### Pricing System - **CLARIFIED**
4. ✅ **Pricing tiers**: 2025 Standard, 2026 Standard, custom agency names
5. ✅ **Seasonal variation**: Each tier has seasonal multipliers
6. ✅ **Group discounts**: Manual for now

### Payment & Security - **DEFERRED**
7. ✅ **No card storage** - Implement later when needed
8. ✅ **Payment processing** - Implement later
9. ✅ **Backup requirements** - Using localStorage for now

### Operational Workflow - **CLARIFIED**
10. ✅ **Tentative reservations** - No auto-expiration for now
11. ✅ **Room allocation guarantees** - Manual override process
12. ✅ **Manual approvals** - Staff can override as needed

## Complete 2026 Pricing Structure ✅

### Seasonal Periods
- **Period A**: 04.01 - 01.04, 25.10 - 29.12 (Tourism Tax: €1.10)
- **Period B**: 02.04 - 21.05, 27.09 - 24.10, 30.12 - 02.01 (Tourism Tax: €1.10)  
- **Period C**: 22.05 - 09.07, 01.09 - 26.09 (Tourism Tax: €1.60)
- **Period D**: 10.07 - 31.08 (Tourism Tax: €1.60)

### Room Rates (€ per person, 13% VAT included)
**Superior:**
- Big Double Room: 56€ / 70€ / 87€ / 106€
- Big Single Room: 83€ / 108€ / 139€ / 169€

**Regular Rooms:**
- Double Room: 47€ / 57€ / 69€ / 90€
- Triple Room: 47€ / 57€ / 69€ / 90€  
- Single Room: 70€ / 88€ / 110€ / 144€
- Family Room: 47€ / 57€ / 69€ / 90€
- Triple Apartment (min 3 people): 47€ / 57€ / 69€ / 90€

**Premium:**
- **Room 401 Rooftop Apartment**: 250€ / 300€ / 360€ / 450€ (per apartment, max 2 people)

### Discount Rules (Apply to accommodation only, not total bill)
- **Children 0-3**: Free (gratis)
- **Children 3-7**: 50% discount
- **Children 7-14**: 20% discount
- **Adults**: Full price

### Tourism Tax (No VAT, never discounted)
- **Low Season** (months 1,2,3,10,11,12): €1.10 per person/night
- **High Season** (months 4,5,6,7,8,9): €1.60 per person/night
- **Children 0-12**: Don't pay
- **Children 12-18**: 50% rate

### Additional Rules
- **Short Stay Supplement**: +20% on accommodation price for stays `< 3` days
- **Parking**: €7 per night (25% VAT)
- **Pet Fee**: €20 per stay (25% VAT)  
- **Room 401 Special**: 1-day cleaning gap, 4-day minimum, 3 parking spaces included

## LocalStorage Data Structure Impact

**Note**: For rapid development, all data is stored in localStorage rather than database tables. This allows quick iteration without database migrations.

### New LocalStorage Entities Required
- `companies` - Corporate client information (R1 billing)
- `pricing_tiers` - Multi-level pricing structures (2025/2026/Agency rates)
- `group_bookings` - Group reservation relationships
- `fiscal_registers` - 4 fiscal registers for Croatian compliance
- `vip_discounts` - VIP customer discount management
- `guest_additions` - Mid-stay guest additions
- `room_rules` - Room-specific rules (Room 401 cleaning/minimum stay)
- `tentative_settings` - Unconfirmed reservation management

### Enhanced Existing Entities
- `reservations` - Add company_id, pricing_tier_id, group_booking_id, register_id, isR1Bill
- `room_service_items` - Add service category and VAT rate for proper tax calculation
- `guests` - Already has VIP status field

### New Enums/Types
- `BillingType` - Individual, Corporate (R1)
- `ReservationStatus` - Add Tentative status
- `ServiceType` - Room, Parking, Pet, Drinks, Towel
- `RegisterType` - Register1, Register2, Register3, Register4

## Technical Implementation Notes

### Security Considerations
- PCI compliance for payment data
- OIB validation for Croatian tax numbers
- Audit trails for corporate billing
- Access controls for pricing modifications

### Performance Considerations
- Indexing on company OIB and name
- Efficient group booking queries
- Timeline rendering with additional status types
- Pricing calculation optimization

### Integration Points
- Croatian fiscal system updates for multiple registers
- NTFY notification system for room allocation alerts
- Email system for corporate notifications
- PDF invoice generation with corporate layouts

---

**Document Version**: 1.0  
**Created**: August 7, 2025  
**Status**: Draft - Awaiting Clarification  
**Next Steps**: Address clarification questions, prioritize implementation phases