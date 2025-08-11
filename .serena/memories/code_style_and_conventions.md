# Code Style & Conventions

## TypeScript Standards

### Strict Mode Configuration
```typescript
// tsconfig.json - Strict TypeScript configuration
{
  "compilerOptions": {
    "strict": true,                          // Enable all strict type checks
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx"
  }
}
```

### Type Definition Patterns
#### Branded Types for Safety
```typescript
// Prevent ID mixing with branded types
type RoomId = string & { __brand: 'RoomId' };
type GuestId = string & { __brand: 'GuestId' };
type ReservationId = string & { __brand: 'ReservationId' };

const createReservation = (roomId: RoomId, guestId: GuestId): ReservationId => {
  // Type safety prevents parameter confusion
};
```

#### Advanced Utility Types
```typescript
// Domain-specific utility types
type ReservationCreate = Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>;
type ReservationUpdate = Partial<Pick<Reservation, 'status' | 'specialRequests'>>;
type ReservationView = Pick<Reservation, 'id' | 'guestId' | 'roomId' | 'checkIn' | 'checkOut'>;
```

#### Runtime Type Validation
```typescript
// Type guards with runtime validation
export const isReservationStatus = (status: string): status is ReservationStatus => {
  return ['confirmed', 'checked-in', 'checked-out', 'cancelled'].includes(status);
};

export const isValidRoom = (room: unknown): room is Room => {
  return typeof room === 'object' && 
         room !== null &&
         typeof (room as Room).number === 'string' &&
         typeof (room as Room).floor === 'number';
};
```

## React Component Patterns

### Clean Architecture Component Structure
```typescript
// Service injection pattern
interface ComponentProps {
  service: EmailTestService;
  onClose: () => void;
}

const EmailTestPage = ({ service, onClose }: ComponentProps) => {
  // Custom hook for state management (extracted from component)
  const { state, actions, validation } = useEmailTestState(service);
  
  // Pure presentation logic only
  return (
    <div>
      {/* UI rendering */}
    </div>
  );
};
```

### Custom Hook Pattern
```typescript
// State consolidation in custom hooks
const useBookingState = (service: BookingService) => {
  // 300+ lines of state management logic
  const [guest, setGuest] = useState<GuestSelection>();
  const [reservation, setReservation] = useState<ReservationDetails>();
  const [pricing, setPricing] = useState<PricingCalculation>();
  
  // Business logic delegation to service layer
  const createBooking = async (data: BookingRequest) => {
    return service.createReservation(data);
  };
  
  return {
    state: { guest, reservation, pricing },
    actions: { createBooking, updateGuest, calculatePricing },
    validation: { validateForm, checkAvailability }
  };
};
```

### Service Layer Pattern
```typescript
// Business logic encapsulation
export class EmailTestService {
  private static instance: EmailTestService;
  
  static getInstance(): EmailTestService {
    if (!EmailTestService.instance) {
      EmailTestService.instance = new EmailTestService();
    }
    return EmailTestService.instance;
  }
  
  async sendTestEmail(config: EmailTestConfiguration): Promise<TestResult> {
    // Business logic implementation
    // Error handling and validation
    // External service integration
  }
  
  validateEmailAddress(email: string): boolean {
    // Validation logic
  }
}
```

## Naming Conventions

### Component Naming
- **PascalCase**: `CreateBookingModal`, `HotelTimeline`, `ReservationPopup`
- **Descriptive names**: Clear indication of component purpose
- **Domain prefixing**: `Hotel*`, `Email*`, `Fiscal*` for related components

### Variable & Function Naming
```typescript
// camelCase for variables and functions
const hotelReservations = getReservations();
const formatDisplayDate = (date: Date) => format(date, 'PPP');

// Descriptive function names
const calculateSeasonalPricing = (dates: DateRange) => { ... };
const validateCroatianOIB = (oib: string) => { ... };

// Boolean variables with clear prefixes
const isVipGuest = guest.vipStatus;
const hasSpecialRequests = reservation.specialRequests?.length > 0;
const canCheckIn = reservationStatus === 'confirmed';
```

