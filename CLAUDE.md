# Hotel Inventory Management System - Claude Context

## Project Overview
A comprehensive hotel inventory management system built with React 19 and Supabase. The system provides real-time inventory tracking, expiration monitoring, push notifications, and a complete hotel management front desk system with professional email communication.

## Core Principles (From User Instructions)
1. **Simplicity First**: Every change should impact as little code as possible
2. **Root Cause Fixes**: Never use temporary fixes - find and fix the underlying issue
3. **Senior Developer Approach**: Be thorough, methodical, and never lazy
4. **Task-Driven Development**: Plan tasks in todo.md, track progress, provide high-level summaries

## Recent Major Improvements

### Multi-Language Email System Implementation (February 2025)
- **New Feature**: Comprehensive guest email communication system with Hotel Porec branding
- **Implementation**: Supabase Edge Functions + Resend API for reliable email delivery
- **Features Added**:
  - **Multi-Language Support**: Welcome emails in English, German, and Italian
  - **Three Email Types**: Welcome, Thank You, and Summer Season Reminder emails
  - **Professional Design**: HTML templates with responsive layout and hotel branding
  - **Real Hotel Assets**: Hotel Porec logo and mosaic background from Supabase storage
  - **Testing Interface**: Email test page in Front Desk module for investor demonstrations
  - **Template Features**: Check-in instructions, breakfast times, local attractions, contact info
- **Technical**: Fixed CORS issues, implemented secure backend email sending, proper image hosting

### Hotel Management System Implementation (January 2025)
- **Major Feature**: Complete hotel front desk system with professional calendar interface
- **Implementation**: React Big Calendar + React DnD for drag & drop reservations
- **Features Added**:
  - **Timeline Calendar**: 14-day view with 46 Hotel Porec rooms across 4 floors
  - **Reservation Management**: Drag & drop bookings, guest profiles, check-in/check-out
  - **PDF Invoices**: Croatian fiscal compliance with jsPDF, real hotel information
  - **Custom Notifications**: GSAP-powered hotel-themed notification system
  - **Module Architecture**: Expandable design for future channel manager and finance modules
- **Data**: Real Hotel Porec business data, seasonal pricing, Croatian tax structure

### Authentication System Optimization (January 2025)
- **Problem**: Overcomplicated AuthProvider with complex user profile fetching causing UI freeze on tab switching
- **Solution**: Replaced with ultra-simple 38-line AuthProvider (matching working project exactly)
- **Fixed Issues**: 
  - **CRITICAL**: Eliminated UI freeze when switching browser tabs
  - **CRITICAL**: Removed all database calls on auth state changes
  - **FIXED**: TypeScript compilation errors from userProfile dependencies
  - **REMOVED**: Complex role-based access control system
  - **SIMPLIFIED**: All authenticated users now have full access
- **Result**: Clean, lightweight auth with zero blocking operations

## Tech Stack & Dependencies

### Core Technologies
- **React 19** with TypeScript
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **Tailwind CSS** with shadcn/ui components
- **React Router DOM v7**
- **Create React App** with CRACO configuration

### Key Features
- **i18next**: Multi-language support (Croatian, German, English, Italian)
- **@dnd-kit**: Drag & drop for inventory reordering
- **react-dnd**: Hotel reservation drag & drop system
- **Web Push API**: Browser notifications with service worker
- **Radix UI**: Accessible component primitives
- **GSAP**: Smooth animations and custom notification system
- **jsPDF**: Professional PDF invoice generation
- **React Big Calendar**: Hotel front desk timeline interface
- **Resend API**: Professional email delivery service

## File Structure & Important Files

### Authentication (`src/components/auth/`)
- `AuthProvider.tsx`: **ULTRA-SIMPLIFIED** - Clean, lightweight auth context (38 lines, matches working project)
- `LoginPage.tsx`: Google OAuth + email/password authentication
- `RoleSelection.tsx`: Legacy role assignment (no longer used)

### Core Features
- `src/components/dashboard/Dashboard.tsx`: Main analytics dashboard
- `src/components/locations/LocationDetail.tsx`: Drag-drop inventory management
- `src/components/settings/SettingsPage.tsx`: Notification preferences
- `src/lib/supabase.ts`: Database client and type definitions

