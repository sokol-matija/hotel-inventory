# Documentation Organization Plan - Mintlify Structure

## Current State Analysis (January 2025)

### Existing Structure
```
docs/
├── mint.json                    # Mintlify config (needs update)
├── introduction.mdx             # ✅ Exists
├── quickstart.mdx               # ✅ Exists
├── installation.mdx             # ✅ Exists
├── features/
│   └── channel-manager.mdx      # ✅ Exists
└── [46 other .md files]         # Various technical docs
```

### Root-Level Files to Organize
```
/
├── README.md                    # Comprehensive overview
├── CLAUDE.md                    # Tech stack best practices
├── CLAUDE.local.md              # Local development notes
├── FRONT_DESK_TESTING_RESULTS.md # Testing documentation
└── WARP.md                      # (Unknown - need to check)
```

---

## Target Mintlify Structure

```
docs/
├── mint.json                    # Main configuration
├── introduction.mdx             # Welcome page (UPDATE)
├── quickstart.mdx               # Quick start guide (UPDATE)
├── installation.mdx             # Installation steps (UPDATE)
│
├── features/
│   ├── hotel-management.mdx     # CREATE - Overview
│   ├── front-desk.mdx           # CREATE - Front desk features
│   ├── reservations.mdx         # CREATE - Reservation system
│   ├── finance.mdx              # CREATE - Finance & Invoicing (NEW!)
│   ├── channel-manager.mdx      # ✅ Exists (UPDATE)
│   └── guest-management.mdx     # CREATE - Guest profiles
│
├── technical/
│   ├── architecture.mdx         # CREATE - System architecture
│   ├── database-schema.mdx      # CONVERT from existing MD
│   ├── api-reference.mdx        # CREATE - API documentation
│   ├── service-layer.mdx        # CREATE - Service architecture
│   └── type-system.mdx          # CREATE - TypeScript types
│
├── integrations/
│   ├── croatian-fiscalization.mdx  # CREATE - Complete guide
│   ├── fiscalization-setup.mdx     # CONVERT from existing
│   ├── channel-manager-setup.mdx   # CREATE - Phobs setup
│   ├── supabase-setup.mdx          # CREATE - Database setup
│   └── email-service.mdx           # CREATE - Resend integration
│
├── development/
│   ├── setup.mdx                # CREATE - Dev environment
│   ├── contributing.mdx         # CREATE - Contribution guide
│   ├── testing.mdx              # CONVERT - Testing guide
│   ├── tech-stack.mdx           # CONVERT from CLAUDE.md
│   └── deployment.mdx           # CREATE - Deployment guide
│
├── guides/
│   ├── creating-reservations.mdx   # CREATE - Step-by-step
│   ├── check-in-process.mdx        # CREATE - Check-in workflow
│   ├── generating-invoices.mdx     # CREATE - Invoice generation
│   ├── fiscalization-workflow.mdx  # CREATE - Fiscal compliance
│   └── ota-sync.mdx                # CREATE - OTA management
│
└── reference/
    ├── fiscal-api.mdx           # CREATE - Fiscal API reference
    ├── database-tables.mdx      # CONVERT - Table reference
    ├── service-apis.mdx         # CREATE - Service documentation
    └── error-codes.mdx          # CREATE - Error reference
```

---

## Implementation Steps

### Phase 1: Core Documentation Update (Priority 1)
1. **Update existing MDX files**
   - [ ] introduction.mdx - Add Finance UI completion
   - [ ] quickstart.mdx - Update with latest features
   - [ ] installation.mdx - Add fiscal setup steps

2. **Create essential feature pages**
   - [ ] features/finance.mdx - NEW! Finance & Invoice system
   - [ ] features/front-desk.mdx - Front desk operations
   - [ ] features/hotel-management.mdx - System overview

### Phase 2: Technical Documentation (Priority 2)
1. **Convert existing technical docs to MDX**
   - [ ] CROATIAN_FISCALIZATION.md → integrations/croatian-fiscalization.mdx
   - [ ] B2C_FISCALIZATION_INTEGRATION_COMPLETE.md → reference/fiscal-implementation.mdx
   - [ ] service-layer-analysis.md → technical/service-layer.mdx
   - [ ] database-schema-diagram.md → technical/database-schema.mdx

2. **Create new technical pages**
   - [ ] technical/architecture.mdx - System architecture
   - [ ] technical/api-reference.mdx - API documentation
   - [ ] technical/type-system.mdx - TypeScript reference

