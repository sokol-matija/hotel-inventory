# Hotel Management System - Implementation Plan

## Implementation Workflow

### 1. Pre-Implementation Setup ✅
- [x] Requirements specification created
- [x] Specialized agents configured
- [x] Current codebase analyzed
- [x] Implementation plan defined

### 2. Feature Implementation Workflow

Each major feature follows this process:
1. **Specialist Agent** implements the feature
2. **Build Test Specialist** validates the implementation
3. **Git Commit Orchestrator** commits successful changes
4. Move to next feature

## Phase 1: Core Business Logic (High Priority)

### 1.1 Corporate Billing System (R1 Bills) - Agent: `hotel-corporate-billing-specialist`
**Estimated Time**: 2-3 hours
**Files to Modify**: 
- `src/lib/hotel/types.ts` - Add Company interface
- `src/components/hotel/frontdesk/CreateBookingModal.tsx` - Add R1 toggle and company selection
- Database schema - New companies table

**Key Deliverables**:
- Company/Firm data model
- R1 billing toggle in booking creation
- Company search and selection dropdown
- Database integration for corporate clients

**Acceptance Criteria**:
- Can create and manage companies with OIB validation
- R1 toggle shows/hides company selection
- Search works by name and OIB
- Reservations link to companies when R1 enabled

### 1.2 Variable VAT Rates Implementation - Agent: `hotel-pricing-specialist`
**Estimated Time**: 1-2 hours
**Files to Modify**:
- `src/lib/hotel/pricing.ts` - Update VAT calculations
- `src/lib/fiscalization/` - Update fiscal calculations
- Invoice generation components

**Key Deliverables**:
- Room: 13% VAT implementation
- Parking: 25% VAT implementation
- Pet fees: 25% VAT implementation
- Updated invoice calculations

**Acceptance Criteria**:
- Different VAT rates applied based on service type
- Invoice shows correct VAT breakdown
- Croatian fiscal system updated accordingly

### 1.3 Register Selection System - Agent: `hotel-fiscal-specialist`
**Estimated Time**: 1-2 hours
**Files to Modify**:
- `src/components/hotel/frontdesk/CreateBookingModal.tsx` - Add register selection
- `src/lib/fiscalization/` - Update for multi-register support
- Invoice generation with register tracking

**Key Deliverables**:
- 4-register selection dropdown
- Register tracking in reservations
- Fiscal integration with register selection
- Default register configuration

**Acceptance Criteria**:
- Can select from 4 registers during booking
- Register choice affects fiscal sequence
- Register information appears on invoices

### 1.4 Room 401 Enhanced Rules - Agent: `hotel-reservation-specialist`
**Estimated Time**: 2-3 hours
**Files to Modify**:
- `src/components/hotel/frontdesk/CreateBookingModal.tsx` - Add Room 401 validations
- `src/lib/hotel/roomRules.ts` - Create room-specific rules
- Timeline component - Enforce cleaning days

**Key Deliverables**:
- Mandatory 1-day cleaning gap enforcement
- 4-day minimum stay validation
- Fixed pricing (not per person) for Room 401
- 3 parking spaces automatically included

**Acceptance Criteria**:
- Cannot book Room 401 without cleaning day gap
- Minimum 4-day stay enforced in UI
- Pricing calculated as fixed rate
- Parking automatically set to 3 spaces

## Phase 2: Operational Features (Medium Priority)

### 2.1 Multi-Tier Pricing System - Agent: `hotel-pricing-specialist`
**Estimated Time**: 2-3 hours

### 2.2 Group Booking Management - Agent: `hotel-reservation-specialist`
**Estimated Time**: 2-3 hours

### 2.3 Tentative Reservation Status - Agent: `hotel-reservation-specialist`
**Estimated Time**: 1-2 hours

### 2.4 VIP Discount System - Agent: `hotel-pricing-specialist`
**Estimated Time**: 1-2 hours

## Phase 3: UX Enhancements (Low Priority)

### 3.1 Same-Day Movement Mode - Agent: `hotel-timeline-specialist`
**Estimated Time**: 2-3 hours

### 3.2 Visual Improvements - Agent: `hotel-timeline-specialist`
**Estimated Time**: 1-2 hours

### 3.3 Additional Services (Towel Rental, Guest Addition) - Agent: `hotel-pricing-specialist`
**Estimated Time**: 2-3 hours

## Quality Assurance Process

### After Each Feature Implementation:

1. **Build Test Specialist** runs:
   ```bash
   npm run build
   npm run type-check
   npm run lint
   npm test
   ```

2. **Integration Testing**:
   - Booking creation workflow
   - Invoice generation
   - Timeline functionality
   - Database integrity

3. **Git Commit Orchestrator** creates commit:
   - Descriptive commit message
   - References implemented feature
   - Includes any database migrations needed

## Implementation Commands

### Starting Phase 1 - Feature 1.1 (Corporate Billing)
```markdown
I want to implement the Corporate Billing System (R1 Bills) as specified in the requirements document. This should include:

1. Company/Firm data model and management
2. R1 toggle in booking creation 
3. Company search and selection dropdown
4. Database integration for corporate clients

Please follow the implementation plan in docs/IMPLEMENTATION_PLAN.md and use the hotel-corporate-billing-specialist agent for this work.
```

### Build Testing After Feature
```markdown
Please run build tests to validate the implementation:
1. npm run build (check TypeScript compilation)
2. npm run type-check (verify type safety)  
3. npm run lint (code quality)
4. npm test (run test suite)

Use the build-test-specialist agent for comprehensive validation.
```

### Committing Successful Feature
```markdown
The corporate billing feature has been implemented and tested successfully. Please create a professional commit with:
1. Clear commit message describing the corporate billing implementation
2. Reference to the feature specification
3. Summary of files changed

Use the git-commit-orchestrator agent for this task.
```

## Risk Mitigation

### Critical System Preservation
- **AuthProvider**: Keep 38-line simple version - NEVER complicate
- **Croatian Fiscalization**: Preserve s004 resolution - test after changes
- **NTFY Notifications**: Maintain Room 401 notification system
- **Timeline Performance**: Monitor performance with additional features

### Rollback Plan
- Each feature is committed separately
- Can revert individual features if issues arise
- Database migrations should be reversible
- Keep backup of working state before starting

## Success Metrics

### Phase 1 Success Criteria
- [ ] Corporate clients can be managed (CRUD operations)
- [ ] R1 billing works end-to-end (booking to invoice)
- [ ] VAT rates correctly applied per service type
- [ ] Register selection affects fiscal processing
- [ ] Room 401 rules enforced automatically
- [ ] All existing functionality preserved
- [ ] Build passes without errors
- [ ] No performance degradation

### Overall Project Success
- All requirements from specification implemented
- Croatian fiscal compliance maintained
- No regressions in existing features
- Performance remains acceptable
- Code quality standards maintained

---

**Document Version**: 1.0  
**Created**: August 7, 2025  
**Status**: Ready for Implementation  
**Next Step**: Begin Phase 1.1 - Corporate Billing System