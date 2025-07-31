# Hotel Management System - Module Selector Implementation Plan

## Overview
Based on the HOTEL_MANAGEMENT_SPECS.md, we need to implement a module selector landing page that appears after login, replacing the current direct redirect to the inventory dashboard.

## High Priority Tasks
- [ ] **Create module selector landing page** - Landing page with 4 modules (Channel Manager, Front Desk, Finance, Inventory) with same background as login screen
- [ ] **Add routing for hotel management modules** - Add routes for `/hotel/module-selector` and `/hotel/front-desk` 
- [ ] **Add module selector button to sidebar** - Button between settings and logout to return to module selector
- [ ] **Update default route redirect** - Change from `/dashboard` to `/hotel/module-selector` after login

## Medium Priority Tasks
- [ ] **Create shared hotel layout component** - Reusable layout with sidebar for all hotel modules
- [ ] **Create basic Front Desk module placeholder** - Simple placeholder page for Front Desk module

## Low Priority Tasks  
- [ ] **Add translation keys for hotel modules** - i18n support for module names and navigation

## Implementation Approach
1. Start with simplest changes first - routing and basic components
2. Reuse existing patterns from inventory system (sidebar, layout, styling)
3. Keep authentication system unchanged (ultra-simplified 38-line version)
4. Focus on module selector functionality first, then basic Front Desk placeholder

## Design Requirements
- Use same login background image for module selector page
- Consistent styling with existing inventory system
- Hotel logo + "Welcome!" message
- 4 module cards: Channel Manager (future), Front Desk (priority), Finance (future), Inventory (current)
- All users see all modules (no role restrictions)

## Files to Create/Modify
- `src/components/hotel/ModuleSelector.tsx` - Main landing page
- `src/components/hotel/frontdesk/FrontDeskLayout.tsx` - Front desk placeholder
- `src/components/hotel/shared/HotelLayout.tsx` - Shared layout component
- `src/App.tsx` - Add hotel routes
- `src/components/layout/Sidebar.tsx` - Add module selector button
- `src/i18n/locales/*.json` - Translation keys

## Notes
- Keep changes minimal and focused
- Reuse existing UI components (shadcn/ui)
- Maintain current auth system simplicity
- Follow existing code conventions