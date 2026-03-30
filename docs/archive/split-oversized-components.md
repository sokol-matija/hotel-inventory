# Split Oversized Components -- Refactoring Plan

## Pattern and Template

Every split follows the same structural pattern:

```
ComponentName/
  index.tsx              # Slim orchestrator (~80-150 lines). Default export.
  useComponentName.ts    # Hook: local state, handlers, derived values
  SectionA.tsx           # Pure presentational sub-component
  SectionB.tsx           # Pure presentational sub-component
  types.ts               # Shared interfaces/types (optional)
```

**Rules:**
1. Default export stays at the same module path (preserving consumer imports)
2. Sub-components receive data via props only
3. One custom hook per folder owns all state/mutations/handlers
4. Sub-components are colocated in the folder, not in a separate subfolder
5. Barrel re-exports are not used (consistent with codebase)

---

## 1. InvoicePaymentPage (553 lines)

**Path:** `src/components/hotel/finance/InvoicePaymentPage.tsx`
**Tests:** None | **Hooks:** None (all state inline)

### Proposed Sub-Components

```
finance/InvoicePaymentPage/
  index.tsx                    # Orchestrator
  useInvoicePaymentPage.ts     # 5 TQ queries, local state, handlers
  InvoiceStatsCards.tsx         # 4 KPI cards
  InvoiceFilterBar.tsx          # Search + status dropdown
  InvoiceTabNav.tsx             # Tab buttons
  InvoiceTable.tsx              # Invoice list with row actions
  PaymentTable.tsx              # Payment list
  InvoiceDetailDialog.tsx       # Dialog with fiscal info + QR code
  types.ts                      # PaymentMethodConfig, shared props
```

### Migration Steps
1. Create `useInvoicePaymentPage.ts` -- all queries, state, handlers
2. Extract `InvoiceStatsCards.tsx` (lines 185-234)
3. Extract `InvoiceTabNav.tsx`, `InvoiceFilterBar.tsx`
4. Extract `InvoiceTable.tsx`, `PaymentTable.tsx`
5. Extract `InvoiceDetailDialog.tsx` (lines 441-549)
6. Reduce `index.tsx` to orchestrator

---

## 2. GuestProfileModal (577 lines)

**Path:** `src/components/hotel/frontdesk/Guests/GuestProfileModal.tsx`
**Tests:** 645 lines (comprehensive) | **Hooks:** None (useForm inline)

### Proposed Sub-Components

```
Guests/GuestProfileModal/
  index.tsx                    # Dialog shell + form wrapper
  useGuestProfileForm.ts       # useForm setup, submit handler, isEditing toggle
  GuestBasicInfoCard.tsx        # 6-field card
  GuestPreferencesSection.tsx   # has_pets + is_vip checkboxes
  GuestNotesField.tsx           # Notes textarea
  GuestChildrenCard.tsx         # Children placeholder
  GuestStayHistoryCard.tsx      # Stay history (view-mode only)
  constants.ts                  # NATIONALITIES, LANGUAGES arrays
  formHelpers.ts                # Zod schema, guestToForm, emptyForm
```

### Test Impact
Existing 645-line test suite tests the component at dialog level -- continues to work unchanged against the orchestrator. Move test file into new folder.

---

## 3. LocationDetail (533 lines)

**Path:** `src/components/locations/LocationDetail.tsx`
**Tests:** None | **Hooks:** `useLocationState` (already extracted)

### Proposed Sub-Components

```
locations/LocationDetail/
  index.tsx                    # Orchestrator with DnD context
  LocationHeader.tsx            # Back link, title, action buttons
  LocationStatsCards.tsx         # 4 stat cards
  LocationFilterBar.tsx          # Search + category dropdown
  InventoryList.tsx              # SortableContext + items + DragOverlay
  SortableInventoryItem.tsx     # Extract from inline (155 lines -- biggest single win)
```

### Migration Steps
1. Extract `SortableInventoryItem` (lines 54-209) -- already self-contained
2. Extract `LocationHeader.tsx`, `LocationStatsCards.tsx`, `LocationFilterBar.tsx`
3. Extract `InventoryList.tsx`
4. Slim `index.tsx` to orchestrator

---

## 4. HotelTimeline (637 lines)

**Path:** `src/components/hotel/frontdesk/HotelTimeline.tsx`
**Tests:** Indirect (sub-component + hook tests)
**Hooks:** 5 already extracted (`useHotelTimelineState`, `useReservationActions`, `useTimelineModals`, `useTimelineDragCreate`, `useTimelineKeyboardShortcuts`)

