# Complete Phase 9: Derive All Totals from reservation_charges

## Background

The pricing system was refactored so that `generateCharges()` in `UnifiedPricingService` creates proper `ReservationCharge` line-items in the `reservation_charges` table. Several consumers still either hardcode `0` or rely on absent charge data instead of summing from `reservation_charges`. Five TODO comments (plus one bonus in ReservationService) mark these incomplete migration points.

## Data Source Reference

| Context | Method |
|---|---|
| React component (single reservation) | `useReservationCharges(reservationId)` hook |
| React component (batch) | `useBatchReservationCharges(reservationIds)` -- returns `Record<number, number>` |
| Non-React code (services) | Direct Supabase query: `supabase.from('reservation_charges').select('*').eq('reservation_id', id)` |

---

## TODO 1: CalendarView.tsx -- Today's Revenue (line 36-37)

**Current code:**
```ts
const todayRevenue = todayCheckIns.reduce((_sum, _reservation) => _sum + 0, 0);
```

**Fix:** Import `useBatchReservationCharges`, pass today's check-in IDs, sum the totals.

**Difficulty:** Low. The batch hook is an exact fit.
**Risk:** Low. Dashboard display only.

---

## TODO 2: calendarUtils.ts -- Revenue Projection (line 347-348)

**Current code:**
```ts
const revenueProjection = 0;
```

**Context:** `getCalendarStatistics()` is a pure utility function (not a hook). It has **zero external callers** currently.

**Fix (Option A -- preferred):** Add a `chargeTotals?: Record<number, number>` parameter. Compute: `reservationsInRange.reduce((sum, r) => sum + (chargeTotals?.[r.id] ?? 0), 0)`.

**Difficulty:** Low. No callers to update.
**Risk:** Very low.

---

## TODO 3: pdfInvoiceGenerator.ts -- PDF Invoice Grand Total (line 165)

**Current code:**
```ts
const grandTotal = charges && charges.length > 0
  ? charges.reduce((sum, c) => sum + c.total, 0) : 0;
```

**The generator code is actually correct.** The problem is callers that don't pass charges:
- `ReservationService.generateFiscalInvoice` -- fetches charges but doesn't pass them to PDF generator
- `InvoicePaymentPage.handleDownloadPDF` -- doesn't fetch charges at all

**Fix:** Fix the callers to load and pass charges. The generator itself just needs the TODO comment removed.

**Difficulty:** Medium. Multiple caller files.
**Risk:** Medium. PDF invoices are customer-facing.

---

## TODO 4: pdfInvoiceGenerator.ts -- Thermal Receipt Grand Total (line 383)

**Current code:** Identical pattern to TODO 3.

**Fix:** `ReservationService.printThermalReceipt` needs to fetch charges and pass them.

**Difficulty:** Medium. Same pattern as TODO 3.
**Risk:** Medium. Thermal receipts are for fiscal compliance.

---

## TODO 5: EmailTestService.ts -- Test Notification Total (line 189)

**Current code:**
```ts
totalAmount: 0, // TODO Phase 9: derive from reservation_charges
```

**Context:** This is test-only infrastructure. `BookingNotificationData.totalAmount` is optional.

**Fix (Option A):** Query `reservation_charges` for the test reservation and sum totals.
**Fix (Option B -- simpler):** Change to `totalAmount: undefined` with a comment that test notifications use synthetic data.

**Difficulty:** Low.
**Risk:** Very low. Test infrastructure only.

---

## Bonus: ReservationService.ts -- Fiscal Invoice Unit Price (line 228)

**Current code:**
```ts
items: [{
  name: `Room ${room.room_number}`,
  quantity: reservation.number_of_nights ?? 1,
  unitPrice: 0, // Phase 9 migration
  ...
}]
```

**Fix:** Map loaded charges into proper fiscal line items instead of a single item with `unitPrice: 0`.

**Difficulty:** Medium.
**Risk:** Medium-High. Affects Croatian Tax Authority submissions.

---

## Migration Steps (Recommended Order)

| Step | File | TODO | Rationale |
|---|---|---|---|
| 1 | `EmailTestService.ts` | #5 | Lowest risk, test-only |
| 2 | `calendarUtils.ts` | #2 | No callers, zero blast radius |
| 3 | `CalendarView.tsx` | #1 | Dashboard display only, uses existing batch hook |
| 4 | `pdfInvoiceGenerator.ts` (both) | #3, #4 | Fix callers not generator. Changes in `ReservationService.ts` and `InvoicePaymentPage.tsx` |
| 5 | `ReservationService.ts` | Bonus | Croatian fiscal compliance. Test with staging |

Steps 1-3 can be done independently. Steps 4 and 5 share `ReservationService.ts`.

---

## Testing Strategy

**Unit tests:**
- `EmailTestService`: Verify charge query and summed total
- `calendarUtils.ts`: Test with and without `chargeTotals` map
- `pdfInvoiceGenerator.ts`: Assert charges are passed by callers

**Manual checklist:**
1. Calendar View -- Today's Revenue card shows non-zero for reservations with charges
2. PaymentDetailsModal -- Print Invoice -- PDF total matches charges tab
3. InvoicePaymentPage -- Download PDF -- total is correct
4. Fiscal invoice generation -- receipt total and line items correct
5. EmailTestPage -- test notification includes/omits total gracefully

**Regression concerns:**
- Reservations with zero charges (room closures, unallocated) should show 0, not error
- The `charges?.length > 0` guard handles the empty case
- Batch hook returns `{}` for empty arrays
