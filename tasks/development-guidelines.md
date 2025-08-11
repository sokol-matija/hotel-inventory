# Hotel Inventory Management System - Development Guidelines

## Project Analysis Summary

**Technology Stack:**
- React 19 + TypeScript (Strict mode enabled)
- Supabase (PostgreSQL + Auth + Edge Functions) 
- Tailwind CSS + shadcn/ui components
- React Router DOM v7
- Multiple specialized libraries (DnD, GSAP, i18next, etc.)

**Architecture:** Comprehensive hotel management system with inventory tracking, Croatian fiscalization, multi-language support, and real-time notifications.

---

## 🎯 Core Development Principles

### 1. **Simplicity-First Development**
```typescript
// ✅ Good: Simple, focused components
const AuthProvider = ({ children }) => {
  // 38-line implementation - NEVER exceed this
  const [user, setUser] = useState<User | null>(null)
  // ... minimal state management
}

// ❌ Bad: Over-engineered with complex logic
const AuthProvider = ({ children }) => {
  // Complex role management, session monitoring, etc.
}
```

### 2. **Root Cause Problem Solving**
- **Never use temporary fixes or workarounds**
- Always investigate the underlying issue
- Fix the source, not the symptoms
- Document the root cause for future reference

### 3. **Minimal Impact Changes**
```typescript
// ✅ Good: Targeted change affecting only necessary code
const updateReservationStatus = (id: string, status: ReservationStatus) => {
  return reservations.map(r => 
    r.id === id ? { ...r, status } : r
  )
}

// ❌ Bad: Massive refactor affecting multiple modules
const refactorEntireBookingSystem = () => {
  // Touches 20+ files, changes multiple APIs
}
```

---

## 📁 File Structure & Organization Standards

### Directory Structure Rules
```
src/
├── components/           # UI Components
│   ├── ui/              # Reusable shadcn/ui components
│   ├── auth/            # Authentication (KEEP SIMPLE!)
│   ├── hotel/           # Hotel-specific modules
│   │   ├── shared/      # Shared hotel components
│   │   ├── frontdesk/   # Front desk operations
│   │   └── finance/     # Financial operations
│   └── dashboard/       # Analytics & reporting
├── lib/                 # Business logic & utilities
│   ├── hotel/           # Hotel-specific logic
│   ├── fiscalization/   # Croatian fiscal compliance
│   ├── hooks/           # Custom React hooks
│   └── services/        # API services
├── i18n/                # Internationalization
└── __tests__/           # Test files
```

### File Naming Conventions
```typescript
// ✅ Correct naming patterns
HotelTimeline.tsx           // PascalCase for components
useHotelTimelineState.ts    // camelCase with 'use' prefix for hooks
hotelData.ts               // camelCase for utilities
types.ts                   // lowercase for type definitions
EmailTestService.ts        // PascalCase for services
```

---

## 🏗️ Architecture & Component Design

### Component Structure Standards
```typescript
// ✅ Proper component structure
import React, { useState, useEffect } from 'react'
import { ComponentProps } from './types'
import './Component.styles.css' // If needed

interface ComponentProps {
  // TypeScript interface first
}

export const Component: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2 
}) => {
  // 1. State declarations
  const [state, setState] = useState<Type>(initialValue)
  
  // 2. Custom hooks
  const { data, loading } = useCustomHook()
  
  // 3. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies])
  
  // 4. Event handlers
  const handleEvent = () => {
    // Handler logic
  }
  
  // 5. Render logic
  if (loading) return <LoadingSpinner />
  
  return (
    <div className="component-container">
      {/* JSX content */}
    </div>
  )
}
```

### State Management Patterns
```typescript
// ✅ Use React hooks for simple state
const [items, setItems] = useState<Item[]>([])

// ✅ Context for shared state across modules
export const HotelContext = createContext<HotelContextType>()

// ✅ Custom hooks for complex logic
export const useHotelTimelineState = () => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  // ... logic
  return { reservations, updateReservation, deleteReservation }
}
```

---

## 🎨 TypeScript Best Practices

### Type Safety Standards
```typescript
// ✅ Strict typing - no 'any' allowed
interface Reservation {
  id: string
  checkIn: Date
  status: ReservationStatus  // Use union types
}

// ✅ Generic types for reusable components
interface ApiResponse<T> {
  data: T
  error?: string
  loading: boolean
}

// ✅ Utility types for transformations
type CreateReservationRequest = Omit<Reservation, 'id' | 'createdAt'>
```