### Proposed Sub-Components

```
frontdesk/HotelTimeline/
  index.tsx                    # Orchestrator: hooks + layout shell
  useHotelTimelineData.ts      # Combines 4 TQ queries + 3 mutations + virtual rooms effect
  TimelineToolbar.tsx           # 7-button toolbar
  TimelineModeBanner.tsx        # Conditional mode banner
  RoomStatusOverview.tsx        # Overview panel with date nav
  TimelineGrid.tsx              # Timeline header + floor sections
  TimelineModals.tsx            # All 6 modal compositions
```

### Migration Steps
1. Create `useHotelTimelineData.ts` -- extract TQ queries + mutations + virtual rooms
2. Extract `TimelineModeBanner.tsx` (lines 297-343)
3. Extract `TimelineToolbar.tsx` (lines 346-435)
4. Extract `RoomStatusOverview.tsx` (lines 438-539)
5. Extract `TimelineGrid.tsx` (lines 542-578)
6. Extract `TimelineModals.tsx` (lines 581-653)

---

## 5. ReservationPopup (666 lines)

**Path:** `src/components/hotel/frontdesk/Reservations/ReservationPopup.tsx`
**Tests:** None | **Hooks:** `useReservationPopup` (already extracted)

**Already partially split** -- 6 inline sub-components with typed props. The work is moving them to their own files.

### Proposed Sub-Components

```
Reservations/ReservationPopup/
  index.tsx                        # Orchestrator
  StatusActions.tsx                  # Move from inline
  CompanyCard.tsx                   # Move from inline
  GuestCard.tsx                     # Move from inline
  FiscalCard.tsx                    # Move from inline
  ReservationDetailsCard.tsx        # Move from inline
  PaymentCard.tsx                   # Move from inline
  MaintenanceReservationView.tsx    # Extract maintenance early-return
  ReservationPopupContent.tsx       # Normal reservation dialog body
```

This is the lowest-effort split -- mostly mechanical file moves since sub-components already have typed prop interfaces.

---

## 6. CreateBooking/index (533 lines)

**Already well-split.** Hook extracted, 7 section components extracted. The 533-line count is inflated by imports and whitespace. Rendered JSX is ~130 lines.

**Does NOT need further splitting.** Optional: extract focus-trap `useEffect` into a `useFocusTrap` hook.

---

## Implementation Order

| Priority | Component | Rationale |
|---|---|---|
| 1 | **InvoicePaymentPage** | Zero tests, zero shared hooks, no dependencies. Lowest risk. Establishes pattern. |
| 2 | **LocationDetail** | Single consumer, hook already extracted, `SortableInventoryItem` is a clean 155-line extraction |
| 3 | **GuestProfileModal** | 645-line test suite validates correctness post-split |
| 4 | **ReservationPopup** | Sub-components already exist inline -- mostly file moves |
| 5 | **HotelTimeline** | Central hub, most hooks already extracted. Needs careful DnD/keyboard testing |
| 6 | **CreateBooking/index** | Already well-split. Skip unless explicitly prioritized |

---

## Testing Strategy

| Component | Existing Tests | Strategy |
|---|---|---|
| InvoicePaymentPage | None | Write integration tests for orchestrator + unit tests for InvoiceTable and InvoiceDetailDialog |
| GuestProfileModal | 645 lines | Existing tests work unchanged against orchestrator. Move test file into new folder |
| LocationDetail | None | Write integration test + unit test for SortableInventoryItem |
| HotelTimeline | Indirect | Existing sub-component + hook tests remain. Add orchestrator smoke test |
| ReservationPopup | None | Write unit tests for GuestCard, FiscalCard, ReservationDetailsCard |
| CreateBooking | 407 lines (hook) | No changes needed |

**Rules:**
- Never delete tests during a split
- Test orchestrator at integration level (mount with mocked hooks)
- Test sub-components at unit level (pass props, assert output)
- Run full test suite after each component split

---

## Files Needing Import Updates After Each Split

| Component | Consumer files |
|---|---|
| InvoicePaymentPage | `routes/hotel/finance/invoices.tsx`, `routes/hotel/finance/index.tsx` |
| GuestProfileModal | `Guests/GuestManagementPage.tsx` |
| LocationDetail | `routes/_layout/locations/$id.tsx` |
| HotelTimeline | `CalendarView.tsx` |
| ReservationPopup | `HotelTimeline.tsx`, `ReservationsListV2Page.tsx` |

Most imports resolve automatically via directory index resolution (`./ComponentName` resolves to `./ComponentName/index.tsx`).
