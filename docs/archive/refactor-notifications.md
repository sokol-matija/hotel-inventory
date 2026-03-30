# Refactoring Plan: `src/lib/notifications.ts`

## 1. Current State Analysis

**File:** `src/lib/notifications.ts` (574 lines, single `HotelNotification` class of 560 lines)

**What the class does:**

The `HotelNotification` class is a custom in-browser toast notification system built on GSAP animations. It is exported as a singleton (`new HotelNotification()`) and used across 13 source files with 78 total call sites. It handles four notification types: `success`, `error`, `info`, and `warning`.

**Five separate concerns are bundled into one class:**

| Concern | Lines (approx.) | Description |
|---|---|---|
| DOM container bootstrapping | 25-77 | `createNotificationContainer()` -- creates a root `<div>` with template HTML and appends to `document.body` |
| CSS injection | 79-281 | `applyStyles()` -- injects a `<style>` block with ~200 lines of raw CSS |
| SVG icon selection | 335-349 | Inline switch statement producing SVG `<path>` strings for each type |
| Stacked notification DOM creation | 315-386 | `createStackedNotification()` -- creates a fresh notification card element |
| GSAP animation orchestration | 388-522 | `animateNotification()` and `positionNotifications()` -- entrance/exit, stacking |

**Why it is too large:**

- Mixes **presentation** (CSS), **structure** (DOM/HTML), **behavior** (animation timelines), and **public API** (debounce, show/success/error/info/warning) in a single class
- ~200-line CSS string embedded as a JavaScript template literal -- impossible to lint, format, or tree-shake
- Constructor side-effect pattern (immediately manipulates `document.body` on import) -- problems for SSR and testing
- Zero tests despite 78 call sites

**Dual toast system note:**

The app runs two competing toast systems simultaneously:
- Custom GSAP-based `hotelNotification` singleton (78 call sites in 13 files)
- Sonner `toast.*` (6 call sites in auth and NFC pages)

---

## 2. Dead / Unused Code

| Item | Evidence | Recommendation |
|---|---|---|
| `this.container`, `this.notification`, `this.progressBar` instance properties | Assigned in `createNotificationContainer()` but never read by any other method. `show()` delegates to `createStackedNotification()` which builds fresh DOM nodes every time. | **Remove** |
| Initial HTML template (lines 41-65) | Created by `createNotificationContainer()` but never reused -- `createStackedNotification()` builds new elements | **Remove**, collapse into a simple "ensure styles injected" guard |
| `show()` public method | Not called directly anywhere in the codebase. All 78 call sites use convenience methods (`success`, `error`, `info`, `warning`). | Make `private` |

---

## 3. Proposed Split

### Phase A -- Extract CSS to a standalone file (risk: zero)

Move the ~200-line CSS string out of JavaScript into a proper CSS file. This alone removes ~35% of the file.

### Phase B -- Extract icons to a lookup map (risk: zero)

Replace the switch statement with a simple `Record<NotificationType, string>`.

### Phase C -- Separate DOM creation from animation (risk: low)

Split into pure functions: create element, animate element, manage stack positioning.

### Phase D -- Thin public API (risk: low)

Orchestrator with debounce map + active stack, calling create + animate.

### Phase E (optional, future) -- Consolidate onto sonner

Sonner is already mounted in `__root.tsx` with `richColors closeButton`. Migrating would let you delete the GSAP notification system entirely and drop GSAP dependency from 4 files to 2 (ReservationBlock + LabelBadge). Separate effort.

---

## 4. File Structure After Refactoring

```
src/lib/notifications/
  index.ts                  -- public API: default export with .success/.error/.info/.warning
  notify.ts                 -- debounce logic + active-stack state, orchestrates create + animate
  createToastElement.ts     -- pure DOM builder function
  animateToast.ts           -- GSAP timeline factory
  positionStack.ts          -- manages vertical stacking of active notifications
  icons.ts                  -- SVG path strings by NotificationType
  notification.css          -- all styles (imported by notify.ts or index.ts)
  types.ts                  -- NotificationType export
```

Estimated sizes after split:

| File | Lines |
|---|---|
| `notification.css` | ~200 |
| `notify.ts` | ~60 |
| `createToastElement.ts` | ~50 |
| `animateToast.ts` | ~80 |
| `positionStack.ts` | ~30 |
| `icons.ts` | ~20 |
| `types.ts` | ~3 |
| `index.ts` | ~10 |

---

## 5. Migration Steps

1. **Create `src/lib/notifications/` directory and `types.ts`** -- Move `NotificationType` type export
2. **Extract `notification.css`** -- Cut CSS string from `applyStyles()`, replace with `import './notification.css'`
3. **Extract `icons.ts`** -- Create SVG path record, replace switch in `createStackedNotification`
4. **Extract `createToastElement.ts`** -- Move body of `createStackedNotification()` into standalone function
5. **Extract `animateToast.ts` and `positionStack.ts`** -- Move `animateNotification()`, `positionNotifications()`, and `activeNotifications` state
6. **Create `notify.ts` as orchestrator** -- Contains debounce map, calls create + animate
7. **Create `index.ts` barrel** -- Default-exports notify singleton so `import hotelNotification from '../notifications'` resolves unchanged
8. **Delete `src/lib/notifications.ts`** -- Old file fully replaced by directory module
9. **Remove dead code** -- Delete unused instance properties, HTML template, make `show()` private
10. **Verify** -- `tsc --noEmit`, manual test each notification type, grep imports

---

## 6. Risks and Notes

- **Import paths are stable.** All 13 consumer files import from `'../notifications'` or `'@/lib/notifications'`. A directory with `index.ts` resolves identically to the old `.ts` file.
- **GSAP is only used in 4 files total.** If sonner consolidation happens later (Phase E), GSAP drops to 2 files.
- **No tests exist.** Adding tests for `notify.ts` after the split would be straightforward since debounce and stacking logic would be isolated.

### Critical Files for Implementation
- `src/lib/notifications.ts` -- the file being decomposed
- `src/lib/hooks/useReservationActions.ts` -- largest consumer (20 call sites)
- `src/lib/hotel/services/ReservationService.ts` -- second largest consumer (15 call sites)
- `src/routes/__root.tsx` -- where sonner `<Toaster>` is mounted
