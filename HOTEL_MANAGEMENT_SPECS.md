# Hotel Management System - Complete Specifications

## Project Overview
Expanding the existing hotel inventory management system to include comprehensive hotel management features. The system will have a modular architecture with dummy data for demonstration purposes.

## Architecture Overview

### Module Selector Landing Page
After login, users see a module selection screen with:
- 🏨 Hotel Logo + "Welcome!" + same background that we currently have on the login screen
- 📊 **Channel Manager** (Future implementation)
- 🏨 **Front Desk** (Priority 1 - Building now)
- 💰 **Finance** (Future - Croatian fiscal e-računi)
- 📦 **Inventory** (Current system)

### Navigation Structure
- **Module Selector**: Button next to the logout on the sidebar 
- **Sidebar**: Collapsible sidebar in each module (reuse current inventory sidebar design)
- **Hotel Branding**: Hotel logo/name in sidebar of each module reuse current 
- **Full Screen**: Calendar can expand to full screen view
- **Permissions**: All users see all modules (role-based access later)

## Hotel Porec - Real Business Information

### Hotel Contact Information
- **Hotel Name**: Hotel Porec
- **Address**: 52440 Porec, Croatia, R Konoba 1
- **Phone**: +385(0)52/451 611
- **Fax**: +385(0)52/433 462
- **Email**: hotelporec@pu.t-com.hr
- **Website**: www.hotelporec.com
- **Tax ID (OIB)**: 87246357068

### Room Configuration (46 Total Rooms)
- **Floor 1**: Rooms 101-115 (15 rooms)
- **Floor 2**: Rooms 201-215 (15 rooms) 
- **Floor 3**: Rooms 301-315 (15 rooms)
- **Floor 4**: Room 401 (1 room) - **401 ROOFTOP APARTMAN**
- **Total**: 46 rooms

### Real Room Types & Seasonal Pricing (2025)

#### **Seasonal Periods**
- **Period A**: 02.01 - 16.04 (Winter/Early Spring)
- **Period B**: 17.04 - 28.05, 26.09 - 25.10 (Spring/Late Fall)
- **Period C**: 26.05 - 30.07, 31.08 - 25.09 (Early Summer/Early Fall)
- **Period D**: 15.07 - 31.08 (Peak Summer)

#### **Room Types & Pricing (A/B/C/D periods in €)**

**Standard Category:**
- **Velika dvokrevetna soba** (Big double room): 56€ / 70€ / 87€ / 106€
- **Velika jednokrevetna soba** (Big single room): 83€ / 108€ / 139€ / 169€

**Regular Rooms:**
- **Dvokrevetna soba** (Double room): 47€ / 57€ / 69€ / 90€
- **Trokrevetna soba** (Triple room): 47€ / 57€ / 69€ / 90€
- **Jednokrevetna soba** (Single room): 70€ / 88€ / 110€ / 144€
- **Obiteljska soba** (Family room): 47€ / 57€ / 69€ / 90€
- **Apartman** (Triple apartment, min 3 people): 47€ / 57€ / 69€ / 90€

**Premium Accommodation:**
- **401 ROOFTOP APARTMAN** (Price per apartment): 250€ / 300€ / 360€ / 450€

### Tax Structure & Additional Fees (Croatian Law)

#### **VAT**: 25% (included in room prices)

#### **Tourism Tax (Seasonal)**
- **Periods I, II, III, X, XI, XII**: €1.10 per person per night
- **Periods IV, V, VI, VII, VIII, IX**: €1.50 per person per night
- **Children 12-18 years**: 50% of tourism tax
- **Children 0-12 years**: Free

#### **Age-Based Discounts**
- **Children 0-3 years**: Free
- **Children 3-7 years**: -50% of room rate
- **Children 7-14 years**: -20% of room rate

#### **Additional Services**
- **Pet Policy**: €20.00 per stay
- **Parking**: €7.00 per night
- **Short Stay Supplement**: +20% for stays shorter than 3 days

