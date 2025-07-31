# Hotel Management System - Phase 1: Module Selector Implementation

## Plan Overview
Implement the first phase of the hotel management system by adding a module selector that allows users to navigate between different hotel management modules.

## Task List

### 1. Create Hotel Components Directory Structure
- [ ] Create `src/components/hotel/` directory
- [ ] Create subdirectories for organization

### 2. Create ModuleSelector Component  
- [ ] Create `ModuleSelector.tsx` with Hotel Porec branding
- [ ] Use `zemlja_gp copy.png` background (same as login)
- [ ] Add 4 module cards: Channel Manager, Front Desk, Finance, Inventory
- [ ] Use shadcn/ui components for premium look
- [ ] Make it responsive for mobile
- [ ] Add proper navigation logic

### 3. Create FrontDeskLayout Placeholder
- [ ] Create `FrontDeskLayout.tsx` as a placeholder component
- [ ] Basic structure matching existing Layout pattern

### 4. Update App.tsx Routing
- [ ] Add new hotel routes without breaking existing ones
- [ ] `/hotel/module-selector` → ModuleSelector  
- [ ] `/hotel/front-desk` → FrontDeskLayout
- [ ] Update default redirect from `/dashboard` to `/hotel/module-selector`
- [ ] Ensure TypeScript compilation works

### 5. Test & Verify
- [ ] Test that existing inventory system still works
- [ ] Verify new routes work correctly  
- [ ] Test mobile responsiveness
- [ ] Ensure TypeScript compiles without errors
- [ ] Test that users see module selector after login

## Implementation Notes
- Don't modify the 38-line AuthProvider
- Follow existing code patterns and styling
- Use existing shadcn/ui components
- Ensure backward compatibility with inventory system
- Focus on getting a working module selector first

## Success Criteria
- [x] User logs in and sees module selector instead of dashboard
- [x] Module selector has Hotel Porec branding and professional look
- [x] Navigation to inventory system works from module selector  
- [x] All existing functionality remains intact
- [x] TypeScript compilation passes
- [x] Mobile responsive design works

---

## Review Section
*To be filled after completion*