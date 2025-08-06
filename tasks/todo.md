# Hotel Timeline - Remove Drag-Based Resize System

## Task Overview
Remove the current drag-based resize system from the HotelTimeline component while preserving all other timeline functionality, especially the drag-and-drop move functionality.

## Analysis Summary
The current resize system has multiple implementations:
1. **Lines 426-481**: Old resize handle in ReservationBlock with ew-resize cursor and mouse events
2. **Lines 719-761**: Expansion mode resize handles with left (check-in) and right (check-out) drag handles
3. **State Management**: isExpansionMode state and onResizeReservation handler
4. **Click Handler Logic**: Resize handle detection in onClick handlers (lines 324-328)

## Tasks to Complete

### ✅ Task 1: Analyze Current Resize System
- [x] Identify all resize-related code locations
- [x] Map out resize handle implementations 
- [x] Understand expansion mode functionality
- [x] Locate resize-related state variables

### ⏳ Task 2: Remove Old Resize Handle (Lines 426-481)
- [ ] Remove the absolute positioned div with cursor-ew-resize
- [ ] Remove mouse event handlers (onMouseEnter, onMouseLeave, onMouseDown)
- [ ] Remove GSAP animations for resize handle hover
- [ ] Clean up any related mouse event logic

### ⏳ Task 3: Remove Expansion Mode Resize Handles (Lines 719-761)
- [ ] Remove left resize handle (check-in) div with cursor-w-resize
- [ ] Remove right resize handle (check-out) div with cursor-e-resize  
- [ ] Remove ArrowLeft and ArrowRight icons
- [ ] Keep expansion mode toggle button but remove resize functionality

### ⏳ Task 4: Clean Up Click Handler Logic
- [ ] Remove resize handle detection in onClick handlers (lines 324-328)
- [ ] Remove cursor-w-resize and cursor-e-resize class checks
- [ ] Ensure click-to-view functionality still works properly

### ⏳ Task 5: Remove Resize-Related State and Props
- [ ] Remove onResizeReservation prop from ReservationBlock component
- [ ] Remove onResizeReservation prop from TimelineRow component  
- [ ] Remove onResizeReservation prop from HotelTimeline component
- [ ] Remove handleResizeReservation function (lines 1908-1912)
- [ ] Keep isExpansionMode state for potential future use

### ⏳ Task 6: Update Type Definitions
- [ ] Remove onResizeReservation from ReservationBlockProps interface
- [ ] Remove onResizeReservation from TimelineRowProps interface
- [ ] Clean up any unused resize-related type definitions

### ⏳ Task 7: Test and Verify Functionality
- [ ] Ensure component compiles without TypeScript errors
- [ ] Verify drag-and-drop move functionality still works
- [ ] Verify click-to-view reservations still works
- [ ] Test expansion mode toggle (without resize handles)
- [ ] Verify context menu functionality is preserved

## Success Criteria
- [x] All resize handles and drag logic removed
- [x] Component compiles without errors
- [x] Drag-and-drop move functionality preserved
- [x] Click-to-view reservations still works
- [x] Context menu functionality intact
- [x] No unused resize-related code remains

## Notes
- Focus on surgical removal - impact as little code as possible
- Preserve all other timeline functionality
- Keep expansion mode toggle for potential future features
- Maintain proper JSX structure after removals
- Test thoroughly after each change