### Hotel Management System (`src/components/hotel/`)
- `ModuleSelector.tsx`: Hotel module selection landing page
- `frontdesk/FrontDeskCalendar.tsx`: Professional 14-day timeline calendar
- `frontdesk/EmailTestPage.tsx`: Multi-language email testing interface
- `shared/HotelLayout.tsx`: Shared hotel module layout with sidebar
- `src/lib/emailService.ts`: **COMPLETE EMAIL SYSTEM** - Multi-language templates with Supabase integration
- `src/lib/hotel/`: Hotel-specific types, data, and utilities
- `src/lib/notifications.ts`: **CUSTOM NOTIFICATION SYSTEM** - GSAP-powered hotel-themed notifications

### Critical Files to Monitor
- `src/components/auth/AuthProvider.tsx`: **ULTRA-SIMPLIFIED (38 lines)** - NEVER re-complicate
- `src/lib/pushNotifications.ts`: Push notification handling
- `public/sw.js`: Service worker for notifications
- `supabase/functions/daily-notifications/`: Edge function for automated alerts

## Database Schema

### Core Tables
- `user_profiles`: Basic user notification preferences (no roles)
- `items`: Product catalog with categories and minimum stock
- `locations`: Storage locations (refrigerated/dry)
- `inventory`: Item quantities with expiration dates and display ordering
- `categories`: Item categorization with expiration requirements
- `audit_logs`: Complete activity tracking

### Key Features
- **Simplified access**: All authenticated users have full access
- **Expiration tracking**: 30-day lookahead with severity levels
- **Audit logging**: Complete change tracking with user attribution
- **Push notifications**: Browser notifications for critical alerts

## Development Guidelines

### Authentication Changes
- **CRITICAL**: AuthProvider is now 38 lines - NEVER make it more complex
- **NEVER** re-add userProfile or role-based logic 
- **NEVER** add database calls on auth state changes
- **NEVER** add debug session monitoring or window event listeners
- **ALWAYS** keep it exactly like the working project (38 lines max)
- Any auth change that causes UI freezing must be immediately reverted

### Code Style
- Prefer editing existing files over creating new ones
- Use TypeScript strictly - no any types
- Follow existing patterns for consistency
- Maintain responsive design for mobile/tablet
- Use shadcn/ui components for consistency

### Testing Approach
- **CRITICAL**: Test tab switching behavior after ANY auth changes
- Verify push notifications work across browsers
- Test that all authenticated users can access all features
- Verify drag-drop functionality
- Test multi-language support
- **ALWAYS** test TypeScript compilation with `npm run build`

## Common Issues & Solutions

### Tab Switching Problems
- **Cause**: Usually auth-related - complex session monitoring or event listeners
- **Solution**: Keep auth simple, remove debug code, let Supabase handle sessions

### Performance Issues
- **Memory Leaks**: Check for uncleaned event listeners or intervals
- **Slow Loading**: Audit database queries and component re-renders
- **Connection Issues**: Simplify auth flow, avoid complex session management

### Development Setup
```bash
npm install          # Install dependencies
npm start           # Start development server
npm test            # Run test suite
npm run build       # Build for production
```

## Deployment & Configuration

### Environment Variables
- Supabase URL and anon key
- VAPID keys for push notifications
- OAuth configuration for Google auth

### Vercel Deployment
- Configured for static hosting
- Environment variables in Vercel dashboard
- Automatic deployments from main branch

## Push Notifications Setup
- VAPID keys configured for web push
- Service worker at `/sw.js`
- Edge function for daily notifications
- User preferences in settings page

## Recent Bug Fixes (January 2025)
- **MAJOR: UI Freeze Fix**: Replaced complex AuthProvider with 38-line simple version
- **MAJOR: Tab Switching**: Navbar remains responsive after switching tabs - NO MORE FREEZING
- **TypeScript Compilation**: Fixed all userProfile dependencies across components
- **Simplified Access Control**: Removed complex role system, all users have full access
- **Session Management**: Zero database calls on auth changes
- **Mobile Drag & Drop**: Improved touch interface for reordering
- **Expiration Tracking**: Extended from 7 to 30 days with color coding

## Development Notes
- **CRITICAL**: The AuthProvider is now 38 lines - keep it that way
- **NEVER** add complex session monitoring, userProfile, or role logic back
- Focus on user-facing features over internal complexity
- **ALWAYS** test tab switching behavior after any auth changes
- Maintain the drag-drop ordering functionality
- Keep push notifications working across all supported browsers
- All authenticated users have full access to all features

---

**Last Updated**: January 30, 2025  
**Version**: 2.1 (Ultra-Simplified Auth - 38 lines)  
**Key Focus**: Simplicity, stability, no UI freezing