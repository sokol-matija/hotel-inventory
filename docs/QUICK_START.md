# Quick Start: Hotel Porec Architecture

A hotel management system for a Croatian coastal hotel. Core modules: Front Desk (14-day timeline), Inventory, Room Service, Finance/Fiscalization, and Guest Management.

---

## Architecture at a Glance

```
React Components (UI)
    |
    v
TanStack Query Hooks (data fetching + cache)
    |
    v
Services (business logic: pricing, conflicts, bookings)
    |
    v
Supabase (PostgreSQL + Auth + Realtime)
```

**Key rule:** Components never call Supabase directly. All data flows through TQ hooks in `src/lib/queries/hooks/`.

---

## Data Flow: Creating a Reservation

1. User drags across timeline to select Room 401, Jun 15-17
2. `CreateBookingModal` opens with `useCreateBookingForm` hook
3. `ConflictDetectionService` checks for date overlaps
4. `UnifiedPricingService` generates charge line-items:
   - Accommodation per season block (A/B/C/D rates)
   - Tourism tax (EUR 1.60 summer / EUR 1.10 winter per person/night)
   - Service fees (parking EUR 7/night, pets EUR 20/night)
   - Short-stay supplement (+20% for < 3 nights)
   - Child discounts (free < 3, 50% off 3-6, 20% off 7-13)
5. `createFullBooking()` inserts reservation + charges into Supabase
6. TanStack Query cache invalidated, UI re-renders
7. Supabase Realtime broadcasts to other connected browsers

---

## Pricing System

The pricing engine splits stays into **season blocks** when a stay crosses season boundaries:

| Season | Months | Rate Level |
|--------|--------|------------|
| A | Jan-Apr, Dec | Low (winter) |
| B | May, Oct-Nov | Shoulder |
| C | Jun, Sep | Summer |
| D | Jul-Aug | Peak |

Example: 5-night stay Jun 29 to Jul 4 becomes two blocks:
- Season C: Jun 29-30 (2 nights at C rate)
- Season D: Jul 1-3 (3 nights at D rate)

Charges are stored as line-items in `reservation_charges`, not as summary fields on the reservation.

---

## Key Files

| File | Purpose |
|---|---|
| `src/index.tsx` | App entry point, boot sequence |
| `src/router.ts` | TanStack Router setup with auth guard |
| `src/stores/authStore.ts` | Zustand auth store (only global store) |
| `src/lib/supabase.ts` | Supabase client connection |
| `src/lib/queries/queryKeys.ts` | Central cache key registry |
| `src/lib/queries/hooks/useReservations.ts` | Reservation CRUD with optimistic updates |
| `src/lib/queries/hooks/useRealtimeSync.ts` | WebSocket sync for live collaboration |
| `src/lib/hotel/services/UnifiedPricingService.ts` | Pricing orchestrator |
| `src/lib/hotel/services/SeasonalRateService.ts` | Season detection + rate lookup |
| `src/lib/hotel/services/GuestPricingCalculator.ts` | Pure charge calculation functions |
| `src/lib/hotel/services/ConflictDetectionService.ts` | Booking conflict prevention |
| `src/lib/hotel/services/BookingService.ts` | Multi-step booking creation |
| `src/lib/hotel/types.ts` | Domain types and constants |
| `src/components/hotel/frontdesk/HotelTimeline.tsx` | Main timeline UI (core feature) |

---

## Running the App

```bash
git clone <repo-url>
cd hotel-inventory
npm install
cp .env.example .env.local   # Add Supabase keys
npm run dev                   # http://localhost:5173
```

---

## Validation

```bash
npm run validate:fast   # typecheck + lint + tests + build (~22s)
```

---

**Last Updated:** 2026-03-29
