# Real-Time Status Update System Implementation Plan

## Overview
Implement real-time status updates for hotel reservations so that when users click "Check In" or "Check Out" buttons in the ReservationPopup, the calendar immediately reflects the status changes with proper color coding.

## Current State Analysis
- ✅ CalendarView displays reservations from SAMPLE_RESERVATIONS using `reservationsToCalendarEvents()`
- ✅ ReservationPopup has status change buttons with `onStatusChange` prop
- ✅ Status colors defined in RESERVATION_STATUS_COLORS
- ❌ No connection between popup status changes and calendar updates
- ❌ No global state management for reservations

## Implementation Tasks

### 1. Create Global State Management Context
- [ ] Create `src/lib/hotel/state/HotelContext.tsx`
  - Define HotelContextType interface with reservations array and update functions
  - Implement optimistic updates with localStorage persistence
  - Add loading states and error handling
  - Include rollback mechanism for failed updates

### 2. Update CalendarView Component
- [ ] Replace SAMPLE_RESERVATIONS with context state
- [ ] Update calendarEvents to use context reservations
- [ ] Add loading indicator support
- [ ] Ensure calendar re-renders when reservations change

### 3. Update ReservationPopup Component  
- [ ] Connect status change buttons to context actions
- [ ] Add loading states during status updates
- [ ] Include error handling with user feedback
- [ ] Ensure popup updates immediately on status change

### 4. Integration and Testing
- [ ] Wrap CalendarView with HotelContext provider
- [ ] Test immediate color updates on status changes
- [ ] Verify localStorage persistence across page refreshes
- [ ] Test error handling and rollback functionality
- [ ] Ensure TypeScript compilation passes

## Technical Implementation Details

### HotelContext Structure
```tsx
interface HotelContextType {
  reservations: Reservation[];
  updateReservationStatus: (id: string, newStatus: ReservationStatus) => Promise<void>;
  isUpdating: boolean;
  error: string | null;
}
```

### Optimistic Update Flow
1. User clicks status button → UI immediately updates calendar color
2. Show loading indicator during async operation
3. Persist change to localStorage (simulate API call)
4. On success: keep the change
5. On error: rollback to previous state and show error message

### File Modifications Required
- `/src/components/hotel/frontdesk/CalendarView.tsx` (line 233: calendarEvents)
- `/src/components/hotel/frontdesk/Reservations/ReservationPopup.tsx` (line 513: onStatusChange)
- Create new: `/src/lib/hotel/state/HotelContext.tsx`

## Success Criteria
- ✅ Click "Check In" → Calendar immediately shows green color
- ✅ Click "Check Out" → Calendar immediately shows gray color  
- ✅ Status changes persist after page refresh
- ✅ Smooth UX with loading indicators
- ✅ Proper error handling with user feedback
- ✅ TypeScript compilation passes
- ✅ No breaking changes to existing functionality

## Expected Impact
This will complete the missing piece in the hotel management system user workflow, providing immediate visual feedback when staff change reservation statuses, which is critical for front desk operations.

## Review Section
*To be completed after implementation*