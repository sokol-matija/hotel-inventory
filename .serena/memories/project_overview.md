# Hotel Inventory Management System

## Purpose
A comprehensive inventory management system built for hotel operations with the following key features:
- **Inventory Management**: Track items across multiple locations with quantity monitoring
- **Location Management**: Support for different storage types (refrigerated and dry storage)  
- **Item Categorization**: Organize inventory by categories with expiration tracking
- **Dashboard Analytics**: Real-time overview with key metrics and alerts
- **Role-Based Access Control**: Admin, Cooking Staff, and Viewing Staff roles
- **Smart Alerts**: Low stock warnings and expiration tracking
- **Audit & Compliance**: Complete audit trail with user attribution

## Tech Stack
- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: React Context API
- **Routing**: React Router DOM v7
- **Build Tool**: Create React App with CRACO
- **Internationalization**: i18next with react-i18next
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives with custom styling

## Core Database Tables
- `items` - Product catalog with categories and minimum stock levels
- `locations` - Storage locations (refrigerated/dry storage)
- `inventory` - Item quantities by location with expiration dates
- `categories` - Item categorization with expiration requirements
- `user_profiles` - User roles and permissions  
- `audit_logs` - Complete activity tracking