### Interface Organization
```typescript
// ✅ Group related types in dedicated files
// types.ts
export interface Hotel { /* ... */ }
export interface Room { /* ... */ }
export interface Reservation { /* ... */ }

// ✅ Use discriminated unions for status
export type ReservationStatus = 
  | 'confirmed'
  | 'checked-in' 
  | 'checked-out'
  | 'cancelled'
```

---

## 🎯 React Patterns & Performance

### Hook Usage Guidelines
```typescript
// ✅ Custom hooks for business logic
export const useReservationState = (roomId: string) => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  
  const addReservation = useCallback((reservation: Reservation) => {
    setReservations(prev => [...prev, reservation])
  }, [])
  
  return { reservations, addReservation }
}

// ✅ Memoization for expensive calculations
const sortedReservations = useMemo(() => {
  return reservations.sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime())
}, [reservations])
```

### Event Handling Standards
```typescript
// ✅ Proper event typing and handling
const handleReservationClick = useCallback((
  event: React.MouseEvent<HTMLDivElement>,
  reservation: Reservation
) => {
  event.stopPropagation()
  setSelectedReservation(reservation)
}, [])

// ✅ Form handling with proper validation
const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
```

---

## 🌐 Internationalization Standards

### Multi-language Implementation
```typescript
// ✅ Proper i18n usage
import { useTranslation } from 'react-i18next'

const Component = () => {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('hotel.frontdesk.title')}</h1>
      <p>{t('hotel.reservation.description', { 
        guestName: guest.name,
        roomNumber: room.number 
      })}</p>
    </div>
  )
}
```

### Supported Languages
- **Croatian (hr):** Primary business language
- **German (de):** Tourist market language  
- **English (en):** International standard
- **Italian (it):** Regional tourist language

---

## 🗄️ Database & API Standards

### Supabase Integration Patterns
```typescript
// ✅ Safe database operations with error handling
export const createReservation = async (
  reservation: CreateReservationRequest
): Promise<Reservation | null> => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .insert(reservation)
      .select()
      .single()
      
    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to create reservation:', error)
    return null
  }
}
```

### Type Safety with Database
```typescript
// ✅ Generated types from Supabase schema
import { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']
type ReservationRow = Tables['reservations']['Row']
type ReservationInsert = Tables['reservations']['Insert']
```

---

## 🎨 UI/UX Standards

### Design System Usage
```typescript
// ✅ Consistent component usage
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const Component = () => (
  <Card className="hotel-card">
    <CardHeader>
      <h3 className="text-lg font-semibold">{title}</h3>
    </CardHeader>
    <CardContent>
      <Button variant="default" size="sm" onClick={handleClick}>
        {t('common.confirm')}
      </Button>
    </CardContent>
  </Card>
)
```

### Responsive Design Standards
```css
/* ✅ Mobile-first responsive design */
.hotel-timeline {
  @apply w-full overflow-x-auto;
}

.timeline-header {
  @apply grid grid-cols-7 md:grid-cols-14 gap-1;
}

.reservation-card {
  @apply p-2 md:p-4 text-xs md:text-sm;
}
```

---

## 🧪 Testing & Quality Standards

### Test Structure
```typescript
// ✅ Comprehensive testing approach
import { render, screen, fireEvent } from '@testing-library/react'
import { ReservationComponent } from './ReservationComponent'

describe('ReservationComponent', () => {
  const mockReservation = {
    id: '1',
    guestName: 'John Doe',
    // ... other properties
  }
  
  it('should display reservation details correctly', () => {
    render(<ReservationComponent reservation={mockReservation} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check.in/i })).toBeInTheDocument()
  })
  
  it('should handle check-in action', async () => {
    const onCheckIn = jest.fn()
    render(
      <ReservationComponent 
        reservation={mockReservation} 
        onCheckIn={onCheckIn} 
      />
    )
    
    fireEvent.click(screen.getByRole('button', { name: /check.in/i }))
    expect(onCheckIn).toHaveBeenCalledWith(mockReservation.id)
  })
})
```

### Development Commands
```bash
# Essential development commands
npm start           # Development server
npm test            # Run test suite  
npm run build       # Production build with TypeScript validation
npm run lint        # Code linting (if configured)
```

---

## 🔒 Security & Compliance

### Croatian Fiscal Compliance
```typescript
// ✅ Fiscal data validation
export const validateFiscalData = (invoice: Invoice): boolean => {
  return !!(
    invoice.oib &&           // Croatian tax ID
    invoice.dateTime &&      // Proper datetime format
    invoice.amount > 0 &&    // Positive amount
    invoice.taxRate         // Valid tax rate (13% or 25%)
  )
}
```

