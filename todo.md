# Financial Data Generation Task Plan

## Overview
Generate comprehensive dummy financial data for the Hotel Porec finance system to support investor demonstrations and testing of all finance module features.

## Task List

### Phase 1: Data Analysis and Planning
- [x] Analyze existing HotelContext.tsx and generateSampleFinancialData function
- [x] Review Hotel Porec room structure (46 rooms across 4 floors)
- [x] Study Croatian fiscal requirements and tax calculations
- [x] Examine current guest and reservation data patterns

### Phase 2: Enhanced Financial Data Generation
- [ ] **Task 1**: Extend generateSampleFinancialData to create 50+ realistic invoices
- [ ] **Task 2**: Generate diverse payment records with various Croatian payment methods
- [ ] **Task 3**: Create proper Croatian fiscal compliance records (OIB, JIR, ZKI codes)
- [ ] **Task 4**: Add more international guests (German, Italian, Austrian focus)
- [ ] **Task 5**: Implement seasonal pricing variations across multiple months
- [ ] **Task 6**: Generate revenue analytics data spanning 6+ months
- [ ] **Task 7**: Add realistic business scenarios (VIP guests, long stays, group bookings)

### Phase 3: Croatian Fiscal Compliance
- [ ] **Task 8**: Generate proper Croatian invoice numbers (YYYY-NNN-NNNN format)
- [ ] **Task 9**: Add realistic JIR and ZKI codes for fiscal compliance
- [ ] **Task 10**: Create fiscal records with Croatian tax authority data
- [ ] **Task 11**: Implement proper VAT calculations (25% Croatian rate)
- [ ] **Task 12**: Add tourism tax calculations with seasonal rates

### Phase 4: Payment and Revenue Scenarios
- [ ] **Task 13**: Create diverse payment scenarios (cash, card, bank transfer, Booking.com)
- [ ] **Task 14**: Add partial payments and installment scenarios
- [ ] **Task 15**: Generate overdue invoices for collections testing
- [ ] **Task 16**: Create refund and cancellation scenarios
- [ ] **Task 17**: Add group bookings and corporate accounts

### Phase 5: Analytics and Reporting Data
- [ ] **Task 18**: Generate monthly revenue trends for analytics
- [ ] **Task 19**: Create seasonal occupancy and pricing data
- [ ] **Task 20**: Add booking source distribution (direct vs Booking.com)
- [ ] **Task 21**: Generate guest retention and VIP customer data
- [ ] **Task 22**: Create expense and cost data for profit analysis

## Implementation Strategy

### Data Volume Targets
- **Invoices**: 50-75 invoices spanning last 6 months
- **Payments**: 80-100 payment records with various methods
- **Guests**: Expand to 30-40 international guests
- **Reservations**: 60-80 completed stays for invoice generation
- **Fiscal Records**: Complete Croatian compliance records for all invoices

### Realistic Business Patterns
- **Seasonal Distribution**: 70% summer bookings (May-September), 30% off-season
- **Guest Nationalities**: 45% German, 25% Italian, 15% Austrian, 10% Croatian, 5% other
- **Booking Sources**: 60% Booking.com, 35% direct, 5% other
- **Payment Methods**: 40% card, 35% cash, 20% bank transfer, 5% Booking.com
- **Average Stay**: 3.5 nights (range 1-14 nights)

### Croatian Business Requirements
- **VAT Rate**: 25% (already included in base prices)
- **Tourism Tax**: €1.10 (low season) / €1.50 (high season) per person per night
- **OIB**: Hotel Porec tax ID (87246357068)
- **Invoice Format**: YYYY-NNN-NNNN (Croatian fiscal format)
- **Fiscal Codes**: Realistic JIR and ZKI codes for compliance

## Files to Modify
- `src/lib/hotel/state/HotelContext.tsx` - Extend generateSampleFinancialData function
- Potentially create helper functions for financial data generation

## Success Criteria
1. ✅ 50+ realistic invoices with proper Croatian format
2. ✅ Comprehensive payment records with all Croatian methods
3. ✅ Proper fiscal compliance records (OIB, JIR, ZKI)
4. ✅ Seasonal pricing variations across 6+ months  
5. ✅ Realistic guest demographics (Croatian tourism patterns)
6. ✅ Revenue analytics spanning multiple periods
7. ✅ All Croatian tax calculations (VAT 25%, tourism tax)
8. ✅ Investor-ready demonstration data

## Notes
- Focus on realistic Hotel Porec business scenarios
- Ensure all Croatian fiscal requirements are met
- Create data suitable for investor presentations
- Maintain existing data structure compatibility
- Use actual Hotel Porec room and pricing information

---
**Status**: Planning Complete - Ready to Begin Implementation