### Constants & Enums
```typescript
// UPPER_CASE for constants
const HOTEL_CONSTANTS = {
  TOTAL_ROOMS: 46,
  FLOORS: 4,
  VAT_RATE: 0.25,
  TOURISM_TAX_RATE: 1.35
} as const;

// PascalCase for enums
enum ReservationStatus {
  Confirmed = 'confirmed',
  CheckedIn = 'checked-in',
  CheckedOut = 'checked-out',
  Cancelled = 'cancelled'
}
```

## Import Organization Standards

### Import Grouping Order
```typescript
// 1. External library imports (React, third-party)
import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';

// 2. Internal UI components
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// 3. Business components
import { HotelTimeline } from '@/components/hotel/frontdesk/HotelTimeline';
import { ReservationPopup } from '@/components/hotel/frontdesk/ReservationPopup';

// 4. Services and utilities
import { EmailTestService } from '@/lib/services/EmailTestService';
import { formatCurrency, validateEmail } from '@/lib/utils';

// 5. Type imports (explicitly marked)
import type { Reservation, Guest, Company } from '@/lib/hotel/types';
import type { EmailTestConfiguration } from '@/lib/services/EmailTestService';
```

### Path Mapping Usage
```typescript
// Use path mapping (@/*) consistently
import { HotelContext } from '@/components/hotel/shared/HotelContext';
import { supabase } from '@/lib/supabase';
import type { HotelContextType } from '@/lib/hotel/types';

// Avoid relative imports for cross-directory access
// ❌ import { utils } from '../../../lib/utils';
// ✅ import { utils } from '@/lib/utils';
```

## Error Handling Patterns

### Service Layer Error Handling
```typescript
class BookingService {
  async createReservation(data: ReservationCreate): Promise<Result<Reservation, Error>> {
    try {
      // Validation first
      const validation = this.validateReservationData(data);
      if (!validation.isValid) {
        return { success: false, error: new Error(validation.message) };
      }
      
      // Business logic
      const reservation = await this.processReservation(data);
      return { success: true, data: reservation };
      
    } catch (error) {
      console.error('Reservation creation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }
}
```

### Component Error Boundaries
```typescript
// Error boundary usage
const HotelModule = () => {
  return (
    <ErrorBoundary fallback={<HotelErrorFallback />}>
      <Suspense fallback={<HotelLoadingFallback />}>
        <HotelTimeline />
      </Suspense>
    </ErrorBoundary>
  );
};
```

## Comment Standards

### Documentation Comments
```typescript
/**
 * Calculates seasonal pricing for hotel reservations based on Croatian hotel standards.
 * Applies different rate multipliers for A/B/C/D seasonal periods.
 * 
 * @param dates - Check-in and check-out date range
 * @param roomType - Type of room for base rate calculation
 * @param occupancy - Guest count for pricing adjustments
 * @returns Complete pricing calculation with VAT and tourism tax
 */
const calculateSeasonalPricing = (
  dates: DateRange, 
  roomType: RoomType, 
  occupancy: GuestOccupancy
): PricingCalculation => {
  // Implementation
};
```

### Business Logic Comments
```typescript
// Croatian fiscal compliance - ZKI algorithm validation
const generateZKI = (receipt: FiscalReceipt): string => {
  // ZKI = MD5(OIB + DateTime + BillNumber + BusinessArea + CashRegister + TotalAmount)
  const zkiString = [
    receipt.oib,           // Croatian business identifier
    receipt.dateTime,      // ISO format: 2024-08-09T10:30:00
    receipt.billNumber,    // Sequential bill number
    receipt.businessArea,  // Business area code
    receipt.cashRegister,  // Cash register identifier
    receipt.totalAmount    // Amount in format: 150.00
  ].join('');
  
  return md5(zkiString);
};
```

## File Organization Standards

### Component File Structure
```typescript
// Component file organization
// 1. Imports (grouped as per convention)
// 2. Type definitions (if component-specific)
// 3. Constants (if component-specific)  
// 4. Main component implementation
// 5. Default export

import React from 'react';
import type { ComponentProps } from './types';

const COMPONENT_CONSTANTS = {
  MAX_ITEMS: 50,
  DEFAULT_TIMEOUT: 5000
} as const;

const MyComponent = ({ prop1, prop2 }: ComponentProps) => {
  // Component implementation
};

export default MyComponent;
```

This style guide ensures consistent, maintainable, and professional code quality throughout the hotel inventory management system, supporting the clean architecture pattern and enterprise-grade development standards.