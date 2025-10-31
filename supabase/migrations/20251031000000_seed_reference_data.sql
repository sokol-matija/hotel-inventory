-- Seed data migration for local development
-- This file populates reference/lookup tables and basic hotel configuration
-- Run this after the baseline schema migration

-- ============================================
-- REFERENCE DATA (Required for app to function)
-- ============================================

-- User Roles (Required for registration/onboarding)
INSERT INTO user_roles (id, name, description, created_at) VALUES
(1, 'reception', 'Front desk and guest services staff', '2025-07-22 16:41:41.270229+00'),
(2, 'kitchen', 'Kitchen and food service staff', '2025-07-22 16:41:41.270229+00'),
(3, 'housekeeping', 'Housekeeping and maintenance staff', '2025-07-22 16:41:41.270229+00'),
(4, 'bookkeeping', 'Accounting and financial management staff', '2025-07-22 16:41:41.270229+00'),
(5, 'admin', 'System administrator with full access', '2025-07-22 16:41:41.270229+00')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for user_roles
SELECT setval('user_roles_id_seq', 5, true);

-- Booking Sources
INSERT INTO booking_sources (id, code, name, default_commission_rate, api_config, color, icon, is_active, display_order, created_at) VALUES
(1, 'direct', 'Direct Booking', 0.0000, null, '#10B981', 'phone', true, 1, '2025-08-28 03:59:31.652469+00'),
(2, 'booking_com', 'Booking.com', 0.1500, null, '#003580', 'globe', true, 2, '2025-08-28 03:59:31.652469+00'),
(3, 'airbnb', 'Airbnb', 0.1200, null, '#FF5A5F', 'home', true, 3, '2025-08-28 03:59:31.652469+00'),
(4, 'expedia', 'Expedia', 0.1800, null, '#FFC72C', 'plane', true, 4, '2025-08-28 03:59:31.652469+00'),
(5, 'walk_in', 'Walk-in', 0.0000, null, '#8B5CF6', 'user', true, 0, '2025-08-28 03:59:31.652469+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('booking_sources_id_seq', 5, true);

-- Reservation Statuses
INSERT INTO reservation_statuses (id, code, name, color, icon, description, is_active, display_order, created_at) VALUES
(1, 'confirmed', 'Confirmed', '#10B981', 'check-circle', null, true, 1, '2025-08-28 03:59:31.652469+00'),
(2, 'checked-in', 'Checked In', '#3B82F6', 'door-open', null, true, 2, '2025-08-28 03:59:31.652469+00'),
(3, 'checked-out', 'Checked Out', '#6B7280', 'door-closed', null, true, 3, '2025-08-28 03:59:31.652469+00'),
(4, 'cancelled', 'Cancelled', '#EF4444', 'x-circle', null, true, 4, '2025-08-28 03:59:31.652469+00'),
(5, 'no-show', 'No Show', '#F59E0B', 'alert-triangle', null, true, 5, '2025-08-28 03:59:31.652469+00'),
(6, 'pending', 'Pending', '#8B5CF6', 'clock', null, true, 0, '2025-08-28 03:59:31.652469+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('reservation_statuses_id_seq', 6, true);

-- Room Types
INSERT INTO room_types (id, code, name, max_occupancy, base_area_sqm, description, color, icon, is_active, display_order, created_at) VALUES
(1, 'single', 'Single Room', 1, null, null, '#8B5CF6', 'bed', true, 1, '2025-08-28 03:59:31.652469+00'),
(2, 'double', 'Double Room', 2, null, null, '#10B981', 'bed', true, 2, '2025-08-28 03:59:31.652469+00'),
(3, 'triple', 'Triple Room', 3, null, null, '#3B82F6', 'bed', true, 3, '2025-08-28 03:59:31.652469+00'),
(4, 'family', 'Family Room', 4, null, null, '#F59E0B', 'users', true, 4, '2025-08-28 03:59:31.652469+00'),
(5, 'apartment', 'Apartment', 6, null, null, '#EF4444', 'building', true, 5, '2025-08-28 03:59:31.652469+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('room_types_id_seq', 5, true);

-- Inventory Categories
INSERT INTO categories (id, name, description, requires_expiration, created_at) VALUES
(1, 'Food & Beverage', 'Food items, beverages, and kitchen supplies', true, '2025-07-22 16:50:06.61433+00'),
(2, 'Cleaning Supplies', 'Cleaning products and housekeeping materials', false, '2025-07-22 16:50:06.61433+00'),
(3, 'Linens & Textiles', 'Bedding, towels, curtains, and fabric items', false, '2025-07-22 16:50:06.61433+00'),
(4, 'Bathroom Amenities', 'Toiletries, soaps, shampoos, and bathroom supplies', false, '2025-07-22 16:50:06.61433+00'),
(5, 'Office Supplies', 'Stationery, paper, and administrative materials', false, '2025-07-22 16:50:06.61433+00'),
(6, 'Maintenance Tools', 'Hardware, tools, and maintenance equipment', false, '2025-07-22 16:50:06.61433+00'),
(7, 'Guest Amenities', 'Welcome gifts, room service items, and guest supplies', true, '2025-07-22 16:50:06.61433+00'),
(8, 'Electronics', 'Batteries, bulbs, and electronic equipment', false, '2025-07-22 16:50:06.61433+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('categories_id_seq', 8, true);

-- Storage Locations
INSERT INTO locations (id, name, type, description, is_refrigerated, created_at) VALUES
(1, 'Bar Fridge', 'refrigerator', 'Bar ', true, '2025-07-22 16:49:11.890386+00'),
(2, 'Test', 'refrigerator', 'Test', true, '2025-07-30 11:45:17.435076+00'),
(3, 'Test02', 'freezer', 'Test', true, '2025-07-30 17:26:01.213371+00'),
(4, 'Ostava', 'pantry', 'ss', false, '2025-07-30 17:29:28.858752+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('locations_id_seq', 4, true);

-- Pricing Tiers
INSERT INTO pricing_tiers (id, name, description, seasonal_rate_a, seasonal_rate_b, seasonal_rate_c, seasonal_rate_d, is_percentage_discount, minimum_stay, valid_from, valid_to, is_active, is_default, created_at, updated_at) VALUES
(1, 'Standard 2025', 'Default pricing tier for 2025', 1.000, 1.000, 1.000, 1.000, true, null, '2025-01-01', null, true, true, '2025-08-13 22:15:42.00874+00', '2025-08-13 22:15:42.00874+00'),
(7, 'Standard Rate', 'Default pricing tier for all customers', 0.000, 0.000, 0.000, 0.000, true, null, '2025-01-01', null, true, true, '2025-08-17 07:06:31.58078+00', '2025-08-17 07:06:31.58078+00'),
(8, 'Corporate Rate', 'Special pricing for corporate clients (10% off)', 0.100, 0.100, 0.100, 0.100, true, null, '2025-01-01', null, true, false, '2025-08-17 07:06:31.58078+00', '2025-08-17 07:06:31.58078+00'),
(9, 'Long Stay Discount', 'Discount for stays over 7 nights (15% off)', 0.150, 0.150, 0.150, 0.150, true, null, '2025-01-01', null, true, false, '2025-08-17 07:06:31.58078+00', '2025-08-17 07:06:31.58078+00'),
(10, 'VIP Guest Rate', 'Special rate for VIP guests (20% off)', 0.200, 0.200, 0.200, 0.200, true, null, '2025-01-01', null, true, false, '2025-08-17 07:06:31.58078+00', '2025-08-17 07:06:31.58078+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval('pricing_tiers_id_seq', 10, true);

-- ============================================
-- HOTEL CONFIGURATION (For testing reservations)
-- ============================================

-- Hotel record (Note: Using integer ID 1 for compatibility with existing schema)
INSERT INTO hotels (id, name, address, contact_info, oib, created_at, updated_at) VALUES
(1, 'Hotel Porec', null, null, '87246357068', '2025-08-16 06:01:59.322161+00', '2025-08-16 06:01:59.322161+00')
ON CONFLICT (id) DO NOTHING;

-- Note: Rooms data will be added via separate data-only dump due to volume (55 rooms)
-- Run: supabase db dump --data-only --table rooms > supabase/migrations/20251031000001_seed_rooms_data.sql
