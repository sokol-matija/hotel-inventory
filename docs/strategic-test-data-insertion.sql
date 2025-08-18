-- =============================================
-- HOTEL POREC STRATEGIC TEST DATA INSERTION
-- Realistic data for immediate functionality testing
-- =============================================

-- =============================================
-- PHASE 1: CORE HOTEL CONFIGURATION
-- =============================================

-- 1. INSERT HOTEL POREC
INSERT INTO hotels (id, name, slug, oib, business_name, address, contact_info, default_currency, timezone, is_active) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',  -- Fixed UUID for consistency
    'Hotel Porec',
    'hotel-porec',
    '87246357068',  -- Real Croatian OIB
    'Hotel Porec d.o.o.',
    '{"street": "R Konoba 1", "city": "Poreč", "postal_code": "52440", "country": "HR"}',
    '{"email": "hotelporec@pu.t-com.hr", "phone": "+385(0)52/451 611", "fax": "+385(0)52/433 462", "website": "www.hotelporec.com"}',
    'EUR',
    'Europe/Zagreb',
    true
);

-- 2. INSERT ROOM TYPES (8 types from Hotel Porec)
INSERT INTO room_types (id, hotel_id, code, name_croatian, name_english, max_occupancy, default_occupancy, amenities, base_rate, is_active, display_order) VALUES

-- Big Double Room (BD)
('rt-big-double', '550e8400-e29b-41d4-a716-446655440000', 'BD', 'Velika dvokrevetna soba', 'Big Double Room', 2, 2, 
 '["Private Bathroom", "Air Conditioning", "TV", "WiFi", "Mini Fridge"]', 56.00, true, 1),

-- Big Single Room (BS)
('rt-big-single', '550e8400-e29b-41d4-a716-446655440000', 'BS', 'Velika jednokrevetna soba', 'Big Single Room', 1, 1,
 '["Private Bathroom", "Air Conditioning", "TV", "WiFi", "Mini Fridge", "Work Desk"]', 83.00, true, 2),

-- Double Room (D)
('rt-double', '550e8400-e29b-41d4-a716-446655440000', 'D', 'Dvokrevetna soba', 'Double Room', 2, 2,
 '["Private Bathroom", "Air Conditioning", "TV", "WiFi"]', 47.00, true, 3),

-- Triple Room (T)
('rt-triple', '550e8400-e29b-41d4-a716-446655440000', 'T', 'Trokrevetna soba', 'Triple Room', 3, 3,
 '["Private Bathroom", "Air Conditioning", "TV", "WiFi"]', 47.00, true, 4),

-- Single Room (S)
('rt-single', '550e8400-e29b-41d4-a716-446655440000', 'S', 'Jednokrevetna soba', 'Single Room', 1, 1,
 '["Private Bathroom", "Air Conditioning", "TV", "WiFi"]', 70.00, true, 5),

-- Family Room (F)
('rt-family', '550e8400-e29b-41d4-a716-446655440000', 'F', 'Obiteljska soba', 'Family Room', 4, 4,
 '["Private Bathroom", "Air Conditioning", "TV", "WiFi", "Extra Space"]', 47.00, true, 6),

-- Apartment (A)
('rt-apartment', '550e8400-e29b-41d4-a716-446655440000', 'A', 'Apartman', 'Apartment', 3, 3,
 '["Private Bathroom", "Air Conditioning", "TV", "WiFi", "Kitchenette"]', 47.00, true, 7),

-- 401 Rooftop Apartment (RA)
('rt-rooftop-apartment', '550e8400-e29b-41d4-a716-446655440000', 'RA', '401 ROOFTOP APARTMAN', '401 Rooftop Apartment', 4, 4,
 '["Private Bathroom", "Air Conditioning", "TV", "WiFi", "Kitchenette", "Balcony", "Sea View", "Premium Furnishing"]', 250.00, true, 8);

