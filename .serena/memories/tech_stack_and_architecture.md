# Technology Stack & Architecture

## Core Technologies
### Frontend Stack
- **React 19**: Latest React with concurrent features, transitions, and modern patterns
- **TypeScript 4.9.5**: Strict mode enabled with advanced utility types and branded types
- **Tailwind CSS 3.4**: Utility-first styling with shadcn/ui component system
- **React Router DOM v7**: Type-safe routing with loaders and advanced navigation
- **Radix UI**: Accessible component primitives for robust UI foundation

### Backend & Database
- **Supabase**: PostgreSQL + Auth + Edge Functions + Real-time subscriptions
- **PostgreSQL**: Core database with inventory and user management tables
- **Edge Functions**: Serverless functions for email service and complex operations
- **Real-time Subscriptions**: Live updates for inventory and hotel operations

### State Management & Logic
- **React Context API**: Clean state management with service layer architecture
- **Custom Hooks Pattern**: State consolidation in reusable hooks (300+ lines per hook)
- **Service Layer**: Business logic abstracted into dedicated service classes
- **TypeScript Interfaces**: Strict typing with branded types and utility patterns

### Specialized Libraries
#### Hotel Management
- **React Big Calendar**: Custom hotel timeline layout with 14-day view
- **React DnD**: Drag & drop reservations between rooms and dates
- **GSAP**: Smooth animations for notifications and UI transitions
- **jsPDF + autotable**: Professional PDF invoice generation

#### Inventory & UI
- **@dnd-kit**: Drag & drop reordering for inventory items
- **date-fns**: Date manipulation and formatting utilities
- **Lucide React**: Consistent icon system throughout application
- **class-variance-authority**: Type-safe component variants
- **clsx + tailwind-merge**: Conditional class name utilities

#### Communication & Integration
- **i18next**: Multi-language support (Croatian, German, English, Italian)
- **Resend API**: Professional email service integration
- **NTFY.sh**: Real-time push notifications for mobile devices
- **Web Push API**: Browser notifications with Service Worker support

#### Croatian Business Compliance
- **node-forge**: P12 certificate handling for fiscal compliance
- **QR Code Generation**: Croatian fiscal compliance requirements
- **Croatian Tax Authority Integration**: Complete fiscalization system

## Build & Development Tools
### Build System
- **Create React App**: Foundation with CRACO customization
- **CRACO**: Configuration override for custom build setup
- **PostCSS + Autoprefixer**: CSS processing and vendor prefixes
- **TypeScript Compiler**: Strict mode compilation with path mapping

### Development Environment
- **ESLint**: React app configuration with Jest integration
- **Path Mapping**: @/* aliases for clean import statements
- **Strict TypeScript**: Advanced type checking and validation
- **Module Resolution**: Node-style with ES modules and JSON support

## Architecture Patterns
### Clean Architecture Implementation
#### Service Layer Pattern
```typescript
// Business logic abstraction
class EmailTestService {
  private static instance: EmailTestService;
  
  static getInstance(): EmailTestService { ... }
  async sendTestEmail(): Promise<TestResult> { ... }
  validateEmailAddress(email: string): boolean { ... }
}
```

#### Custom Hooks Pattern
```typescript
// State management consolidation
const useBookingState = () => {
  // 300+ lines of consolidated state logic
  return { state, actions, validation };
}
```

#### Component Simplification
```typescript
// UI components focused on presentation only
const CreateBookingModal = ({ service, onClose }) => {
  // 354 lines (down from 1,061) - 67% reduction
  // Pure presentation logic only
}
```

### TypeScript Advanced Patterns
#### Branded Types
```typescript
type RoomId = string & { __brand: 'RoomId' };
type GuestId = string & { __brand: 'GuestId' };
type ReservationId = string & { __brand: 'ReservationId' };
```

#### Utility Types
```typescript
type ReservationCreate = Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>;
type ReservationUpdate = Partial<Pick<Reservation, 'status' | 'specialRequests'>>; 
```

#### Interface Composition
```typescript
interface HotelContextType {
  reservations: Reservation[];
  guests: Guest[];
  rooms: Room[];
  companies: Company[];
  // Service method abstractions
  createReservation: (data: ReservationCreate) => Promise<Reservation>;
  updateReservation: (id: string, data: ReservationUpdate) => Promise<void>;
}
```

## Performance & Optimization
### Code Splitting Strategy
- **Route-based splitting**: Lazy loading for hotel modules
- **Component-based splitting**: Large features loaded on demand
- **Service worker**: Caching and push notification support

### Bundle Optimization
- **Tree shaking**: Unused code elimination
- **Modern build target**: ES5 with modern library support
- **Asset optimization**: Image and static file optimization

### Memory Management
- **Proper cleanup patterns**: useEffect cleanup and AbortController
- **Service layer caching**: Reduced redundant API calls
- **Component lifecycle**: Optimized re-rendering patterns

## Data Flow Architecture
### Unidirectional Data Flow
```
User Action → Component → Custom Hook → Service Layer → Supabase → Real-time Update
```

### Error Handling Pattern
```
Service Layer Validation → UI Error Boundaries → User Feedback → Recovery Actions
```

### State Management Flow
```
Context Provider → Custom Hooks → Service Abstractions → TypeScript Validation
```

This architecture demonstrates enterprise-grade patterns suitable for professional hotel management operations with clean separation of concerns, comprehensive error handling, and scalable service-oriented design.