## Front Desk Module - Detailed Specifications

### 1. **🚀 Ultra-Critical Calendar View (Staff Retention Priority #1)**

**Research Foundation**: Interactive drag-and-drop calendar is the **most critical feature** across all hotel PMS systems

#### **Layout & Structure (Optimized for <1 Month Staff Competency)**
- **Intuitive Floor Grouping**: Expandable/collapsible floor sections with clear visual hierarchy
- **Premium Room Distinction**: Room 401 with luxury styling and premium indicators
- **Multi-View Intelligence**: 14-day default, with quick-switch to 7-day, 30-day views
- **Distraction-Free Mode**: Full-screen calendar with focus mode toggle
- **Smart Zoom**: Automatic layout optimization based on screen size and room count

#### **Advanced Reservation Blocks (Color Psychology Optimized)**
- **Sophisticated Status System**: 6 carefully chosen status colors for instant recognition
  - 🟠 **Confirmed** (warm, welcoming)
  - 🟢 **Checked in** (active, positive)
  - ⚫ **Checked out** (neutral, completed)
  - 🔴 **Room closure** (alert, attention needed)
  - 🔵 **Unallocated** (calm, available)
  - ⚪ **Incomplete payment** (urgent, action required)

#### **Professional Drag & Drop System (Zero-Training Goal)**
- **Intelligent Move Detection**: Smart drag targets with visual feedback
- **Edge Resize Mastery**: Intuitive extend/split with snap-to-grid functionality
- **Conflict Prevention**: Real-time occupied room warnings with smart alternatives
- **Gesture Creation**: Natural drag-to-create booking with auto-populated details
- **Undo/Redo Support**: Ctrl+Z functionality for confident experimentation

### 2. Reservation Management

#### New Booking Creation (via Drag)
**Auto-filled Fields:**
- Check-in/Check-out dates (from calendar drag)
- Room number (from calendar position)
- Room rate (based on room type)

**Required Fields:**
- Guest name
- Guest email
- Number of people
- Pet toggle (Yes/No)

**Auto-complete:**
- Existing guest search/selection using lastname
- Create new guest if not found

#### Reservation Popup (Click on Block)
**Elegant popup displaying:**
- Guest name(s) staying in room
- 🛂 Passport icon (clickable to preview uploaded image)
- 🌍 Preferred language/nationality
- 📝 Special request notes
- 💰 Total payment amount (clickable for detailed breakdown)

**Quick Edit Toggle:**
- Enable inline editing of all popup fields
- Save/Cancel buttons when in edit mode

#### Payment Details View
**Detailed breakdown showing:**
- Room rate × nights
- VAT (25%)
- Tourism tax (€2 × people × nights)
- Additional charges (room service, extras)
- Total amount
- Payment status
- 🖨️ Print PDF invoice button
- 📧 **Send Reminder Email** button (manual trigger for testing)

### 3. Check-in/Check-out Process
- **Check-in Button**: In reservation detail view
- **Status Change**: Updates reservation color on calendar
- **Real-time Updates**: Calendar reflects status changes immediately

### 4. Guest Management

#### Guest Profile Information
**Contact Details:**
- Full name
- Email address
- Phone number
- Emergency contact

**Travel Information:**
- Nationality/Country
- Preferred language
- Passport document upload/storage

**Booking Preferences:**
- Pet ownership
- Special requests/notes

**No Booking History**: Not implemented initially (future feature)

## Technical Implementation

### Calendar Library: React Big Calendar (Free Alternative)
**Why React Big Calendar:**
- ✅ Free, open-source MIT license
- ✅ Mature library with active community support
- ✅ Customizable grid layout for hotel booking systems
- ✅ React + TypeScript support
- ✅ Custom drag & drop implementation possible
- ✅ Flexible styling and theming

**Installation:**
```bash
npm install react-big-calendar moment
npm install @types/react-big-calendar --save-dev
```