### Phase 3: Integration Guides (Priority 3)
1. **Croatian Fiscalization**
   - [ ] integrations/croatian-fiscalization.mdx - Complete guide
   - [ ] integrations/fiscalization-setup.mdx - Setup steps
   - [ ] guides/fiscalization-workflow.mdx - Daily workflow

2. **Channel Manager**
   - [ ] integrations/channel-manager-setup.mdx - Phobs setup
   - [ ] guides/ota-sync.mdx - OTA management

3. **Infrastructure**
   - [ ] integrations/supabase-setup.mdx - Database setup
   - [ ] integrations/email-service.mdx - Email configuration

### Phase 4: User Guides (Priority 4)
- [ ] guides/creating-reservations.mdx - Step-by-step booking
- [ ] guides/check-in-process.mdx - Check-in workflow
- [ ] guides/generating-invoices.mdx - Invoice generation with fiscal data
- [ ] guides/room-service.mdx - Room service ordering

### Phase 5: Reference Documentation (Priority 5)
- [ ] reference/fiscal-api.mdx - Croatian Tax Authority API
- [ ] reference/database-tables.mdx - Complete table reference
- [ ] reference/service-apis.mdx - Internal service APIs
- [ ] reference/error-codes.mdx - Error handling reference

---

## Documentation Standards

### MDX Format Requirements
```mdx
---
title: Page Title
description: Brief description for SEO and navigation
icon: lucide-icon-name (optional)
---

# Page Title

Brief introduction paragraph.

<CardGroup cols={2}>
  <Card title="Feature 1" icon="check">
    Feature description
  </Card>
  <Card title="Feature 2" icon="star">
    Feature description
  </Card>
</CardGroup>

## Section Heading

Content with code examples:

```typescript
// Example code
```

<Note>
Important information or tips
</Note>

<Warning>
Critical warnings or cautions
</Warning>
```

### Navigation Structure in mint.json
```json
{
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "quickstart", "installation"]
    },
    {
      "group": "Core Features",
      "pages": [
        "features/hotel-management",
        "features/front-desk",
        "features/finance",
        "features/reservations",
        "features/channel-manager"
      ]
    }
    // ... more groups
  ]
}
```

---

## Content Migration Map

### Files to Move/Convert
| Source File | Target Location | Status |
|-------------|----------------|--------|
| README.md | docs/introduction.mdx | Update existing |
| CLAUDE.md | docs/development/tech-stack.mdx | Convert |
| FRONT_DESK_TESTING_RESULTS.md | docs/development/testing.mdx | Convert |
| docs/CROATIAN_FISCALIZATION.md | docs/integrations/croatian-fiscalization.mdx | Convert |
| docs/B2C_FISCALIZATION_INTEGRATION_COMPLETE.md | docs/reference/fiscal-implementation.mdx | Convert |
| docs/service-layer-analysis.md | docs/technical/service-layer.mdx | Convert |
| docs/database-schema-diagram.md | docs/technical/database-schema.mdx | Convert |
| docs/HOTEL_FEATURES_SPECIFICATION.md | docs/features/hotel-management.mdx | Convert |

### Files to Archive
Move to `docs/archive/` (not in Mintlify navigation):
- docs/logs/ - Development logs
- docs/tasks/ - Task management
- Old implementation plans and analysis documents

---

## Latest Features to Document (January 2025)

### 1. Finance UI Completion ✅ NEW!
- Invoice display with fiscal data (JIR, ZKI, QR codes)
- PDF generation with existing fiscal information
- Real reservation data integration
- Finance module fully functional

### 2. Croatian Fiscalization ✅ COMPLETE
- s004 error resolution
- Full Croatian Tax Authority integration
- JIR/ZKI generation and storage
- QR code verification system
- Production-ready fiscal compliance

### 3. Advanced Backend Integration ✅
- Real-time conflict detection
- Optimistic UI updates
- Batch operations
- Keyboard shortcuts (20+ hotkeys)
- Undo/redo system

### 4. Channel Manager Integration ✅
- Phobs API integration
- Multi-OTA synchronization
- Real-time inventory management
- Performance monitoring dashboard

---

## Success Criteria

Documentation is complete when:
1. ✅ All pages in mint.json navigation exist
2. ✅ All major features are documented
3. ✅ Croatian fiscalization has complete guide
4. ✅ Finance UI documentation is comprehensive
5. ✅ Technical architecture is clearly explained
6. ✅ API references are complete
7. ✅ User guides cover all workflows
8. ✅ Mintlify build succeeds with no errors
9. ✅ All code examples are tested and working
10. ✅ Screenshots and diagrams included where helpful

---

**Created**: January 2025
**Status**: Planning Phase
**Next Step**: Begin Phase 1 - Core Documentation Update
