# Refactoring Plan: `useReservationActions`

## 1. Current State Analysis

**File:** `src/lib/hooks/useReservationActions.ts` (669 lines)
**Test file:** `src/lib/hooks/useReservationActions.test.ts` (694 lines)
**Consumer:** Single consumer -- `HotelTimeline.tsx` at line 146

### What the hook does

`useReservationActions` is a monolith hook that manages every mutation a user can perform on a reservation from the timeline UI:

1. **Optimistic state layer** (lines 197-212) -- `optimisticOverrides` Map plus `localReservations` memo that overlays optimistic data on top of TanStack Query server state.
2. **handleMoveReservation** (lines 214-427) -- The largest function (~210 lines). Handles drag-and-drop moves including three distinct code paths: virtual-to-real allocation, real-to-virtual unallocation, and regular room-to-room moves. Also triggers the room-change dialog when room type changes.
3. **handleMoveReservationArrow** (lines 429-457) -- Keyboard shortcut handler. Thin wrapper that delegates to `handleMoveReservation` with a +/-1 day offset.
4. **handleConfirmRoomChange** (lines 459-481) -- Confirms a room change from the dialog. Delegates to the standalone `executeRoomMutation` helper with `'standard'` variant.
5. **handleFreeUpgrade** (lines 483-505) -- Confirms a free upgrade from the dialog. Delegates to `executeRoomMutation` with `'upgrade'` variant.
6. **handleResizeReservation** (lines 507-631) -- Handles drag-resize of reservation edges. Validates minimum duration and conflicts, performs optimistic update, regenerates charges.
7. **handleDrinksOrderComplete** (lines 633-657) -- Appends room-service order text to `internal_notes`. Completely unrelated to timeline manipulation.

Plus a standalone helper outside the hook:

8. **executeRoomMutation** (lines 59-181) -- Shared logic for `handleConfirmRoomChange` and `handleFreeUpgrade`. Performs the optimistic update, conditionally regenerates charges, and displays notifications.

### Why it is too large

- **Mixed concerns**: Timeline drag/drop operations, keyboard shortcuts, room-change dialog confirmation, and room-service billing are bundled together
- **Duplicated charge regeneration**: The pattern of calling `unifiedPricingService.generateCharges()` then deleting and reinserting `reservation_charges` rows appears three times with near-identical code
- **Testing surface**: The test file is 694 lines because every scenario for every action lives in one describe tree. Mocks are heavyweight (6 hoisted mocks, 4 module mocks)
- **Dependency fan-out**: The hook imports 9 modules. Each sub-hook would only need a subset

---

## 2. Proposed Split

### 2a. Extract a shared utility: `regenerateReservationCharges`

The charge-regeneration block is copy-pasted three times. Extract it into a pure async function.

**File:** `src/lib/hotel/services/chargeRegeneration.ts`

```typescript
regenerateReservationCharges(params: {
  reservationId: number;
  roomId: number;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  childrenCount: number;
  guestDisplayName: string;
  hasPets: boolean;
  parkingRequired: boolean;
}): Promise<void>
```

### 2b. Split into four focused hooks

| New Hook | Actions | Approx. Lines | Dependencies |
|---|---|---|---|
| `useOptimisticReservations` | `localReservations`, `updateReservationInState` | ~30 | `useState`, `useMemo`, `useCallback` only |
| `useMoveReservation` | `handleMoveReservation`, `handleMoveReservationArrow`, `handleResizeReservation` | ~170 | `useOptimisticReservations`, rooms, guests, `OptimisticUpdateService`, `virtualRoomService`, `chargeRegeneration` |
| `useRoomChangeActions` | `handleConfirmRoomChange`, `handleFreeUpgrade` | ~60 | `useOptimisticReservations`, rooms, guests, `OptimisticUpdateService`, `chargeRegeneration` (absorbs `executeRoomMutation`) |
| `useRoomServiceOrder` | `handleDrinksOrderComplete` | ~30 | rooms, `updateReservation` only |

---

## 3. File Structure After Refactoring

```
src/lib/hooks/
  useReservationActions.ts              # Barrel -- composes sub-hooks, re-exports types (~40 lines)
  useReservationActions.test.ts         # Integration smoke tests (~80 lines)
  reservation-actions/
    useOptimisticReservations.ts
    useOptimisticReservations.test.ts
    useMoveReservation.ts
    useMoveReservation.test.ts
    useRoomChangeActions.ts
    useRoomChangeActions.test.ts
    useRoomServiceOrder.ts
    useRoomServiceOrder.test.ts
    index.ts                           # Re-exports all sub-hooks

src/lib/hotel/services/
    chargeRegeneration.ts              # Extracted utility
    chargeRegeneration.test.ts
```

---

## 4. Migration Steps

All steps designed so app compiles, tests pass, and `HotelTimeline.tsx` is never modified until the very end (optional).