**Custom Implementation Approach:**
- Use Month view as base, customize to show rooms as "days"
- Implement custom drag & drop with react-dnd
- Custom styling to achieve hotel booking grid appearance
- Floor grouping through custom header components

### Internationalization (i18n) Setup
**Language Files:**
- `src/i18n/locales/en.json` - English (default)
- `src/i18n/locales/hr.json` - Croatian  
- `src/i18n/locales/de.json` - German

**Key Translation Categories:**
```json
{
  "modules": {
    "channelManager": "Channel Manager",
    "frontDesk": "Front Desk", 
    "finance": "Finance",
    "inventory": "Inventory"
  },
  "calendar": {
    "confirmed": "Confirmed",
    "checkedIn": "Checked In",
    "checkedOut": "Checked Out",
    "roomClosure": "Room Closure",
    "unallocated": "Unallocated",
    "incompletePayment": "Incomplete Payment"
  },
  "rooms": {
    "basic": "Basic",
    "deluxe": "Deluxe", 
    "superior": "Superior",
    "premium": "Premium"
  },
  "booking": {
    "guestName": "Guest Name",
    "numberOfGuests": "Number of Guests",
    "hasPets": "Has Pets",
    "specialRequests": "Special Requests"
  }
}
```

### Component Library Enhancements
**Additional UI Libraries to Consider:**
- **Framer Motion**: Smooth animations for module transitions
- **React Hook Form**: Form handling for booking creation
- **React Select**: Enhanced guest autocomplete
- **React Dropzone**: Passport document upload
- **jsPDF**: PDF invoice generation

### Dummy Data Management Strategy

#### TypeScript Interfaces (Hotel Porec Real Data)
```typescript
type SeasonalPeriod = 'A' | 'B' | 'C' | 'D';
type RoomType = 'big-double' | 'big-single' | 'double' | 'triple' | 'single' | 'family' | 'apartment' | 'rooftop-apartment';

interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  nameCroatian: string;
  nameEnglish: string;
  seasonalRates: {
    A: number; // Winter/Early Spring
    B: number; // Spring/Late Fall  
    C: number; // Early Summer/Early Fall
    D: number; // Peak Summer
  };
  maxOccupancy: number;
}

interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  emergencyContact: string;
  nationality: string;
  preferredLanguage: string;
  passportDocument?: string;
  hasPets: boolean;
  dateOfBirth?: Date;
  children: GuestChild[];
}

interface GuestChild {
  name: string;
  dateOfBirth: Date;
  age: number; // Calculated for discount purposes
}

interface Reservation {
  id: string;
  roomId: string;
  guestId: string;
  checkIn: Date;
  checkOut: Date;
  numberOfGuests: number;
  adults: number;
  children: GuestChild[];
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'room-closure' | 'unallocated' | 'incomplete-payment';
  bookingSource: 'booking.com' | 'direct' | 'other';
  specialRequests: string;
  
  // Pricing breakdown
  seasonalPeriod: SeasonalPeriod;
  baseRoomRate: number;
  numberOfNights: number;
  subtotal: number;
  childrenDiscounts: number;
  tourismTax: number;
  vatAmount: number; // 25%
  petFee: number;
  parkingFee: number;
  shortStaySuplement: number;
  additionalCharges: number;
  totalAmount: number;
}

interface PricingCalculation {
  baseRate: number;
  numberOfNights: number;
  seasonalPeriod: SeasonalPeriod;
  tourismTaxRate: number; // €1.10 or €1.50 based on season
  subtotal: number;
  discounts: {
    children0to3: number;
    children3to7: number;
    children7to14: number;
  };
  fees: {
    tourism: number;
    vat: number;
    pets: number;
    parking: number;
    shortStay: number;
  };
  total: number;
}
```

#### Data Storage Approach
- **React Context**: Global state management for hotel data
- **Local Storage**: Persist dummy data between sessions
- **Easy Migration**: Structure designed for easy API integration later
- **Type Safety**: Full TypeScript interfaces matching future database schema

