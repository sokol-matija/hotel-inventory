# Removal Plan: Deprecated Code

## Analysis Summary

### 1. `GuestChild` interface in `src/lib/hotel/types.ts` (lines 48-53)

**Consumers found (3 files):**

| File | Usage |
|---|---|
| `BookingService.ts` | `children?: GuestChild[]` field on `BookingData` interface |
| `UnifiedPricingService.ts` | Parameter type in deprecated `calculateTotal`, `calculateAccommodationCosts`, `calculateServiceFees` |
| `CreateBooking/types.ts` | `children: GuestChild[]` field on `BookingGuest` interface |

**Key finding:** The `children: GuestChild[]` field on `BookingGuest` is always assigned `[]` (empty array) when creating guest objects. No code ever reads `.children` from a `BookingGuest`. The field is structurally dead. Similarly, `BookingData.children` in BookingService is never passed by any caller. In UnifiedPricingService, `GuestChild` is only used by the legacy methods which are themselves deprecated with zero external callers.

**Verdict: Safe to delete now.**

---

### 2. `PricingCalculation` interface in `src/lib/hotel/types.ts` (lines 77-99)

**Consumers found (1 file):**

| File | Usage |
|---|---|
| `UnifiedPricingService.ts` | Return type of deprecated `calculateTotal()` method |

No other file imports or references `PricingCalculation`. The PDF generator already uses `ReservationCharge` (the replacement type).

**Verdict: Safe to delete now.**

---

### 3. `calculateTotal()` method in `UnifiedPricingService.ts` (line 368)

**Callers found: Zero.** All external consumers call `.generateCharges()`:
- `useReservationActions.ts` (3 call sites)
- `VirtualRoomService.ts`
- `EditReservationSheet.tsx`
- `PaymentDetailsModal.tsx`
- `useBookingPricing.ts`

The test file exclusively tests `generateCharges` and `getSeasonalPeriod`.

**Additional legacy code that can be removed alongside:**
- `calculateReservationPricing()` -- called only by `calculateTotal`
- `calculateAccommodationCosts()` -- called only by `calculateReservationPricing`
- `calculateServiceFees()` -- called only by `calculateReservationPricing`
- `calculateVATCompliantPricing()` -- called only by `calculateAccommodationCosts`
- `ReservationPricingParams` type -- only used by legacy path
- `PricingResult` type -- only used by legacy path
- `VATBreakdown` type -- only used by legacy path

**Verdict: Safe to delete now, along with entire legacy method chain.**

---

## Removal Steps

### Step 1: Remove legacy method chain from UnifiedPricingService.ts

1. Remove import of `GuestChild` and `PricingCalculation` (keep `SeasonalPeriod` and `ReservationCharge`)
2. Delete `ReservationPricingParams` interface
3. Delete `VATBreakdown` interface
4. Delete `PricingResult` interface
5. Delete entire LEGACY section: `calculateReservationPricing()` and `calculateTotal()`
6. Delete private helpers: `calculateVATCompliantPricing()`, `calculateAccommodationCosts()`, `calculateServiceFees()`

### Step 2: Remove GuestChild from BookingService.ts

1. Remove `GuestChild` from import
2. Remove `children?: GuestChild[]` field from `BookingData` interface

### Step 3: Remove GuestChild from CreateBooking/types.ts

1. Remove `import type { GuestChild } from '@/lib/hotel/types'`
2. Remove `children: GuestChild[]` field from `BookingGuest`
3. In `useBookingGuests.ts`: remove `children: []` at lines 24 and 123

### Step 4: Delete interfaces from types.ts

1. Delete `GuestChild` interface (lines 48-53)
2. Delete `PricingCalculation` interface (lines 73-99)

### Step 5: Verify

1. `npx tsc --noEmit` -- confirm no type errors
2. `vitest run` -- confirm no regressions
3. Verify `UnifiedPricingService.test.ts` passes (only tests `generateCharges`)
4. Verify `BookingService.test.ts` passes

---

## Impact Assessment

| Area | Impact | Risk |
|---|---|---|
| Runtime behavior | None -- all deleted code paths have zero external callers | None |
| Type safety | Interfaces removed are unused outside deprecated consumers | None |
| Test coverage | No tests cover deprecated methods | None |
| Lines removed | ~150-170 lines across 5 files | Positive |
