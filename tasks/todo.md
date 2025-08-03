# Payment and Invoice Tasks

## Current Issue Analysis
- When creating booking, payment status shows as "paid" already instead of "pending"
- Need to reuse existing payment information view on in-house module  
- Add PDF invoice button to existing payment breakdown view

## Todo Items

### Fix Payment Status Issue
- [ ] Investigate why new reservations default to paid status
- [ ] Change new reservation payment status to "incomplete-payment" or "pending"
- [ ] Update reservation creation logic in HotelContext.tsx

### Implement Payment Information View in In-House Module
- [ ] Find existing checkout payment breakdown component
- [ ] Create reusable PaymentBreakdownView component
- [ ] Add PDF invoice button to payment breakdown
- [ ] Integrate payment view into in-house module

### PDF Invoice Integration
- [ ] Reuse existing PDF generation system
- [ ] Add "Print PDF Invoice" button to payment breakdown
- [ ] Ensure PDF opens/downloads properly from payment view

## Files to Investigate
- `src/lib/hotel/state/HotelContext.tsx` - Reservation creation logic
- `src/components/hotel/frontdesk/CheckInOut/CheckOutWorkflow.tsx` - Payment processing
- Payment breakdown components (need to locate)
- In-house module components (need to locate)

## Expected Outcome
- New bookings should show payment as pending until checkout
- In-house module should have same payment breakdown view as checkout
- PDF invoice should be easily accessible from payment information view