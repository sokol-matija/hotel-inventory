# Changelog

All notable changes to the Hotel Inventory Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **CVE-2025-55184 & CVE-2025-55183 Analysis**: Confirmed these React Server Components vulnerabilities do NOT affect this project
  - Project uses Create React App (client-side only), not Next.js/RSC
  - No server-side React rendering or Server Actions
  - Supabase Edge Functions are Deno-based, not affected
- Updated React from 19.1.2 to 19.2.1 as general security best practice

### Changed
- Upgraded `react` to 19.2.1 (from 19.1.2)
- Upgraded `react-dom` to 19.2.1 (from 19.1.2)

## [2.7.0] - 2025-08-22 - Advanced Backend Integration & UI Enhancement

### Added
- Real-time conflict detection service with smart booking validation
- Optimistic UI update service with automatic rollback capabilities
- Batch operation service for bulk reservation management
- Keyboard shortcut service with 20+ power-user hotkeys
- Enhanced timeline with drag-to-create and expansion modes
- Undo/redo system for complete operation history

### Changed
- Zero TypeScript compilation errors - production ready
- Service layer architecture for business logic abstraction
- Enhanced pricing calculations with seasonal period detection

## [2.5.0] - 2025-10-14 - Phobs Channel Manager Integration

### Added
- Enterprise-grade OTA channel manager integration
- Comprehensive support for Booking.com, Expedia, Airbnb, and 10+ platforms
- Bidirectional reservation synchronization
- Advanced inventory management with real-time sync
- Intelligent conflict resolution for double bookings
- Real-time monitoring dashboard with performance metrics
- Comprehensive error handling with retry logic
- Data mapping layer for seamless API integration
- Webhook integration for instant updates
- Complete test coverage with Jest integration tests

## [2.3.0] - 2025-10-XX - Croatian Fiscalization System

### Fixed
- **BREAKTHROUGH**: Completely resolved s004 "Invalid digital signature" error
- Croatian Tax Authority now accepts XML structure (progressed from s004 → s002)

### Added
- Complete XML structure compliance with Technical Specification v1.3
- Real data validation against Hotel Porec fiscal receipts
- ZKI algorithm with RSA-SHA1 + MD5 signature validation
- Real FINA P12 certificate integration (FISKAL_3.p12)
- Digital signature compliance with exclusive canonicalization
- Croatian-compliant field formatting (OIB, DateTime, ZKI, UUID)

## [2.2.0] - 2025-02-XX - Multi-Language Email System

### Added
- Comprehensive email templates with Hotel Porec branding
- Multi-language support (English, German, Italian)
- Three email types: Welcome, Thank You, Summer Season Reminder
- Supabase Edge Function integration with Resend API
- Email testing interface for investor demos
- Professional responsive HTML design

## [2.1.0] - 2025-01-XX - Hotel Management System

### Added
- Professional front desk calendar with React Big Calendar
- Drag & drop reservations with React DnD
- Complete booking workflow with guest management
- PDF invoice generation with Croatian fiscal compliance
- GSAP-powered notification system
- Module architecture for future expansion

## [2.0.0] - 2025-01-XX - Authentication System Optimization

### Changed
- Simplified AuthProvider from 210 lines to 38 lines
- Removed complex user profile system
- Clean session management via Supabase

### Fixed
- Tab switching bug causing UI freeze
- Blocking database calls on auth changes
- TypeScript compilation errors

---

**Legend:**
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for security-related changes