### Component Structure & Routing

#### **Routing Architecture**
```
/ → /dashboard (existing)
/inventory → existing inventory system
/hotel/module-selector → hotel module landing page
/hotel/front-desk → front desk calendar system
/hotel/channel-manager → future implementation
/hotel/finance → future implementation
```

#### **Component Structure**
```
src/components/hotel/
├── ModuleSelector.tsx          # Landing page with 4 modules
├── shared/
│   ├── HotelLayout.tsx        # Shared layout with sidebar
│   ├── ModuleSelectorButton.tsx # Bottom sidebar button
│   └── PricingCalculator.ts   # Hotel Porec pricing logic
├── frontdesk/
│   ├── FrontDeskLayout.tsx    # Main front desk container
│   ├── Calendar/
│   │   ├── CalendarView.tsx   # React-big-calendar customized
│   │   ├── CalendarGrid.tsx   # Custom grid layout component
│   │   ├── ReservationBlock.tsx # Individual reservation blocks
│   │   ├── ReservationPopup.tsx # Elegant detail popup
│   │   ├── FloorSection.tsx   # Expandable floor grouping
│   │   └── DragDropHandler.tsx # Custom drag & drop logic
│   ├── Reservations/
│   │   ├── CreateBooking.tsx  # New booking form
│   │   ├── PaymentDetails.tsx # Hotel Porec pricing breakdown
│   │   ├── InvoiceGenerator.tsx # PDF with Hotel Porec info
│   │   └── GuestAutocomplete.tsx
│   └── Guests/
│       ├── GuestProfile.tsx   # Guest management
│       └── ChildrenManager.tsx # Age-based discount handling
```

#### **Existing System Integration**
- **Sidebar Enhancement**: Add "Module Selector" button at bottom under logout
- **AuthProvider**: Keep existing 38-line simple version
- **Routing**: Extend existing React Router with hotel routes
- **Styling**: Reuse existing Tailwind + shadcn/ui components

## Design Principles & Premium UI Standards

### **🎨 Modern Premium Design Language**
- **Luxury Hotel Aesthetic**: Clean, sophisticated, professional appearance
- **Consistent Theme**: Single design system across all modules
- **Premium Color Palette**: Elegant neutrals with sophisticated accent colors
- **Modern Typography**: Clean, readable fonts with proper hierarchy
- **Smooth Animations**: Subtle transitions and micro-interactions using Framer Motion

### **🎯 Visual Design Standards**
- **Glassmorphism Effects**: Subtle transparency and blur effects for modern look
- **Consistent Spacing**: 8px grid system for perfect alignment
- **Rounded Corners**: Consistent border-radius for modern feel
- **Shadow System**: Layered shadows for depth and hierarchy
- **Icon Consistency**: Lucide React icons throughout (matching existing app)

### **🏨 Hotel-Specific Premium Features**
- **Elegant Calendar Grid**: Professional booking calendar with smooth drag animations
- **Sophisticated Status Colors**: Tasteful color coding for reservation statuses
- **Premium Cards**: Elevated card designs for guest profiles and payment details
- **Luxury Module Selector**: Beautiful landing page with hotel ambiance
- **Professional Forms**: Clean, intuitive booking forms with elegant validation

### **📱 Mobile-First Supremacy (60% Check-in Completion Target)**
**Ultra-Mobile Strategy**: Addressing the reality that mobile isn't secondary - it's primary
- **Mobile-First Development**: Build for mobile, enhance for desktop (not vice versa)
- **Touch-Optimized Calendar**: Finger-friendly drag & drop with haptic feedback
- **Progressive Web App**: No download required, works offline, push notifications
- **One-Handed Operation**: All critical functions accessible with thumb navigation
- **Quick Actions Bar**: Bottom-sheet interface for common mobile tasks
- **Voice Input Support**: Guest name/notes entry via speech recognition
- **Gesture Shortcuts**: Swipe patterns for power users (swipe right = check-in)

