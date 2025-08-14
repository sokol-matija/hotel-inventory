# Tech Stack Best Practices - Hotel Inventory Management System

## Technology-Specific Guidelines

This document provides detailed best practices for each technology used in the Hotel Inventory Management System, based on senior-level software development standards.

---

## 🚀 React 19 Best Practices

### Modern React Patterns
```typescript
// ✅ Use React 19 features appropriately
import { use, useOptimistic } from 'react'

// ✅ Server Components pattern (when applicable)
const HotelDashboard = async () => {
  const reservations = await getReservations()
  return <ReservationList reservations={reservations} />
}

// ✅ Concurrent features with proper error boundaries
const HotelTimeline = () => {
  return (
    <Suspense fallback={<TimelineLoader />}>
      <ErrorBoundary fallback={<TimelineError />}>
        <HotelTimelineCore />
      </ErrorBoundary>
    </Suspense>
  )
}
```

### Component Composition
```typescript
// ✅ Compound components pattern
const ReservationCard = ({ children, reservation }) => (
  <Card data-reservation-id={reservation.id}>{children}</Card>
)

ReservationCard.Header = ({ guest }) => (
  <CardHeader>{guest.firstName}</CardHeader>
)

ReservationCard.Content = ({ dates }) => (
  <CardContent>{formatDateRange(dates)}</CardContent>
)

// Usage
<ReservationCard reservation={reservation}>
  <ReservationCard.Header guest={guest} />
  <ReservationCard.Content dates={{ checkIn, checkOut }} />
</ReservationCard>
```

### React 19 Transitions
```typescript
// ✅ Use transitions for non-urgent updates
import { useTransition } from 'react'

const useReservationFilters = () => {
  const [isPending, startTransition] = useTransition()
  
  const updateFilters = (newFilters: FilterState) => {
    startTransition(() => {
      setFilters(newFilters) // Non-urgent state update
    })
  }
  
  return { updateFilters, isPending }
}
```

---

## 📊 TypeScript Advanced Patterns

### Utility Types for Hotel Domain
```typescript
// ✅ Domain-specific utility types
type ReservationCreate = Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>
type ReservationUpdate = Partial<Pick<Reservation, 'status' | 'specialRequests'>>
type ReservationView = Pick<Reservation, 'id' | 'guestId' | 'roomId' | 'checkIn' | 'checkOut'>

// ✅ Branded types for safety
type RoomId = string & { __brand: 'RoomId' }
type GuestId = string & { __brand: 'GuestId' }
type ReservationId = string & { __brand: 'ReservationId' }

const createReservation = (roomId: RoomId, guestId: GuestId): ReservationId => {
  // Type safety prevents mixing up IDs
}
```

### Advanced Type Guards
```typescript
// ✅ Runtime type validation
export const isReservationStatus = (status: string): status is ReservationStatus => {
  return ['confirmed', 'checked-in', 'checked-out', 'cancelled'].includes(status)
}

export const isValidRoom = (room: unknown): room is Room => {
  return typeof room === 'object' && 
         room !== null &&
         typeof (room as Room).number === 'string' &&
         typeof (room as Room).floor === 'number'
}
```

### Template Literal Types
```typescript
// ✅ Type-safe configuration
type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogMessage = `[${LogLevel}] ${string}`

const log = (message: LogMessage) => {
  console.log(message)
}

log('[info] Reservation created') // ✅ Valid
log('Invalid message')            // ❌ Type error
```

---

## 🗄️ Supabase Architecture Patterns  