### Step 1: Extract `regenerateReservationCharges` utility
1. Create `src/lib/hotel/services/chargeRegeneration.ts` with the extracted function
2. Create unit tests for it
3. Replace the three inline blocks in `useReservationActions.ts` with calls to the new function
4. Run tests -- all 694 lines of existing tests must still pass

### Step 2: Extract `useOptimisticReservations`
1. Move `optimisticOverrides` state, `localReservations` memo, and `updateReservationInState` callback
2. In `useReservationActions.ts`, call `useOptimisticReservations(reservations)` and destructure
3. Create focused tests

### Step 3: Extract `useRoomServiceOrder`
Start with the simplest, most independent action.
1. Move `handleDrinksOrderComplete` -- its only deps are `rooms` and `updateReservation`
2. Create focused tests

### Step 4: Extract `useRoomChangeActions`
1. Move `executeRoomMutation` and the `handleConfirmRoomChange` / `handleFreeUpgrade` callbacks
2. Accept `updateReservationInState` from `useOptimisticReservations` as a parameter
3. Create focused tests

### Step 5: Extract `useMoveReservation`
1. Move `handleMoveReservation`, `handleMoveReservationArrow`, and `handleResizeReservation`
2. Accept `updateReservationInState` and `localReservations` from `useOptimisticReservations`
3. Create focused tests

### Step 6: Create barrel index + slim down orchestrator
1. Create `src/lib/hooks/reservation-actions/index.ts` re-exporting all four sub-hooks
2. Slim `useReservationActions.ts` to ~40-line orchestrator
3. Trim original test file to integration smoke test (~80 lines)

### Step 7 (Optional): Update consumer to use sub-hooks directly
`HotelTimeline.tsx` can import sub-hooks individually if desired.

---

## 5. Impact on Tests

| Original test block | New location | Changes |
|---|---|---|
| `describe('localReservations')` (2 tests) | `useOptimisticReservations.test.ts` | Mocks reduced to `OptimisticUpdateService` only |
| `describe('handleMoveReservation')` (6 tests) | `useMoveReservation.test.ts` | Same mocks, hook params change slightly |
| `describe('handleMoveReservationArrow')` (2 tests) | `useMoveReservation.test.ts` | Same file |
| `describe('handleConfirmRoomChange')` (3 tests) | `useRoomChangeActions.test.ts` | No `virtualRoomService` mock needed |
| `describe('handleFreeUpgrade')` (2 tests) | `useRoomChangeActions.test.ts` | Same file |
| `describe('handleResizeReservation')` (3 tests) | `useMoveReservation.test.ts` | Same structure |
| `describe('handleDrinksOrderComplete')` (2 tests) | `useRoomServiceOrder.test.ts` | Drastically simpler mocks |

**Net effect:** Total test lines ~750 (vs 694 today) but each file is focused and independently runnable.

---

## 6. Barrel Export Pattern

```typescript
// useReservationActions.ts -- Thin orchestrator (backward-compatible barrel)
export function useReservationActions(params: UseReservationActionsParams): UseReservationActionsReturn {
  const { localReservations, updateReservationInState } = useOptimisticReservations(params.reservations);

  const { handleMoveReservation, handleMoveReservationArrow, handleResizeReservation } = useMoveReservation({
    localReservations, rooms: params.rooms, guests: params.guests,
    selectedReservation: params.selectedReservation,
    showRoomChangeDialog: params.showRoomChangeDialog,
    updateReservationInState, updateReservation: params.updateReservation,
  });

  const { handleConfirmRoomChange, handleFreeUpgrade } = useRoomChangeActions({
    localReservations, rooms: params.rooms, guests: params.guests,
    roomChangeDialog: params.roomChangeDialog,
    updateReservationInState, updateReservation: params.updateReservation,
    closeRoomChangeDialog: params.closeRoomChangeDialog,
  });

  const { handleDrinksOrderComplete } = useRoomServiceOrder({
    rooms: params.rooms, updateReservation: params.updateReservation,
  });

  return {
    localReservations, handleMoveReservation, handleMoveReservationArrow,
    handleConfirmRoomChange, handleFreeUpgrade, handleResizeReservation,
    handleDrinksOrderComplete,
  };
}
```

Existing import in `HotelTimeline.tsx` continues to work with zero changes.

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Stale closure on `localReservations` across sub-hooks | `useOptimisticReservations` returns the memo; orchestrator passes it to every sub-hook. React's referential identity guarantees consistency within a render |
| `handleMoveReservationArrow` depends on `handleMoveReservation` | Both live in `useMoveReservation`, so the dependency stays internal |
| `executeRoomMutation` is a standalone function, not a hook | Moves into `useRoomChangeActions.ts` as a module-level helper (same pattern as today) |
| Direct `supabase` calls in the hook (charge regeneration) | Extracted to `chargeRegeneration.ts`, making the supabase dependency explicit and testable in one place |
