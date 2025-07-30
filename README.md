# Hotel Inventory Management System

A comprehensive inventory management system built for hotel operations, featuring role-based access control, real-time tracking, and audit logging.

## Features

### Core Functionality
- **Inventory Management**: Track items across multiple locations with quantity monitoring
- **Location Management**: Support for different storage types including refrigerated and dry storage
- **Item Categorization**: Organize inventory by categories with expiration tracking
- **Dashboard Analytics**: Real-time overview with key metrics and alerts

### Simplified Access Control
- **All Authenticated Users**: Full access to all inventory management features
- **Google OAuth**: Seamless authentication with Google accounts
- **Email/Password**: Traditional login option for flexibility
- **No Complex Roles**: Simplified system focusing on functionality over restrictions

### Smart Alerts & Notifications
- **Low Stock Warnings**: Automatic notifications when items fall below minimum thresholds
- **Extended Expiration Tracking**: Monitor items expiring within 30 days with color coding
- **Push Notifications**: Browser notifications for critical inventory alerts
- **Severity Levels**: Critical (1 day), Warning (2-7 days), Info (8-30 days)
- **Quick Actions**: One-click quantity adjustments from the dashboard

### Audit & Compliance
- **Complete Audit Trail**: Track all inventory changes with user attribution
- **Navigation Logging**: Monitor system usage and access patterns
- **Data Integrity**: Comprehensive logging for compliance and troubleshooting

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **State Management**: React Context API
- **Routing**: React Router DOM v7
- **Build Tool**: Create React App with CRACO
- **Internationalization**: i18next (Croatian, German, English)
- **UI Components**: Radix UI primitives + shadcn/ui
- **Drag & Drop**: @dnd-kit for inventory reordering
- **Push Notifications**: Web Push API with Service Worker

## Database Schema

### Core Tables
- `items` - Product catalog with categories and minimum stock levels
- `locations` - Storage locations (refrigerated/dry storage)
- `inventory` - Item quantities by location with expiration dates and display ordering
- `categories` - Item categorization with expiration requirements
- `user_profiles` - Basic user preferences and notification settings
- `audit_logs` - Complete activity tracking with user attribution

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hotel-inventory
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure Supabase credentials in your environment file

5. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run test suite
- `npm eject` - Eject from Create React App (not recommended)

## Project Structure

```
src/
├── components/
│   ├── admin/          # Location management components
│   ├── audit/          # Audit log viewing
│   ├── auth/           # Ultra-simplified authentication (38-line AuthProvider)
│   ├── dashboard/      # Main dashboard with analytics
│   ├── global/         # Global inventory view
│   ├── items/          # Item management (add, edit, list)
│   ├── layout/         # Layout components (Sidebar, MobileNav, Layout)
│   ├── locations/      # Location management with drag-drop ordering
│   ├── settings/       # User settings and notification preferences
│   └── ui/             # Reusable UI components (shadcn/ui)
├── hooks/              # Custom React hooks (toast, etc.)
├── i18n/               # Internationalization support (hr, de, en)
├── lib/                # Utilities and configurations
│   ├── auditLog.ts     # Audit logging functions
│   ├── dateUtils.ts    # Date formatting utilities
│   ├── permissions.ts  # Role-based permission checks
│   ├── pushNotifications.ts # Push notification handling
│   ├── safeSupabase.ts # Error handling wrapper for Supabase calls
│   ├── supabase.ts     # Database client & types
│   └── utils.ts        # General utilities
├── __tests__/          # Test files
├── public/             # Static assets and service worker
└── App.tsx             # Main application component with routing
```

## Recent Improvements & Fixes

### Authentication System Optimization (v2.1 - January 2025)
- **Simplified AuthProvider**: Reduced from 210 lines to 38 lines (matching working project)
- **Fixed Tab Switching Bug**: Eliminated UI freeze when switching browser tabs
- **Removed Complex User Profile System**: Simplified to basic user/session state only
- **TypeScript Compilation Fixed**: Removed all userProfile dependencies across components
- **Clean Session Management**: Let Supabase handle auth complexity automatically
- **No More Database Calls on Auth Changes**: Prevented blocking UI operations

### Enhanced User Experience
- **Drag & Drop Ordering**: Reorder inventory items within locations
- **Extended Expiration Tracking**: 30-day lookahead with color-coded severity
- **Push Notifications**: Browser notifications for critical inventory alerts
- **Mobile Responsive**: Optimized touch interface for all devices
- **Multi-language Support**: Croatian, German, and English localization
- **Simplified Permission System**: All authenticated users have access to all features

## Key Features Explained

### Dashboard
The main dashboard provides:
- Real-time inventory statistics with color-coded alerts
- Quick quantity adjustments with +/- buttons
- Extended expiration tracking (30 days with severity levels)
- Clickable cards for detailed location views
- Low stock warnings with customizable thresholds

### Location Management
- Create and manage storage locations
- Support for refrigerated and dry storage types
- Inventory assignment and tracking per location

### Audit System
- Comprehensive logging of all inventory changes
- User attribution for all actions
- Navigation tracking for usage analytics
- Searchable audit history

### Mobile Responsive
- Optimized layouts for mobile and tablet devices
- Touch-friendly interface elements
- Responsive navigation and forms

## Authentication & Authorization

The system uses an ultra-simplified Supabase Auth integration:

1. **Google OAuth Integration** - Seamless login with Google accounts
2. **Email/Password Auth** - Traditional login option with account creation
3. **No Complex Roles** - All authenticated users have full access
4. **Protected Routes** - Simple authentication check only
5. **Ultra-Simplified Session Management** - 38-line AuthProvider with zero complexity
6. **No Database Calls on Auth** - Prevents UI blocking and tab switching issues

## Deployment

The application is configured for deployment on Vercel:

```bash
npm run build
```

Deploy to Vercel or any static hosting provider. Make sure to configure environment variables for your production Supabase instance.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support or questions, please open an issue in the repository or contact the development team.

## License

This project is private and proprietary. All rights reserved.