### Database Query Patterns
```typescript
// ✅ Type-safe queries with proper error handling
export class ReservationService {
  async getReservationsByDateRange(
    startDate: Date, 
    endDate: Date
  ): Promise<Result<Reservation[], Error>> {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests(*),
          room:rooms(*)
        `)
        .gte('check_in', startDate.toISOString())
        .lte('check_out', endDate.toISOString())
        .order('check_in', { ascending: true })
      
      if (error) throw error
      return { success: true, data: data as Reservation[] }
    } catch (error) {
      return { success: false, error: error as Error }
    }
  }
}
```

### Real-time Subscriptions
```typescript
// ✅ Proper subscription management
export const useRealtimeReservations = (roomId: string) => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  
  useEffect(() => {
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          handleReservationChange(payload)
        }
      )
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [roomId])
  
  return reservations
}
```

### Edge Function Integration
```typescript
// ✅ Edge function with proper error handling
export const sendWelcomeEmail = async (
  reservationId: string,
  language: 'en' | 'de' | 'it' = 'en'
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: { 
        reservationId,
        language,
        timestamp: new Date().toISOString()
      }
    })
    
    if (error) throw error
    return { success: true, messageId: data.messageId }
  } catch (error) {
    console.error('Welcome email failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
```

---

## 🎨 Tailwind CSS Architecture

### Component-First Approach
```typescript
// ✅ Component variants with Tailwind
const cardVariants = cva(
  "rounded-lg border shadow-sm transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive",
        reservation: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800"
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)
```

### Responsive Design Patterns
```css
/* ✅ Mobile-first responsive utilities */
.hotel-timeline {
  /* Base mobile styles */
  @apply overflow-x-auto;
  
  /* Tablet styles */
  @apply md:overflow-visible;
  
  /* Desktop styles */
  @apply lg:grid lg:grid-cols-14;
}

/* ✅ Custom component classes */
@layer components {
  .reservation-card {
    @apply 
      rounded-md border border-slate-200 bg-white p-3 shadow-sm
      transition-all duration-200 hover:shadow-md
      dark:border-slate-700 dark:bg-slate-800;
  }
  
  .reservation-card--checked-in {
    @apply border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950;
  }
}
```

### Dark Mode Implementation
```typescript
// ✅ System-aware dark mode
import { useEffect, useState } from 'react'

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  
  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const updateTheme = () => {
      if (theme === 'system') {
        root.classList.toggle('dark', mediaQuery.matches)
      } else {
        root.classList.toggle('dark', theme === 'dark')
      }
    }
    
    updateTheme()
    mediaQuery.addEventListener('change', updateTheme)
    return () => mediaQuery.removeEventListener('change', updateTheme)
  }, [theme])
  
  return { theme, setTheme }
}
```

---

## 🎭 Animation with GSAP

### Performance-Optimized Animations
```typescript
// ✅ GSAP with React refs and cleanup
import { gsap } from 'gsap'
import { useRef, useEffect } from 'react'

export const useHotelNotification = () => {
  const notificationRef = useRef<HTMLDivElement>(null)
  
  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    const element = notificationRef.current
    if (!element) return
    
    // Set initial state
    gsap.set(element, {
      opacity: 0,
      y: -50,
      scale: 0.95
    })
    
    // Animate in
    gsap.timeline()
      .to(element, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        ease: "back.out(1.7)"
      })
      .to(element, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        delay: 3
      })
  }, [])
  
  return { notificationRef, showNotification }
}
```

### Timeline Drag & Drop Animations
```typescript
// ✅ Smooth drag feedback with GSAP
export const useReservationDrag = (onDrop: (reservation: Reservation, newDate: Date) => void) => {
  const dragRef = useRef<HTMLDivElement>(null)
  
  const startDrag = useCallback((reservation: Reservation) => {
    const element = dragRef.current
    if (!element) return
    
    gsap.to(element, {
      scale: 1.05,
      rotation: 2,
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      duration: 0.2,
      ease: "power2.out"
    })
  }, [])
  
  const endDrag = useCallback(() => {
    const element = dragRef.current
    if (!element) return
    
    gsap.to(element, {
      scale: 1,
      rotation: 0,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      duration: 0.3,
      ease: "elastic.out(1, 0.5)"
    })
  }, [])
  
  return { dragRef, startDrag, endDrag }
}
```

---

## 🌍 i18next Internationalization

### Namespace Organization
```typescript
// ✅ Organized translation structure
// i18n/locales/en.json
{
  "hotel": {
    "frontdesk": {
      "title": "Front Desk",
      "timeline": {
        "title": "Hotel Timeline",
        "reservation": {
          "checkIn": "Check In",
          "checkOut": "Check Out",
          "guest": "Guest: {{name}}",
          "room": "Room {{number}}",
          "duration": "{{nights}} nights"
        }
      }
    },
    "finance": {
      "title": "Finance",
      "invoice": {
        "create": "Create Invoice",
        "send": "Send Invoice",
        "total": "Total: {{amount}} €"
      }
    }
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm"
  }
}
```

### Advanced Translation Patterns
```typescript
// ✅ Context-aware translations
const ReservationStatus = ({ status, guest }: Props) => {
  const { t } = useTranslation('hotel')
  
  // Pluralization
  const nightsText = t('frontdesk.timeline.reservation.duration', {
    count: calculateNights(checkIn, checkOut),
    nights: calculateNights(checkIn, checkOut)
  })
  
  // Interpolation with formatting
  const guestText = t('frontdesk.timeline.reservation.guest', {
    name: guest.firstName,
    formatParams: {
      name: { uppercase: true }
    }
  })
  
  return <div>{nightsText} - {guestText}</div>
}
```

### Language Detection
```typescript
// ✅ Smart language detection
export const initI18n = () => {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng: undefined, // Let detector handle it
      fallbackLng: 'en',
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'hotel-language'
      },
      resources: {
        en: { translation: enTranslations },
        de: { translation: deTranslations },
        hr: { translation: hrTranslations },
        it: { translation: itTranslations }
      },
      interpolation: {
        escapeValue: false
      }
    })
}
```

---

## 🚦 React Router v7 Navigation

### Route Configuration
```typescript
// ✅ Type-safe routing with loaders
import { createBrowserRouter, LoaderFunction } from 'react-router-dom'