### **🎭 Consistent Component Library**
- **shadcn/ui Base**: Continue using existing premium component library
- **Custom Hotel Components**: Specialized components matching the design system
- **Tailwind CSS**: Consistent styling utilities across all modules
- **Dark Mode Ready**: Future-proof design system for dark theme

### **✨ Premium User Experience ("Joy of Use" Architecture)**
**Employee Retention Focus**: Addressing the 38% of hotel staff who leave due to poor PMS experience
- **One-Click Actions**: Minimize clicks for common tasks (check-in ≤ 3 clicks, room assignment ≤ 2 clicks)
- **Contextual Intelligence**: Smart shortcuts and predictive actions based on user patterns
- **Instant Feedback**: Sub-200ms response times with elegant loading states
- **Graceful Error Recovery**: Clear recovery paths with helpful suggestions (not just error messages)
- **Staff Confidence Metrics**: Built-in onboarding progress tracking to achieve <1 month competency
- **Accessibility Excellence**: WCAG AAA compliant with keyboard shortcuts for power users

### **🎪 Advanced Visual Polish**
- **Custom Illustrations**: Hotel-themed illustrations for empty states
- **Branded Elements**: Consistent hotel branding throughout the experience
- **Premium Interactions**: Smooth hover states, focus indicators, and button feedback
- **Professional Data Visualization**: Charts and metrics with premium styling

## Additional Required Dependencies
**New Package Installations:**
```bash
# Calendar & Date Handling
npm install react-big-calendar moment        # Free calendar library
npm install @types/react-big-calendar --save-dev
npm install react-dnd react-dnd-html5-backend # Drag & drop functionality

# Form Handling & UI
npm install react-hook-form                  # Elegant form handling
npm install react-select                     # Beautiful guest autocomplete
npm install react-dropzone                   # Drag & drop file upload

# PDF & Email
npm install jspdf jspdf-autotable             # Professional PDF generation
npm install @react-email/components          # Beautiful HTML email templates
npm install @react-email/render              # Email template rendering

# Animation & Polish
npm install framer-motion                    # Smooth animations & transitions
npm install @headlessui/react                # Additional premium components
npm install react-hot-toast                  # Already installed - elegant notifications

# Utilities
npm install date-fns                         # Date calculations for seasonal pricing
npm install lodash                           # Utility functions
npm install @types/lodash --save-dev
```

## Database Schema Planning (Future Backend)
**Additional Tables Needed:**
```sql
-- Hotel Management Tables
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  number VARCHAR(10) NOT NULL,
  floor INTEGER NOT NULL,
  type room_type NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL,
  status room_status DEFAULT 'available'
);

CREATE TABLE guests (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  emergency_contact VARCHAR(255),
  nationality VARCHAR(100),
  preferred_language VARCHAR(10),
  passport_document TEXT,
  has_pets BOOLEAN DEFAULT false
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  guest_id UUID REFERENCES guests(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  number_of_guests INTEGER NOT NULL,
  status reservation_status NOT NULL,
  booking_source VARCHAR(50),
  special_requests TEXT,
  room_rate DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  additional_charges DECIMAL(10,2) DEFAULT 0
);
```

## Error Handling & Edge Cases
**Calendar Edge Cases:**
- Overlapping reservations validation
- Past date booking prevention
- Maximum occupancy per room
- Room maintenance periods
- Overbooking warnings

**Data Validation Rules:**
- Email format validation
- Phone number format (Croatian/International)
- Check-out after check-in validation
- Guest count > 0 validation
- Required field validation with i18n messages

## Performance Considerations
**Optimization Strategies:**
- Virtual scrolling for 46 rooms × 14 days grid
- Lazy loading of guest profiles
- Debounced search autocomplete
- Memoized calendar calculations
- LocalStorage caching strategy

## Implementation Priority (Desktop-First Front Desk Module)