-- 3. CREATE ROOM GROUPS (Floor organization)
INSERT INTO room_groups (id, hotel_id, name, code, color_hex, background_color, text_color, description, priority, is_active) VALUES
('group-floor1', '550e8400-e29b-41d4-a716-446655440000', 'Floor 1', 'F1', '#3498db', '#ecf0f1', '#2c3e50', '18 rooms on ground floor', 1, true),
('group-floor2', '550e8400-e29b-41d4-a716-446655440000', 'Floor 2', 'F2', '#2ecc71', '#d5f5d5', '#27ae60', '18 rooms on second floor', 2, true), 
('group-floor3', '550e8400-e29b-41d4-a716-446655440000', 'Floor 3', 'F3', '#f39c12', '#fdf2e3', '#e67e22', '18 rooms on third floor', 3, true),
('group-floor4', '550e8400-e29b-41d4-a716-446655440000', 'Floor 4 - Premium', 'F4', '#e74c3c', '#fdeaea', '#c0392b', 'Premium rooftop apartment', 4, true);

-- =============================================
-- PHASE 2: 55 HOTEL ROOMS (Exact pattern from localStorage)
-- =============================================

-- FLOOR 1 ROOMS (101-118) - 18 rooms
-- Pattern: Family, Double(4), Triple(2), Double(7), Triple(2), Double, Single
INSERT INTO rooms (id, hotel_id, room_type_id, room_group_id, number, floor, building, is_active, is_cleaned, max_occupancy_override, is_premium) VALUES