const hotelLoader: LoaderFunction = async ({ params }) => {
  const hotelId = params.hotelId as string
  const hotel = await getHotel(hotelId)
  
  if (!hotel) {
    throw new Response('Hotel not found', { status: 404 })
  }
  
  return { hotel }
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "hotel/:hotelId",
        element: <HotelModule />,
        loader: hotelLoader,
        children: [
          {
            path: "frontdesk",
            element: <FrontDesk />
          },
          {
            path: "finance",
            element: <Finance />
          }
        ]
      }
    ]
  }
])
```

### Navigation Hooks
```typescript
// ✅ Type-safe navigation
import { useNavigate, useLoaderData } from 'react-router-dom'

type HotelLoaderData = {
  hotel: Hotel
}

export const HotelModule = () => {
  const { hotel } = useLoaderData() as HotelLoaderData
  const navigate = useNavigate()
  
  const handleReservationClick = (reservationId: string) => {
    navigate(`/hotel/${hotel.id}/frontdesk/reservations/${reservationId}`)
  }
  
  return <div>Hotel: {hotel.name}</div>
}
```

---

## 🎯 React DnD Implementation

### Drag & Drop Architecture
```typescript
// ✅ Type-safe drag and drop
import { useDrag, useDrop } from 'react-dnd'

interface DragItem {
  type: 'reservation'
  reservation: Reservation
  sourceDate: Date
}

export const DraggableReservation = ({ reservation, date }: Props) => {
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: 'reservation',
    item: {
      type: 'reservation',
      reservation,
      sourceDate: date
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })
  
  return (
    <div
      ref={drag}
      className={cn(
        "reservation-card cursor-move",
        isDragging && "opacity-50"
      )}
    >
      {reservation.guest.firstName}
    </div>
  )
}

export const DroppableTimeSlot = ({ date, onDrop }: Props) => {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: 'reservation',
    drop: (item) => {
      onDrop(item.reservation, date)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  })
  
  return (
    <div
      ref={drop}
      className={cn(
        "time-slot",
        isOver && canDrop && "bg-blue-100",
        !canDrop && "opacity-50"
      )}
    >
      {/* Time slot content */}
    </div>
  )
}
```

---

## 📊 Performance Optimization

### Code Splitting Strategy
```typescript
// ✅ Route-based code splitting
const HotelFrontDesk = lazy(() => import('./components/hotel/frontdesk/FrontDeskLayout'))
const HotelFinance = lazy(() => import('./components/hotel/finance/FinanceLayout'))

// ✅ Component-based splitting for large features
const HotelTimeline = lazy(() => 
  import('./components/hotel/frontdesk/HotelTimeline').then(module => ({
    default: module.HotelTimeline
  }))
)
```

### Memory Management
```typescript
// ✅ Proper cleanup patterns
export const useReservationSubscription = (roomId: string) => {
  useEffect(() => {
    const controller = new AbortController()
    
    const subscription = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `room_id=eq.${roomId}`
      }, handleChange)
      .subscribe()
    
    return () => {
      controller.abort()
      subscription.unsubscribe()
    }
  }, [roomId])
}
```

### Virtualization for Large Lists
```typescript
// ✅ Virtual scrolling for performance
import { FixedSizeList as List } from 'react-window'

const ReservationsList = ({ reservations }: Props) => {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <ReservationCard reservation={reservations[index]} />
    </div>
  )
  
  return (
    <List
      height={400}
      itemCount={reservations.length}
      itemSize={80}
      overscanCount={5}
    >
      {Row}
    </List>
  )
}
```

---

## 🧪 Testing Strategies

### React Testing Library Best Practices
```typescript
// ✅ Integration testing approach
import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from './test-utils'

describe('HotelTimeline', () => {
  const renderTimeline = (props = {}) => {
    return render(
      <TestWrapper>
        <HotelTimeline {...props} />
      </TestWrapper>
    )
  }
  
  it('should create reservation on date click', async () => {
    const user = userEvent.setup()
    const onCreateReservation = jest.fn()
    
    renderTimeline({ onCreateReservation })
    
    // Click on a date cell
    await user.click(screen.getByRole('gridcell', { 
      name: /august 15/i 
    }))
    
    // Verify modal opens
    expect(screen.getByRole('dialog', {
      name: /create reservation/i
    })).toBeInTheDocument()
    
    // Fill form and submit
    await user.type(screen.getByLabelText(/guest name/i), 'John Doe')
    await user.click(screen.getByRole('button', { name: /confirm/i }))
    
    // Verify callback
    await waitFor(() => {
      expect(onCreateReservation).toHaveBeenCalledWith({
        guestName: 'John Doe',
        date: expect.any(Date)
      })
    })
  })
})
```

---

This comprehensive guide ensures consistent, high-quality implementation across all technologies in the Hotel Inventory Management System. Following these patterns will maintain code quality, performance, and developer productivity.

**Last Updated:** August 2025  
**Version:** 1.0
- i have a hot reload server running dont try to run it only to see if there are any build errors