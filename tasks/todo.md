# Hotel Timeline Expansion Controls Implementation Plan

## Overview
Implement button-based expansion controls for reservations in the HotelTimeline component. These controls will appear on reservation blocks when expansion mode is active and allow users to expand/contract reservations by clicking buttons instead of dragging.

## Tasks

### ✅ 1. Analyze Current Code Structure
- Read and understand the HotelTimeline.tsx component
- Identify the ReservationBlock component structure
- Understand the existing expansion mode state management
- Review the onResizeReservation prop and its usage

### ⏳ 2. Design Expansion Controls
- Left side controls: ← (expand left to previous day PM) and + (contract from left)
- Right side controls: → (expand right to next day AM) and - (contract from right)
- Controls should be small circular buttons
- Only show when `isExpansionMode` is true
- Style with appropriate colors (green for expand, red for contract)

### ⏳ 3. Update ReservationBlock Component
- Add expansion controls to the reservation block JSX
- Position controls at the left and right edges of reservation blocks
- Implement onClick handlers that call `onResizeReservation` prop
- Ensure controls don't interfere with existing drag-and-drop functionality
- Style controls to be clearly visible and clickable

### ⏳ 4. Implement Control Logic
- Left expand (←): Move check-in to previous day PM (15:00)
- Left contract (+): Move check-in to next day PM (15:00)
- Right expand (→): Move check-out to next day AM (11:00)
- Right contract (-): Move check-out to previous day AM (11:00)
- Handle edge cases (beginning/end of timeline, minimum stay requirements)

### ⏳ 5. Style the Controls
- Use consistent styling with existing codebase
- Small circular buttons with appropriate icons
- Green color for expansion buttons
- Red color for contraction buttons
- Proper hover states and transitions
- Position controls using absolute positioning at edges

### ⏳ 6. Handle Edge Cases
- Prevent expansion beyond timeline boundaries
- Prevent contraction that would make reservation too short
- Prevent conflicts with existing reservations
- Show appropriate feedback for invalid operations

### ⏳ 7. Test Implementation
- Test controls appear only when expansion mode is active
- Test expansion/contraction logic works correctly
- Verify controls don't interfere with drag-and-drop
- Test edge cases and error handling
- Ensure styling is consistent and responsive

## Implementation Notes

- The existing `handleResizeReservation` function needs to be enhanced to actually implement the resize logic
- Controls should be positioned using absolute positioning within the reservation block
- Use existing icons from lucide-react for consistency
- Follow the existing half-day system (PM for check-in, AM for check-out)
- Maintain the existing reservation positioning math and grid system

## Files to Modify

1. `/Users/msokol/Dev/Repos/2-Personal/hotel-inventory/src/components/hotel/frontdesk/HotelTimeline.tsx` - Main component with ReservationBlock

## Success Criteria

- [ ] Expansion controls appear only when `isExpansionMode` is true
- [ ] Controls are positioned at the edges of reservation blocks
- [ ] Left side has ← and + buttons, right side has → and - buttons
- [ ] Clicking controls calls `onResizeReservation` with appropriate parameters
- [ ] Controls have proper styling and hover states
- [ ] Controls don't interfere with existing drag-and-drop functionality
- [ ] Edge cases are handled gracefully