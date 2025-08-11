# Code Structure & Organization

## Root Directory Structure
```
hotel-inventory/
├── src/                    # Main application source code
├── supabase/              # Database migrations, functions, config
├── scripts/               # Croatian fiscalization testing scripts
├── docs/                  # Project documentation
├── tasks/                 # Development task management
├── migrations/            # Database schema migrations
├── public/                # Static assets, service worker, hotel images
├── example-ui-images/     # UI mockups and design references
└── build configuration files
```

## Source Code Organization (`src/`)
```
src/
├── components/            # React component hierarchy
│   ├── auth/             # Authentication components (ultra-simplified)
│   ├── hotel/            # Hotel management system components
│   │   ├── frontdesk/    # Front desk, calendar, reservations
│   │   ├── shared/       # Shared hotel components and layouts
│   │   └── ModuleSelector.tsx # Hotel module selection
│   ├── dashboard/        # Main dashboard with analytics
│   ├── inventory/        # Inventory management components
│   │   ├── items/        # Item management (add, edit, list)
│   │   ├── locations/    # Location management with drag-drop
│   │   └── global/       # Global inventory overview
│   ├── admin/            # Admin-only components (location management)
│   ├── audit/            # Audit log viewing and analysis
│   ├── orders/           # Order management system
│   ├── settings/         # User settings and preferences
│   ├── layout/           # Layout components (Sidebar, Navigation)
│   └── ui/               # Reusable UI components (shadcn/ui based)
├── lib/                  # Business logic, utilities, services
│   ├── services/         # Service layer classes (clean architecture)
│   ├── hotel/            # Hotel domain logic and data
│   ├── fiscalization/    # Croatian fiscal compliance system
│   ├── hooks/            # Custom React hooks
│   ├── printers/         # Thermal printer integration
│   └── core utilities    # Database, notifications, etc.
├── hooks/                # Shared custom React hooks
├── i18n/                 # Multi-language support
└── core files            # App.tsx, index.tsx, etc.
```

## Component Architecture Patterns

### Hotel Management System (`src/components/hotel/`)
```
hotel/
├── frontdesk/
│   ├── HotelTimeline.tsx         # Main calendar view (2,457 lines)
│   ├── CreateBookingModal.tsx    # Booking creation (354 lines - refactored)
│   ├── ReservationPopup.tsx      # Booking details (495 lines - refactored)
│   ├── CheckInOutPage.tsx        # Check-in/out workflow
│   ├── EmailTestPage.tsx         # Email testing interface
│   └── GuestManagement.tsx       # Guest profile management
├── shared/
│   ├── HotelLayout.tsx           # Common hotel layout wrapper
│   ├── HotelContext.tsx          # Hotel state management context
│   └── navigation components     # Shared navigation elements
└── ModuleSelector.tsx            # Hotel module selection interface
```

### Service Layer Architecture (`src/lib/services/`)
```
services/
├── EmailTestService.ts           # Email communication service (319 lines)
├── LocationService.ts            # Inventory location management
├── OrdersService.ts              # Order processing and management
└── [Future services for hotel operations]
```

### Business Logic Organization (`src/lib/`)
```
lib/
├── hotel/
│   ├── types.ts                  # TypeScript interfaces for hotel domain
│   ├── hotelData.ts             # Hotel Porec configuration (46 rooms)
│   ├── sampleData.ts            # Guest and reservation sample data
│   ├── calendarUtils.ts         # Calendar and booking utilities
│   └── pricingEngine.ts         # Seasonal pricing calculations
├── fiscalization/
│   ├── types.ts                 # Croatian fiscal TypeScript interfaces
│   ├── config.ts                # Fiscal environment configuration
│   ├── certificateManager.ts   # FINA P12 certificate handling
│   ├── xmlGenerator.ts          # SOAP XML generation (s004 resolved)
│   ├── FiscalizationService.ts # Main fiscalization service
│   └── index.ts                 # Module exports
├── services/                    # Service layer classes
├── hooks/                       # Custom React hooks
└── core utilities               # Database, notifications, etc.
```

## Component Refactoring Patterns

### Before Refactoring (Complex Components)
```typescript
// CreateBookingModal.tsx - Original (1,061 lines)
const CreateBookingModal = () => {
  // 50+ useState calls
  // Complex business logic mixed with UI
  // Multiple responsibilities in one component
  // Difficult to test and maintain
}
```

### After Refactoring (Clean Architecture)
```typescript
// CreateBookingModal.tsx - Refactored (354 lines)
const CreateBookingModal = ({ service, onClose }) => {
  const { state, actions } = useBookingState(service);
  // Pure presentation logic only
  // Single responsibility
  // Easy to test and maintain
}

// Custom Hook (300+ lines)
const useBookingState = (service: BookingService) => {
  // Consolidated state management
  // Business logic delegation to service
  // Validation and error handling
}

// Service Class (400+ lines)
class BookingService {
  // All business logic encapsulated
  // Type-safe operations
  // Easy to unit test
}
```

## File Naming Conventions

### Components
- **PascalCase**: `CreateBookingModal.tsx`, `HotelTimeline.tsx`
- **Descriptive names**: Clear indication of component purpose
- **TSX extension**: All React components use .tsx

### Services & Utilities
- **PascalCase for classes**: `EmailTestService.ts`, `FiscalizationService.ts`
- **camelCase for utilities**: `calendarUtils.ts`, `dateUtils.ts`
- **Domain grouping**: Related functionality grouped in directories

### Types & Interfaces
- **PascalCase**: `Reservation`, `Guest`, `HotelContextType`
- **Descriptive suffixes**: `Service`, `Type`, `Config`, `Data`
- **Domain prefixing**: `Hotel*`, `Fiscal*`, `Email*` for related types

## Import Organization Patterns

### Path Mapping
```typescript
// tsconfig.json path mapping enabled
import { Button } from '@/components/ui/button';
import { HotelService } from '@/lib/services/HotelService';
import type { Reservation } from '@/lib/hotel/types';
```

### Import Grouping Convention
```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// 2. Internal components
import { Button } from '@/components/ui/button';
import { HotelTimeline } from '@/components/hotel/frontdesk/HotelTimeline';

// 3. Services and utilities
import { EmailTestService } from '@/lib/services/EmailTestService';
import { formatDate } from '@/lib/utils';

// 4. Types
import type { Reservation, Guest } from '@/lib/hotel/types';
```

## Directory Purpose & Responsibilities

### `src/components/`
- **Presentation layer only**: No business logic in UI components
- **Domain-based organization**: Components grouped by business domain
- **Reusable UI components**: Shared components in `ui/` directory
- **Layout components**: Navigation and layout structure

### `src/lib/`
- **Business logic**: All domain logic encapsulated in service classes
- **Utilities**: Pure functions for common operations
- **Type definitions**: TypeScript interfaces and types
- **Configuration**: Environment and system configuration

### `src/hooks/`
- **State management**: Custom hooks for component state
- **Reusable logic**: Shared stateful behavior across components
- **Service integration**: Hooks that integrate with service layer

This organization supports the clean architecture pattern with clear separation of concerns, making the codebase maintainable, testable, and scalable for professional hotel management operations.