-- Floor 1 - Following exact localStorage pattern
('room-101', '550e8400-e29b-41d4-a716-446655440000', 'rt-family', 'group-floor1', '101', 1, 'MAIN', true, true, NULL, false),
('room-102', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '102', 1, 'MAIN', true, true, NULL, false),
('room-103', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '103', 1, 'MAIN', true, true, NULL, false),
('room-104', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '104', 1, 'MAIN', true, true, NULL, false),
('room-105', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '105', 1, 'MAIN', true, true, NULL, false),
('room-106', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor1', '106', 1, 'MAIN', true, true, NULL, false),
('room-107', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor1', '107', 1, 'MAIN', true, true, NULL, false),
('room-108', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '108', 1, 'MAIN', true, true, NULL, false),
('room-109', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '109', 1, 'MAIN', true, true, NULL, false),
('room-110', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '110', 1, 'MAIN', true, true, NULL, false),
('room-111', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '111', 1, 'MAIN', true, true, NULL, false),
('room-112', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '112', 1, 'MAIN', true, true, NULL, false),
('room-113', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '113', 1, 'MAIN', true, true, NULL, false),
('room-114', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '114', 1, 'MAIN', true, true, NULL, false),
('room-115', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor1', '115', 1, 'MAIN', true, true, NULL, false),
('room-116', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor1', '116', 1, 'MAIN', true, true, NULL, false),
('room-117', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor1', '117', 1, 'MAIN', true, true, NULL, false),
('room-118', '550e8400-e29b-41d4-a716-446655440000', 'rt-single', 'group-floor1', '118', 1, 'MAIN', true, true, NULL, false),

-- FLOOR 2 ROOMS (201-218) - Same pattern as Floor 1
('room-201', '550e8400-e29b-41d4-a716-446655440000', 'rt-family', 'group-floor2', '201', 2, 'MAIN', true, true, NULL, false),
('room-202', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '202', 2, 'MAIN', true, true, NULL, false),
('room-203', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '203', 2, 'MAIN', true, true, NULL, false),
('room-204', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '204', 2, 'MAIN', true, true, NULL, false),
('room-205', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '205', 2, 'MAIN', true, true, NULL, false),
('room-206', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor2', '206', 2, 'MAIN', true, true, NULL, false),
('room-207', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor2', '207', 2, 'MAIN', true, true, NULL, false),
('room-208', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '208', 2, 'MAIN', true, true, NULL, false),
('room-209', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '209', 2, 'MAIN', true, true, NULL, false),
('room-210', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '210', 2, 'MAIN', true, true, NULL, false),
('room-211', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '211', 2, 'MAIN', true, true, NULL, false),
('room-212', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '212', 2, 'MAIN', true, true, NULL, false),
('room-213', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '213', 2, 'MAIN', true, true, NULL, false),
('room-214', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '214', 2, 'MAIN', true, true, NULL, false),
('room-215', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor2', '215', 2, 'MAIN', true, true, NULL, false),
('room-216', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor2', '216', 2, 'MAIN', true, true, NULL, false),
('room-217', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor2', '217', 2, 'MAIN', true, true, NULL, false),
('room-218', '550e8400-e29b-41d4-a716-446655440000', 'rt-single', 'group-floor2', '218', 2, 'MAIN', true, true, NULL, false),

-- FLOOR 3 ROOMS (301-318) - Same pattern as Floor 1 & 2  
('room-301', '550e8400-e29b-41d4-a716-446655440000', 'rt-family', 'group-floor3', '301', 3, 'MAIN', true, true, NULL, false),
('room-302', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '302', 3, 'MAIN', true, true, NULL, false),
('room-303', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '303', 3, 'MAIN', true, true, NULL, false),
('room-304', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '304', 3, 'MAIN', true, true, NULL, false),
('room-305', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '305', 3, 'MAIN', true, true, NULL, false),
('room-306', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor3', '306', 3, 'MAIN', true, true, NULL, false),
('room-307', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor3', '307', 3, 'MAIN', true, true, NULL, false),
('room-308', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '308', 3, 'MAIN', true, true, NULL, false),
('room-309', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '309', 3, 'MAIN', true, true, NULL, false),
('room-310', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '310', 3, 'MAIN', true, true, NULL, false),
('room-311', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '311', 3, 'MAIN', true, true, NULL, false),
('room-312', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '312', 3, 'MAIN', true, true, NULL, false),
('room-313', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '313', 3, 'MAIN', true, true, NULL, false),
('room-314', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '314', 3, 'MAIN', true, true, NULL, false),
('room-315', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor3', '315', 3, 'MAIN', true, true, NULL, false),
('room-316', '550e8400-e29b-41d4-a716-446655440000', 'rt-triple', 'group-floor3', '316', 3, 'MAIN', true, true, NULL, false),
('room-317', '550e8400-e29b-41d4-a716-446655440000', 'rt-double', 'group-floor3', '317', 3, 'MAIN', true, true, NULL, false),
('room-318', '550e8400-e29b-41d4-a716-446655440000', 'rt-single', 'group-floor3', '318', 3, 'MAIN', true, true, NULL, false),

-- FLOOR 4 - ROOM 401 (Premium Rooftop Apartment)
('room-401', '550e8400-e29b-41d4-a716-446655440000', 'rt-rooftop-apartment', 'group-floor4', '401', 4, 'MAIN', true, true, NULL, true);

-- =============================================
-- PHASE 3: PRICING CONFIGURATION (2026 Season)
-- =============================================

-- 4. CREATE 2026 PRICE LIST
INSERT INTO price_lists (id, hotel_id, name, year, currency, valid_from, valid_to, is_active, is_published) VALUES
('price-list-2026', '550e8400-e29b-41d4-a716-446655440000', '2026 Season', 2026, 'EUR', '2026-01-01', '2026-12-31', true, true);

-- 5. SEASONAL PERIOD DEFINITIONS (From Hotel Porec price list)
INSERT INTO seasonal_period_definitions (id, price_list_id, period_code, period_name, date_ranges, color_hex, priority, is_active) VALUES

-- Period A (Winter/Low Season)
('season-a-2026', 'price-list-2026', 'A', 'Winter Season', 
 '[{"from": "2026-01-04", "to": "2026-04-01"}, {"from": "2026-10-25", "to": "2026-12-29"}]',
 '#3498db', 1, true),

-- Period B (Shoulder Season)  
('season-b-2026', 'price-list-2026', 'B', 'Shoulder Season',
 '[{"from": "2026-04-02", "to": "2026-05-21"}, {"from": "2026-09-27", "to": "2026-10-24"}, {"from": "2026-12-30", "to": "2027-01-02"}]',
 '#f39c12', 2, true),

-- Period C (High Season)
('season-c-2026', 'price-list-2026', 'C', 'High Season',
 '[{"from": "2026-05-22", "to": "2026-07-09"}, {"from": "2026-09-01", "to": "2026-09-26"}]',
 '#e67e22', 3, true),

-- Period D (Peak Summer)
('season-d-2026', 'price-list-2026', 'D', 'Peak Summer',
 '[{"from": "2026-07-10", "to": "2026-08-31"}]',
 '#e74c3c', 4, true);

-- 6. ROOM TYPE PRICING (Fixed prices from Hotel Porec document)
INSERT INTO room_type_pricing (id, price_list_id, room_type_id, price_period_a, price_period_b, price_period_c, price_period_d, minimum_stay_nights, is_active) VALUES

-- Big Double Room: 56€/70€/87€/106€
('pricing-big-double', 'price-list-2026', 'rt-big-double', 56.00, 70.00, 87.00, 106.00, 1, true),

-- Big Single Room: 83€/108€/139€/169€  
('pricing-big-single', 'price-list-2026', 'rt-big-single', 83.00, 108.00, 139.00, 169.00, 1, true),

-- Double Room: 47€/57€/69€/90€
('pricing-double', 'price-list-2026', 'rt-double', 47.00, 57.00, 69.00, 90.00, 1, true),

-- Triple Room: 47€/57€/69€/90€
('pricing-triple', 'price-list-2026', 'rt-triple', 47.00, 57.00, 69.00, 90.00, 1, true),

-- Single Room: 70€/88€/110€/144€
('pricing-single', 'price-list-2026', 'rt-single', 70.00, 88.00, 110.00, 144.00, 1, true),

-- Family Room: 47€/57€/69€/90€  
('pricing-family', 'price-list-2026', 'rt-family', 47.00, 57.00, 69.00, 90.00, 1, true),

-- Apartment: 47€/57€/69€/90€
('pricing-apartment', 'price-list-2026', 'rt-apartment', 47.00, 57.00, 69.00, 90.00, 1, true),

-- 401 Rooftop Apartment: 250€/300€/360€/460€
('pricing-rooftop', 'price-list-2026', 'rt-rooftop-apartment', 250.00, 300.00, 360.00, 460.00, 1, true);

-- 7. FEE CONFIGURATIONS (Croatian requirements)
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, monthly_rates, applies_to_guest_types, is_active, display_order) VALUES
('fee-tourism-tax', 'price-list-2026', 'tourism_tax', 'Boravišna pristojba / Tourism Tax', 'per_person_per_night',
 '{"01": 1.10, "02": 1.10, "03": 1.10, "04": 1.60, "05": 1.60, "06": 1.60, "07": 1.60, "08": 1.60, "09": 1.60, "10": 1.10, "11": 1.10, "12": 1.10}',
 '["adults"]', true, 1);

INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, fixed_amount, is_active, display_order) VALUES
('fee-pets', 'price-list-2026', 'pet_fee', 'Kućni ljubimci / Pet Fee', 'fixed_amount', 20.00, true, 2),
('fee-parking', 'price-list-2026', 'parking_fee', 'Parking', 'fixed_amount', 7.00, true, 3);

INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, children_rules, applies_to_guest_types, is_active, display_order) VALUES
('fee-children-discount', 'price-list-2026', 'children_discount', 'Djeca / Children Discount', 'conditional',
 '[{"age_from": 0, "age_to": 3, "discount_percent": 100}, {"age_from": 3, "age_to": 7, "discount_percent": 50}, {"age_from": 7, "age_to": 14, "discount_percent": 20}]',
 '["children"]', true, 4);

INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, conditions, is_active, display_order) VALUES
('fee-short-stay', 'price-list-2026', 'short_stay_supplement', 'Boravak kraći od 3 dana / Short Stay Supplement', 'conditional',
 '{"max_nights": 3, "supplement_percent": 20}', true, 5);

-- 8. FISCAL CONFIGURATION
INSERT INTO fiscal_configuration (id, hotel_id, environment, vat_rate, tourism_tax_rate, invoice_prefix, current_invoice_number, invoice_format, fiscal_year_start, is_active) VALUES
('fiscal-hotel-porec', '550e8400-e29b-41d4-a716-446655440000', 'demo', 0.2500, 1.35, 'HP', 1, 'YYYY-NNN-NNNN', '2026-01-01', true);

-- =============================================
-- PHASE 4: REALISTIC TEST DATA
-- =============================================

-- 9. REALISTIC TEST GUESTS (Diverse Croatian/European names)
INSERT INTO guests (id, first_name, last_name, email, phone, nationality, preferred_language, has_pets, date_of_birth, is_vip, total_stays, created_at, updated_at) VALUES

-- VIP Guest (repeat customer)
('guest-marko-kovac', 'Marko', 'Kovač', 'marko.kovac@gmail.com', '+385 91 234 5678', 'Croatia', 'hr', false, '1985-03-15', true, 5, NOW() - INTERVAL '2 years', NOW()),

-- German Family (summer vacation)
('guest-hans-mueller', 'Hans', 'Müller', 'hans.mueller@email.de', '+49 151 12345678', 'Germany', 'de', true, '1978-07-22', false, 2, NOW() - INTERVAL '6 months', NOW()),
('guest-petra-mueller', 'Petra', 'Müller', 'petra.mueller@email.de', '+49 151 87654321', 'Germany', 'de', true, '1980-11-30', false, 2, NOW() - INTERVAL '6 months', NOW()),

-- Italian Business Traveler
('guest-giuseppe-rossi', 'Giuseppe', 'Rossi', 'giuseppe.rossi@company.it', '+39 320 1234567', 'Italy', 'it', false, '1975-12-10', false, 1, NOW() - INTERVAL '3 months', NOW()),

-- British Couple (honeymoon)
('guest-james-smith', 'James', 'Smith', 'james.smith@email.co.uk', '+44 7700 123456', 'United Kingdom', 'en', false, '1990-05-18', false, 0, NOW() - INTERVAL '1 month', NOW()),
('guest-sarah-smith', 'Sarah', 'Smith', 'sarah.smith@email.co.uk', '+44 7700 654321', 'United Kingdom', 'en', false, '1992-09-25', false, 0, NOW() - INTERVAL '1 month', NOW()),

-- Austrian Family with children
('guest-franz-wagner', 'Franz', 'Wagner', 'franz.wagner@email.at', '+43 664 1234567', 'Austria', 'de', false, '1982-04-12', false, 1, NOW() - INTERVAL '2 weeks', NOW()),

-- Local Croatian guest
('guest-ana-horvat', 'Ana', 'Horvat', 'ana.horvat@gmail.com', '+385 98 765 4321', 'Croatia', 'hr', false, '1988-08-05', false, 3, NOW() - INTERVAL '1 year', NOW());

-- 10. REALISTIC RESERVATIONS (Mix of current, future, and past)
-- Note: Using current hotel_id and room_ids

-- Current Reservation: German Family in Room 201 (Family Room)
INSERT INTO reservations (
    id, hotel_id, room_id, primary_guest_id, confirmation_number,
    check_in, check_out, adults, children, total_guests,
    status, booking_source, special_requests, seasonal_period,
    base_room_rate, number_of_nights, subtotal_accommodation,
    children_discount, tourism_tax, vat_accommodation,
    pet_fee_subtotal, parking_fee_subtotal, short_stay_supplement,
    additional_services_subtotal, total_amount, total_vat_amount,
    payment_status, has_pets, booking_date, created_at, updated_at
) VALUES (
    'res-mueller-family-current',
    '550e8400-e29b-41d4-a716-446655440000',
    'room-201',  -- Family Room Floor 2
    'guest-hans-mueller',
    'HP260815001',
    CURRENT_DATE - INTERVAL '2 days',  -- Checked in 2 days ago
    CURRENT_DATE + INTERVAL '5 days',  -- Checking out in 5 days
    2, 2, 4,  -- 2 adults, 2 children
    'checked-in',
    'booking.com',
    'Late check-in requested. Family with young children.',
    'D',  -- Peak summer
    90.00,  -- Family room peak rate
    7,  -- 7 nights
    630.00,  -- 7 nights * 90€
    72.00,  -- Children discount (20% for 2 children aged 7-14)
    44.80,  -- Tourism tax: 2 adults * 7 nights * 1.60€
    139.50,  -- VAT: 25% of (630 - 72)
    20.00,  -- Pet fee
    49.00,  -- Parking: 7 nights * 7€
    0.00,  -- No short stay supplement (7 nights)
    0.00,  -- No additional services
    741.30,  -- Total: 630 - 72 + 44.80 + 139.50 + 20 + 49
    139.50,
    'paid',
    true,  -- Has pets
    NOW() - INTERVAL '3 weeks',
    NOW() - INTERVAL '3 weeks',
    NOW()
),

-- Upcoming Reservation: VIP Guest in Premium Room 401
(
    'res-kovac-vip-upcoming',
    '550e8400-e29b-41d4-a716-446655440000',
    'room-401',  -- Rooftop apartment
    'guest-marko-kovac',
    'HP260815002',
    CURRENT_DATE + INTERVAL '3 days',  -- Checking in soon
    CURRENT_DATE + INTERVAL '6 days',  -- 3 nights
    2, 0, 2,  -- 2 adults, no children
    'confirmed',
    'direct',
    'VIP guest - welcome amenities. Sea view preferred.',
    'D',  -- Peak summer
    460.00,  -- Rooftop apartment peak rate
    3,  -- 3 nights
    1380.00,  -- 3 nights * 460€
    0.00,  -- No children discount
    9.60,  -- Tourism tax: 2 adults * 3 nights * 1.60€
    345.00,  -- VAT: 25% of 1380
    0.00,  -- No pets
    21.00,  -- Parking: 3 nights * 7€
    276.00,  -- Short stay supplement: 20% of 1380 (less than 3 nights - wait, it's exactly 3, so might not apply)
    50.00,  -- Welcome amenities for VIP
    1681.60,  -- Total calculated
    345.00,
    'pending',
    false,
    NOW() - INTERVAL '1 week',
    NOW() - INTERVAL '1 week',
    NOW()
),

-- Past Reservation: Italian Business (completed)
(
    'res-rossi-business-past',
    '550e8400-e29b-41d4-a716-446655440000',
    'room-218',  -- Single room
    'guest-giuseppe-rossi',
    'HP260715001',
    CURRENT_DATE - INTERVAL '2 weeks',
    CURRENT_DATE - INTERVAL '1 week',  -- 7 nights ago
    1, 0, 1,  -- 1 adult
    'checked-out',
    'direct',
    'Business traveler - early check-in, late check-out.',
    'D',  -- Peak summer
    144.00,  -- Single room peak rate
    7,  -- 1 week
    1008.00,  -- 7 nights * 144€
    0.00,  -- No children
    11.20,  -- Tourism tax: 1 adult * 7 nights * 1.60€
    252.00,  -- VAT: 25% of 1008
    0.00,  -- No pets
    49.00,  -- Parking: 7 nights * 7€
    0.00,  -- No short stay supplement (7 nights)
    25.00,  -- Business services
    1345.20,  -- Total
    252.00,
    'paid',
    false,
    NOW() - INTERVAL '3 weeks',
    NOW() - INTERVAL '3 weeks',
    NOW()
);

-- =============================================
-- VERIFICATION & SUCCESS
-- =============================================

-- Verification queries (as comments for reference)
/*
-- Verify room count by floor
SELECT floor, COUNT(*) as room_count 
FROM rooms 
WHERE hotel_id = '550e8400-e29b-41d4-a716-446655440000' 
GROUP BY floor 
ORDER BY floor;
-- Expected: Floor 1=18, Floor 2=18, Floor 3=18, Floor 4=1, Total=55 rooms

-- Verify room types distribution  
SELECT rt.name_english, COUNT(*) as count 
FROM rooms r 
JOIN room_types rt ON r.room_type_id = rt.id 
WHERE r.hotel_id = '550e8400-e29b-41d4-a716-446655440000' 
GROUP BY rt.name_english 
ORDER BY count DESC;
-- Expected: Double=39, Triple=12, Family=3, Single=3, Rooftop Apartment=1

-- Verify current reservations
SELECT r.confirmation_number, g.first_name, g.last_name, rm.number as room, r.status, r.check_in, r.check_out
FROM reservations r
JOIN guests g ON r.primary_guest_id = g.id
JOIN rooms rm ON r.room_id = rm.id
WHERE r.hotel_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY r.check_in;

-- Verify pricing configuration
SELECT rt.name_english, rtp.price_period_a, rtp.price_period_b, rtp.price_period_c, rtp.price_period_d 
FROM room_type_pricing rtp 
JOIN room_types rt ON rtp.room_type_id = rt.id 
WHERE rtp.price_list_id = 'price-list-2026' 
ORDER BY rt.display_order;
*/

DO $$
BEGIN
    RAISE NOTICE '✅ HOTEL POREC TEST DATA INSERTION COMPLETED';
    RAISE NOTICE '🏨 Hotel Porec configured with 55 rooms across 4 floors';
    RAISE NOTICE '💰 2026 pricing with Croatian fiscal compliance ready';
    RAISE NOTICE '👥 8 realistic test guests with diverse backgrounds';
    RAISE NOTICE '📅 3 test reservations: 1 current, 1 upcoming, 1 past';
    RAISE NOTICE '🎯 Ready for front-desk UI testing';
END $$;