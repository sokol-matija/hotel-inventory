# Hotel Inventory Management System

A comprehensive inventory management system built for hotel operations, featuring role-based access control, real-time tracking, and audit logging.

## Features

### Core Functionality
- **Inventory Management**: Track items across multiple locations with quantity monitoring
- **Location Management**: Support for different storage types including refrigerated and dry storage
- **Item Categorization**: Organize inventory by categories with expiration tracking
- **Dashboard Analytics**: Real-time overview with key metrics and alerts

### Role-Based Access Control
- **Admin**: Full system access including location and user management
- **Cooking Staff**: Inventory updates and viewing permissions
- **Viewing Staff**: Read-only access to inventory data

### Smart Alerts
- **Low Stock Warnings**: Automatic notifications when items fall below minimum thresholds
- **Expiration Tracking**: Monitor items expiring within 7 days
- **Quick Actions**: One-click quantity adjustments from the dashboard

### Audit & Compliance
- **Complete Audit Trail**: Track all inventory changes with user attribution
- **Navigation Logging**: Monitor system usage and access patterns
- **Data Integrity**: Comprehensive logging for compliance and troubleshooting

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: React Context API
- **Routing**: React Router DOM v7
- **Build Tool**: Create React App with CRACO

## Database Schema

### Core Tables
- `items` - Product catalog with categories and minimum stock levels
- `locations` - Storage locations (refrigerated/dry storage)
- `inventory` - Item quantities by location with expiration dates
- `categories` - Item categorization with expiration requirements
- `user_profiles` - User roles and permissions
- `audit_logs` - Complete activity tracking

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
│   ├── admin/          # Admin-only components
│   ├── audit/          # Audit log viewing
│   ├── auth/           # Authentication & authorization
│   ├── dashboard/      # Main dashboard
│   ├── global/         # Global inventory view
│   ├── items/          # Item management
│   ├── layout/         # Layout components
│   ├── locations/      # Location management
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
│   ├── auditLog.ts     # Audit logging functions
│   ├── supabase.ts     # Database client & types
│   └── utils.ts        # General utilities
└── App.tsx             # Main application component
```

## Key Features Explained

### Dashboard
The main dashboard provides:
- Real-time inventory statistics
- Quick quantity adjustments
- Expiration and low-stock alerts
- Clickable cards for detailed views

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

The system uses Supabase Auth with role-based permissions:

1. **Google OAuth Integration** - Seamless login with Google accounts
2. **Role Selection** - Users select their role after first login
3. **Protected Routes** - Role-based access to different features
4. **Session Management** - Automatic session handling and refresh

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