### **Phase 1: Foundation & Routing (Week 1)**
1. **Module Selector Button**: Add to existing sidebar bottom (under logout)
2. **Hotel Routes**: Add `/hotel/module-selector` and `/hotel/front-desk` routes
3. **Module Selector Page**: Landing page with 4 modules (reusing login background)
4. **Hotel Layout**: Shared layout component with existing sidebar integration

### **Phase 2: Room Data & Calendar Setup (Week 2)**
5. **Hotel Porec Room Data**: Create 46 rooms with real types and seasonal pricing
6. **React Big Calendar**: Install and configure free calendar library
7. **Custom Grid Layout**: Transform calendar to hotel booking grid (rooms × dates)
8. **Pricing Calculator**: Implement Hotel Porec seasonal pricing logic

### **Phase 3: Calendar Functionality (Week 3)**
9. **Calendar View**: 14-day desktop grid with expandable floor sections
10. **Reservation Blocks**: 6 color-coded blocks matching status system
11. **React DnD Integration**: Custom drag & drop for reservations
12. **Conflict Prevention**: Block drag to occupied rooms with toast notification

### **Phase 4: Booking System (Week 4)**
13. **Drag-to-Create**: New booking creation with auto-filled room/dates
14. **Booking Form**: Guest details with children age-based discounts
15. **Guest Autocomplete**: Search by lastname, create new profiles
16. **Reservation Popup**: Elegant detail view with all guest information

### **Phase 5: Payment & Invoice System (Week 5)**
17. **Payment Details**: Hotel Porec pricing breakdown (seasonal rates, tourism tax, children discounts)
18. **PDF Invoice**: Professional invoice with real Hotel Porec contact information
19. **Check-in/Check-out**: Status management and calendar updates
20. **Local Storage**: Persist all data between sessions

### **Phase 6: Polish & Testing (Week 6)**
21. **Desktop UX**: Optimize for front desk desktop use
22. **Email Templates**: Basic email system for testing
23. **Error Handling**: Comprehensive validation and user feedback
24. **Performance**: Optimize calendar rendering for 46 rooms × 14 days

## Email Notification System

### **📧 Automated Guest Reminder Emails**

#### **14-Day Pre-Arrival Reminder**
**Trigger**: Automatically sent 14 days before check-in date
**Content**: Professional HTML email featuring:
- **Poreč, Istria Tourism Info**: Beautiful imagery and local attractions
- **Booking Confirmation**: Dates, room details, guest information
- **Hotel Information**: Contact details, check-in instructions
- **Local Recommendations**: Restaurants, activities, attractions in Poreč
- **Weather Forecast**: 7-day forecast for arrival period
- **Elegant Design**: Responsive HTML template matching hotel branding

#### **Manual Email Testing Feature**
**UI Location**: Reservation detail popup and payment details view
**Button**: 📧 **"Send Reminder Email Now"** 
**Functionality**: 
- Immediately sends beautifully designed test email
- Shows toast notification: "Reminder email sent to [guest-email]"
- Logs email send action in audit trail
- Perfect for demonstrating to customers

#### **Your Specific Email Optimization Strategy**

**QR Code on Invoice Implementation**:
- **QR Code Location**: Bottom of every PDF invoice generated
- **Link Destination**: Personalized booking page with guest's previous stay data
- **Exclusive Offer**: 15-20% "Return Guest" discount (rate parity bypass)
- **One-Click Rebooking**: Pre-filled dates, room preferences, guest details
- **Mobile Landing Page**: Optimized for mobile booking completion

**Annual Email Marketing Campaign**:
- **Timing**: Send 6-8 weeks before their typical booking season
- **Subject**: "Your special invitation back to [Hotel Name], [Guest Name]"
- **Content Strategy**:
  - Personal greeting referencing their previous stay
  - Exclusive VIP return guest rates (only available via email)
  - Poreč local events calendar for the upcoming year
  - Anniversary acknowledgment of their stay
  - Direct booking link with 20% exclusive discount