### Authentication Security
```typescript
// ✅ Secure auth handling - KEEP SIMPLE!
export const AuthProvider = ({ children }) => {
  // 38-line implementation maximum
  // No complex session monitoring
  // No role-based complexity
  // Let Supabase handle security
}
```

---

## 🚀 Performance Optimization

### React Performance Patterns
```typescript
// ✅ Proper memoization
const ExpensiveComponent = React.memo(({ data }: Props) => {
  const processedData = useMemo(() => 
    data.map(item => expensiveTransform(item)), 
    [data]
  )
  
  return <div>{/* rendered content */}</div>
})

// ✅ Lazy loading for large components
const HotelFinanceModule = React.lazy(() => 
  import('./components/hotel/finance/FinanceModule')
)
```

### Bundle Size Optimization
```typescript
// ✅ Tree-shakable imports
import { format } from 'date-fns/format'        // ✅ Specific import
import { Button } from '@/components/ui/button' // ✅ Direct import

// ❌ Avoid full library imports
import * as dateFns from 'date-fns'            // ❌ Full import
import * from '@/components/ui'                // ❌ Barrel import
```

---

## 📚 Code Documentation Standards

### Function Documentation
```typescript
/**
 * Calculates total price including Croatian VAT
 * @param basePrice - Base price in EUR
 * @param vatRate - VAT rate (0.13 for accommodation, 0.25 for extras)
 * @param discountPercent - Discount percentage (0-100)
 * @returns Total price with tax and discounts applied
 */
export const calculateTotalPrice = (
  basePrice: number,
  vatRate: number,
  discountPercent: number = 0
): number => {
  const discountedPrice = basePrice * (1 - discountPercent / 100)
  return discountedPrice * (1 + vatRate)
}
```

### Component Documentation
```typescript
/**
 * Hotel Timeline Component - Main scheduling interface
 * 
 * Features:
 * - 14-day view with drag & drop reservations
 * - Right-click context menus with smart positioning
 * - Real-time room status updates
 * - Multi-floor room organization
 * 
 * @param isFullscreen - Whether component is in fullscreen mode
 * @param onToggleFullscreen - Callback to toggle fullscreen
 */
export const HotelTimeline: React.FC<HotelTimelineProps> = ({
  isFullscreen,
  onToggleFullscreen
}) => {
  // Component implementation
}
```

---

## ⚠️ Critical Do's and Don'ts

### ✅ DO's
- **Keep AuthProvider simple** - Maximum 38 lines
- **Use TypeScript strictly** - No `any` types
- **Test tab switching** after auth changes
- **Follow existing patterns** in the codebase
- **Use semantic HTML** and proper accessibility
- **Implement proper error handling** for all async operations
- **Use i18n for all user-facing text**
- **Follow Croatian fiscal compliance** requirements

### ❌ DON'Ts  
- **Never overcomplicate authentication** - it causes UI freezing
- **Never use temporary fixes** - always find root cause
- **Never create files unnecessarily** - prefer editing existing
- **Never ignore TypeScript errors** - resolve all compilation issues
- **Never skip testing** critical user flows
- **Never hardcode text** - use translation system
- **Never commit sensitive data** - use environment variables

---

## 🔧 Development Environment Setup

### Required Tools
```bash
# Node.js 18+ with npm
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher

# Essential VS Code extensions
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets  
- Tailwind CSS IntelliSense
- Auto Rename Tag
- GitLens
```

### Environment Configuration
```typescript
// .env.local structure
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_key
REACT_APP_ENVIRONMENT=development
```

---

## 📈 Continuous Improvement

### Code Review Checklist
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] Tab switching works (for auth changes)
- [ ] Mobile responsive design
- [ ] i18n keys added for new text
- [ ] Error handling implemented
- [ ] Performance impact considered
- [ ] Security implications reviewed

### Refactoring Guidelines
1. **Start small** - Single responsibility changes
2. **Maintain backwards compatibility** when possible
3. **Update tests** alongside code changes
4. **Document breaking changes** clearly
5. **Test extensively** before committing

---

This document serves as the definitive guide for maintaining code quality, consistency, and scalability in the Hotel Inventory Management System. All developers must follow these guidelines to ensure the codebase remains maintainable and bug-free.

**Last Updated:** August 2025  
**Version:** 1.0  
**Next Review:** Quarterly or after major feature additions