# Hotel Inventory Database Schema - ER Diagram

## Core Booking & Pricing Flow

```mermaid
erDiagram
    GUESTS ||--o{ RESERVATIONS : books
    RESERVATIONS ||--|| ROOMS : "stays in"
    RESERVATIONS ||--o{ INVOICES : "billed with"
    RESERVATIONS ||--o{ GUEST_STAYS : "tracks"
    RESERVATIONS ||--o{ RESERVATION_DAILY_DETAILS : "has daily"
    RESERVATIONS ||--o{ PAYMENTS : "pays with"

    ROOMS ||--|| ROOM_TYPES : "is type of"
    ROOMS ||--o{ ROOM_PRICING : "has pricing"
    ROOMS ||--o{ PHOBS_ROOM_MAPPINGS : "maps to"

    ROOM_PRICING }o--|| PRICING_SEASONS : "valid in"
    ROOM_PRICING }o--|| PRICING_TIERS : "uses tier"

    PRICING_SEASONS ||--|| HOTELS : "belongs to"
    PRICING_TIERS ||--o{ COMPANIES : "applied to"

    RESERVATIONS }o--|| PRICING_TIERS : "has tier"
    RESERVATIONS }o--|| COMPANIES : "booked by"
    RESERVATIONS }o--|| BOOKING_SOURCES : "source"
    RESERVATIONS }o--|| RESERVATION_STATUSES : "has status"

    INVOICES }o--|| GUESTS : "for guest"
    INVOICES }o--|| COMPANIES : "for company"
    INVOICES }o--|| RESERVATIONS : "for reservation"

    GUEST_STAYS ||--|| GUESTS : "guest"
    GUEST_STAYS ||--|| RESERVATIONS : "reservation"
    GUEST_STAYS ||--o{ DAILY_GUEST_SERVICES : "services"
```

## Phobs Channel Manager Integration

```mermaid
erDiagram
    PHOBS_CHANNELS ||--o{ PHOBS_AVAILABILITY : "has"
    PHOBS_AVAILABILITY }o--|| PHOBS_RATE_PLANS : "uses"
    PHOBS_AVAILABILITY }o--|| PHOBS_ROOM_MAPPINGS : "for"

    PHOBS_ROOM_MAPPINGS }o--|| ROOMS : "maps to"
    PHOBS_RATE_PLANS ||--o{ PHOBS_AVAILABILITY : "rates"

    PHOBS_CHANNELS ||--o{ PHOBS_CHANNEL_STATUS : "status"
    PHOBS_CHANNELS ||--o{ PHOBS_CHANNEL_METRICS : "metrics"

    PHOBS_CONFLICTS ||--o{ PHOBS_SYNC_LOG : "logged in"
    PHOBS_WEBHOOK_EVENTS ||--o{ PHOBS_SYNC_LOG : "triggers"
```

## Inventory & Services

```mermaid
erDiagram
    ITEMS ||--|| CATEGORIES : "category"
    ITEMS ||--o{ INVENTORY : "stock"
    INVENTORY }o--|| LOCATIONS : "stored at"

    RESERVATIONS ||--o{ DAILY_GUEST_SERVICES : "services"
    RESERVATIONS ||--o{ ROOM_SERVICE_ORDERS : "orders"

    GUEST_CHILDREN ||--|| GUESTS : "child of"
    GUEST_CHILDREN ||--o{ RESERVATIONS : "on reservation"
```

## User & Audit

```mermaid
erDiagram
    USER_PROFILES ||--|| USER_ROLES : "has role"
    AUDIT_LOGS ||--o{ USER_PROFILES : "by user"
```

## Table Details by Category

### Core Booking Tables
- **reservations**: Main booking record with pricing calculations
- **guests**: Guest information
- **rooms**: Room inventory
- **room_types**: Room type definitions
- **reservation_statuses**: Status codes
- **booking_sources**: OTA and direct booking sources

### Pricing Tables
- **pricing_tiers**: Discount/rate configurations per company
- **pricing_seasons**: Seasonal periods (A, B, C, D)
- **room_pricing**: Room-specific pricing by season
- **phobs_rate_plans**: OTA rate configurations

### Financial Tables
- **invoices**: Generated bills
- **payments**: Payment records
- **fiscal_records**: Tax/fiscal submission records

### Guest & Stay Details
- **guest_stays**: Check-in/out tracking
- **guest_children**: Children on reservation
- **daily_guest_services**: Daily services (parking, pets, etc.)
- **reservation_daily_details**: Daily rate breakdown

### Channel Manager (Phobs)
- **phobs_channels**: OTA channel configurations
- **phobs_room_mappings**: Internal to OTA room mapping
- **phobs_availability**: Availability and rates per channel
- **phobs_conflicts**: Sync conflict detection
- **phobs_webhook_events**: Incoming OTA events
- **phobs_sync_log**: Sync operation history

### Inventory
- **items**: Inventory items
- **categories**: Item categories
- **locations**: Storage locations
- **inventory**: Stock tracking
- **room_service_orders**: Service charges

### System
- **user_profiles**: User accounts
- **user_roles**: User roles
- **audit_logs**: Change tracking