**Check-in Welcome Email (30 minutes post check-in)**:
- **Hotel amenities**: Pool hours, gym access, Wi-Fi password
- **Poreč local attractions**: Personalized recommendations based on stay length
- **Parking information**: Validation procedures and nearby options
- **Breakfast details**: Times, reservations required, special dietary options
- **Local dining**: Top 5 restaurant recommendations within walking distance
- **Transportation**: Bus schedules, taxi numbers, hotel shuttle information

#### **Direct Booking ROI Tracking**
**Commission Savings Dashboard**:
- **"Direct Booking Saved: €XXX"** badge on each reservation
- **QR Code Performance**: Scan rates, conversion rates, rebooking success
- **Email Campaign Analytics**: Open rates, click-through, booking conversion
- **Guest Loyalty Metrics**: Repeat booking frequency, lifetime value

#### **Email Template Features**
**Professional Design Elements:**
- Hotel logo and branding
- High-quality Poreč/Istria imagery
- Responsive layout for mobile/desktop
- Clear call-to-action buttons
- Social media links
- Unsubscribe option (future compliance)

**Content Sections:**
1. **Welcome Message**: Personalized greeting with guest name
2. **Booking Summary**: Check-in/out dates, room type, number of guests
3. **Poreč Highlights**: Local attractions, beaches, restaurants
4. **Practical Information**: Check-in process, parking, amenities
5. **Contact Information**: Hotel phone, email, emergency contact
6. **Social Proof**: Trip Advisor reviews, hotel awards

#### **Technical Implementation**
**Email Service**: Supabase Edge Functions + Resend/SendGrid
**Template Engine**: React Email for beautiful HTML templates
**Scheduling**: Database triggers for 14-day automation
**Testing**: Manual trigger button for immediate sending

```typescript
interface EmailTemplate {
  guestName: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomType: string;
  numberOfGuests: number;
  bookingReference: string;
  specialRequests?: string;
}
```

## 🇭🇷 Croatian Market Domination Strategy

### **Ultra-Specialized Local Advantage**
What generalist competitors like Cloudbeds/RoomRaccoon cannot match

**Regulatory Excellence:**
- **Automatic Tourism Tax Collection**: €2 per person per night with nationality tracking
- **Croatian VAT Integration**: 25% automated calculation with proper invoice formatting
- **webracun.com Integration**: Direct fiscal compliance for Croatian e-računi system  
- **Multi-currency Optimization**: EUR primary, with USD/GBP for international guests
- **GDPR+ Compliance**: Beyond basic requirements with Croatian data protection laws

**Tourism-Specific Features:**
- **Poreč/Istria Local Events**: Dynamic pricing based on local festivals and events
- **Regional Guest Preferences**: German/Italian/Austrian tourist behavior patterns
- **Seasonal Rate Intelligence**: Croatian coastal tourism seasonal pricing optimization
- **Local Business Directory**: Integrated recommendations for partner restaurants/activities
- **Regional Language Support**: Perfect Croatian, German, Italian translations (not generic)

**Competitive Advantage Metrics:**
- **Market Penetration**: Target 15% of Croatian hotels (25-100 rooms) by end of year 2
- **Local Partnership**: Integration with Croatian tourism boards and event calendars
- **Regulatory Compliance**: 100% Croatian fiscal law compliance from day 1
- **Language Quality**: Native-level translations vs. competitors' generic translations

## Future Integrations (Not Implemented Now)
- **Channel Manager API**: External booking platform integration
- **Croatian Finance System**: webracun.com integration for fiscal compliance
- **Real Backend**: Replace dummy data with Supabase integration
- **Role-based Access**: Different permissions for different user types
- **Advanced Reporting**: Revenue analytics and occupancy reports
- **Email Automation**: Scheduled reminder emails via Supabase Edge Functions

---

**Status**: Ready for implementation with dummy data
**Timeline**: Module Selector → Calendar → Reservations → Guests → Payments → Email Templates
**Design**: Elegant, intuitive, consistent with existing inventory system