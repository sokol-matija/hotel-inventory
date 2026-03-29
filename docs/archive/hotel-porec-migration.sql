-- Hotel Porec Complete Database Migration
-- Based on current localStorage room structure and real Croatian pricing

-- =============================================
-- 1. INSERT HOTEL POREC CONFIGURATION
-- =============================================

-- Insert Hotel Porec (main hotel entity)
INSERT INTO hotels (id, name, slug, oib, business_name, address, contact_info, default_currency, timezone, is_active) 
VALUES (
    'hotel-porec-main',
    'Hotel Porec',
    'hotel-porec',
    '87246357068',
    'Hotel Porec d.o.o.',
    '{"street": "R Konoba 1", "city": "Poreč", "postal_code": "52440", "country": "HR"}',
    '{"email": "hotelporec@pu.t-com.hr", "phone": "+385(0)52/451 611", "fax": "+385(0)52/433 462", "website": "www.hotelporec.com"}',
    'EUR',
    'Europe/Zagreb',
    true
);

-- =============================================
-- 2. CREATE ROOM TYPES (Based on localStorage ROOM_TYPES)
-- =============================================

INSERT INTO room_types (id, hotel_id, code, name_croatian, name_english, max_occupancy, default_occupancy, amenities, base_rate, is_active, display_order) VALUES

-- Big Double Room
('rt-big-double', 'hotel-porec-main', 'big-double', 'Velika dvokrevetna soba', 'Big Double Room', 2, 2, 
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi", "Mini Fridge"}', 56.00, true, 1),

-- Big Single Room  
('rt-big-single', 'hotel-porec-main', 'big-single', 'Velika jednokrevetna soba', 'Big Single Room', 1, 1,
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi", "Mini Fridge", "Work Desk"}', 83.00, true, 2),

-- Double Room (Standard)
('rt-double', 'hotel-porec-main', 'double', 'Dvokrevetna soba', 'Double Room', 2, 2,
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi"}', 47.00, true, 3),

-- Triple Room
('rt-triple', 'hotel-porec-main', 'triple', 'Trokrevetna soba', 'Triple Room', 3, 3,
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi"}', 47.00, true, 4),

-- Single Room
('rt-single', 'hotel-porec-main', 'single', 'Jednokrevetna soba', 'Single Room', 1, 1,
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi"}', 70.00, true, 5),

-- Family Room
('rt-family', 'hotel-porec-main', 'family', 'Obiteljska soba', 'Family Room', 4, 4,
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi", "Extra Space"}', 47.00, true, 6),

-- Apartment
('rt-apartment', 'hotel-porec-main', 'apartment', 'Apartman', 'Apartment', 3, 3,
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi", "Kitchenette"}', 47.00, true, 7),

-- 401 Rooftop Apartment (Premium)
('rt-rooftop-apartment', 'hotel-porec-main', 'rooftop-apartment', '401 ROOFTOP APARTMAN', '401 Rooftop Apartment', 4, 4,
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi", "Kitchenette", "Balcony", "Sea View", "Premium Furnishing"}', 250.00, true, 8);

-- =============================================
-- 3. CREATE 2026 PRICE LIST (Based on real Hotel Porec document)
-- =============================================

INSERT INTO price_lists (id, hotel_id, name, year, currency, valid_from, valid_to, is_active, is_published) VALUES
('price-list-2026', 'hotel-porec-main', '2026 Season', 2026, 'EUR', '2026-01-01', '2026-12-31', true, true);

-- =============================================
-- 4. SEASONAL PERIOD DEFINITIONS (From actual Hotel Porec price list)
-- =============================================

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

-- =============================================
-- 5. ROOM TYPE PRICING (Fixed prices from Hotel Porec document)
-- =============================================

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

-- =============================================
-- 6. FEE CONFIGURATIONS (Croatian requirements)
-- =============================================

-- Tourism Tax (Monthly rates from Hotel Porec document)
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, monthly_rates, applies_to_guest_types, is_active, display_order) VALUES
('fee-tourism-tax', 'price-list-2026', 'tourism_tax', 'Boravišna pristojba / Tourism Tax', 'per_person_per_night',
 '{"01": 1.10, "02": 1.10, "03": 1.10, "04": 1.60, "05": 1.60, "06": 1.60, "07": 1.60, "08": 1.60, "09": 1.60, "10": 1.10, "11": 1.10, "12": 1.10}',
 '{"adults"}', true, 1);

-- Pet Fee
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, fixed_amount, is_active, display_order) VALUES
('fee-pets', 'price-list-2026', 'pet_fee', 'Kućni ljubimci / Pet Fee', 'fixed_amount', 20.00, true, 2);

-- Parking Fee
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, fixed_amount, is_active, display_order) VALUES
('fee-parking', 'price-list-2026', 'parking_fee', 'Parking', 'fixed_amount', 7.00, true, 3);

-- Children Discounts (Age-based from Hotel Porec document)
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, children_rules, applies_to_guest_types, is_active, display_order) VALUES
('fee-children-discount', 'price-list-2026', 'children_discount', 'Djeca / Children Discount', 'conditional',
 '[{"age_from": 0, "age_to": 3, "discount_percent": 100}, {"age_from": 3, "age_to": 7, "discount_percent": 50}, {"age_from": 7, "age_to": 14, "discount_percent": 20}]',
 '{"children"}', true, 4);

-- Short Stay Supplement (+20% for stays shorter than 3 days)
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, conditions, is_active, display_order) VALUES
('fee-short-stay', 'price-list-2026', 'short_stay_supplement', 'Boravak kraći od 3 dana / Short Stay Supplement', 'conditional',
 '{"max_nights": 3, "supplement_percent": 20}', true, 5);

-- =============================================
-- 7. ROOM GROUPS (Visual organization for timeline)
-- =============================================

INSERT INTO room_groups (id, hotel_id, name, code, color_hex, background_color, text_color, description, priority, is_active) VALUES

-- Main Building Floors
('group-floor1', 'hotel-porec-main', 'Floor 1', 'F1', '#3498db', '#ecf0f1', '#2c3e50', '18 rooms on ground floor', 1, true),
('group-floor2', 'hotel-porec-main', 'Floor 2', 'F2', '#2ecc71', '#d5f5d5', '#27ae60', '18 rooms on second floor', 2, true), 
('group-floor3', 'hotel-porec-main', 'Floor 3', 'F3', '#f39c12', '#fdf2e3', '#e67e22', '18 rooms on third floor', 3, true),
('group-floor4', 'hotel-porec-main', 'Floor 4 - Premium', 'F4', '#e74c3c', '#fdeaea', '#c0392b', 'Premium rooftop apartment', 4, true);

-- =============================================
-- 8. ALL 55 HOTEL POREC ROOMS (Based on generateHotelRooms pattern)
-- =============================================

-- FLOOR 1 ROOMS (101-118) - 18 rooms following the pattern
INSERT INTO rooms (id, hotel_id, room_type_id, room_group_id, number, floor, building, is_active, is_cleaned, max_occupancy_override, is_premium) VALUES

-- Floor 1 - Room pattern: Family, Double(4), Triple(2), Double(7), Triple(2), Double, Single
('room-101', 'hotel-porec-main', 'rt-family', 'group-floor1', '101', 1, 'MAIN', true, true, NULL, false),
('room-102', 'hotel-porec-main', 'rt-double', 'group-floor1', '102', 1, 'MAIN', true, true, NULL, false),
('room-103', 'hotel-porec-main', 'rt-double', 'group-floor1', '103', 1, 'MAIN', true, true, NULL, false),
('room-104', 'hotel-porec-main', 'rt-double', 'group-floor1', '104', 1, 'MAIN', true, true, NULL, false),
('room-105', 'hotel-porec-main', 'rt-double', 'group-floor1', '105', 1, 'MAIN', true, true, NULL, false),
('room-106', 'hotel-porec-main', 'rt-triple', 'group-floor1', '106', 1, 'MAIN', true, true, NULL, false),
('room-107', 'hotel-porec-main', 'rt-triple', 'group-floor1', '107', 1, 'MAIN', true, true, NULL, false),
('room-108', 'hotel-porec-main', 'rt-double', 'group-floor1', '108', 1, 'MAIN', true, true, NULL, false),
('room-109', 'hotel-porec-main', 'rt-double', 'group-floor1', '109', 1, 'MAIN', true, true, NULL, false),
('room-110', 'hotel-porec-main', 'rt-double', 'group-floor1', '110', 1, 'MAIN', true, true, NULL, false),
('room-111', 'hotel-porec-main', 'rt-double', 'group-floor1', '111', 1, 'MAIN', true, true, NULL, false),
('room-112', 'hotel-porec-main', 'rt-double', 'group-floor1', '112', 1, 'MAIN', true, true, NULL, false),
('room-113', 'hotel-porec-main', 'rt-double', 'group-floor1', '113', 1, 'MAIN', true, true, NULL, false),
('room-114', 'hotel-porec-main', 'rt-double', 'group-floor1', '114', 1, 'MAIN', true, true, NULL, false),
('room-115', 'hotel-porec-main', 'rt-triple', 'group-floor1', '115', 1, 'MAIN', true, true, NULL, false),
('room-116', 'hotel-porec-main', 'rt-triple', 'group-floor1', '116', 1, 'MAIN', true, true, NULL, false),
('room-117', 'hotel-porec-main', 'rt-double', 'group-floor1', '117', 1, 'MAIN', true, true, NULL, false),
('room-118', 'hotel-porec-main', 'rt-single', 'group-floor1', '118', 1, 'MAIN', true, true, NULL, false),

-- FLOOR 2 ROOMS (201-218) - Same pattern as Floor 1
('room-201', 'hotel-porec-main', 'rt-family', 'group-floor2', '201', 2, 'MAIN', true, true, NULL, false),
('room-202', 'hotel-porec-main', 'rt-double', 'group-floor2', '202', 2, 'MAIN', true, true, NULL, false),
('room-203', 'hotel-porec-main', 'rt-double', 'group-floor2', '203', 2, 'MAIN', true, true, NULL, false),
('room-204', 'hotel-porec-main', 'rt-double', 'group-floor2', '204', 2, 'MAIN', true, true, NULL, false),
('room-205', 'hotel-porec-main', 'rt-double', 'group-floor2', '205', 2, 'MAIN', true, true, NULL, false),
('room-206', 'hotel-porec-main', 'rt-triple', 'group-floor2', '206', 2, 'MAIN', true, true, NULL, false),
('room-207', 'hotel-porec-main', 'rt-triple', 'group-floor2', '207', 2, 'MAIN', true, true, NULL, false),
('room-208', 'hotel-porec-main', 'rt-double', 'group-floor2', '208', 2, 'MAIN', true, true, NULL, false),
('room-209', 'hotel-porec-main', 'rt-double', 'group-floor2', '209', 2, 'MAIN', true, true, NULL, false),
('room-210', 'hotel-porec-main', 'rt-double', 'group-floor2', '210', 2, 'MAIN', true, true, NULL, false),
('room-211', 'hotel-porec-main', 'rt-double', 'group-floor2', '211', 2, 'MAIN', true, true, NULL, false),
('room-212', 'hotel-porec-main', 'rt-double', 'group-floor2', '212', 2, 'MAIN', true, true, NULL, false),
('room-213', 'hotel-porec-main', 'rt-double', 'group-floor2', '213', 2, 'MAIN', true, true, NULL, false),
('room-214', 'hotel-porec-main', 'rt-double', 'group-floor2', '214', 2, 'MAIN', true, true, NULL, false),
('room-215', 'hotel-porec-main', 'rt-triple', 'group-floor2', '215', 2, 'MAIN', true, true, NULL, false),
('room-216', 'hotel-porec-main', 'rt-triple', 'group-floor2', '216', 2, 'MAIN', true, true, NULL, false),
('room-217', 'hotel-porec-main', 'rt-double', 'group-floor2', '217', 2, 'MAIN', true, true, NULL, false),
('room-218', 'hotel-porec-main', 'rt-single', 'group-floor2', '218', 2, 'MAIN', true, true, NULL, false),

-- FLOOR 3 ROOMS (301-318) - Same pattern as Floor 1 & 2  
('room-301', 'hotel-porec-main', 'rt-family', 'group-floor3', '301', 3, 'MAIN', true, true, NULL, false),
('room-302', 'hotel-porec-main', 'rt-double', 'group-floor3', '302', 3, 'MAIN', true, true, NULL, false),
('room-303', 'hotel-porec-main', 'rt-double', 'group-floor3', '303', 3, 'MAIN', true, true, NULL, false),
('room-304', 'hotel-porec-main', 'rt-double', 'group-floor3', '304', 3, 'MAIN', true, true, NULL, false),
('room-305', 'hotel-porec-main', 'rt-double', 'group-floor3', '305', 3, 'MAIN', true, true, NULL, false),
('room-306', 'hotel-porec-main', 'rt-triple', 'group-floor3', '306', 3, 'MAIN', true, true, NULL, false),
('room-307', 'hotel-porec-main', 'rt-triple', 'group-floor3', '307', 3, 'MAIN', true, true, NULL, false),
('room-308', 'hotel-porec-main', 'rt-double', 'group-floor3', '308', 3, 'MAIN', true, true, NULL, false),
('room-309', 'hotel-porec-main', 'rt-double', 'group-floor3', '309', 3, 'MAIN', true, true, NULL, false),
('room-310', 'hotel-porec-main', 'rt-double', 'group-floor3', '310', 3, 'MAIN', true, true, NULL, false),
('room-311', 'hotel-porec-main', 'rt-double', 'group-floor3', '311', 3, 'MAIN', true, true, NULL, false),
('room-312', 'hotel-porec-main', 'rt-double', 'group-floor3', '312', 3, 'MAIN', true, true, NULL, false),
('room-313', 'hotel-porec-main', 'rt-double', 'group-floor3', '313', 3, 'MAIN', true, true, NULL, false),
('room-314', 'hotel-porec-main', 'rt-double', 'group-floor3', '314', 3, 'MAIN', true, true, NULL, false),
('room-315', 'hotel-porec-main', 'rt-triple', 'group-floor3', '315', 3, 'MAIN', true, true, NULL, false),
('room-316', 'hotel-porec-main', 'rt-triple', 'group-floor3', '316', 3, 'MAIN', true, true, NULL, false),
('room-317', 'hotel-porec-main', 'rt-double', 'group-floor3', '317', 3, 'MAIN', true, true, NULL, false),
('room-318', 'hotel-porec-main', 'rt-single', 'group-floor3', '318', 3, 'MAIN', true, true, NULL, false),

-- FLOOR 4 - ROOM 401 (Premium Rooftop Apartment)
('room-401', 'hotel-porec-main', 'rt-rooftop-apartment', 'group-floor4', '401', 4, 'MAIN', true, true, NULL, true);

-- =============================================
-- 9. FISCAL CONFIGURATION (Croatian Tax Authority)
-- =============================================

INSERT INTO fiscal_configuration (id, hotel_id, environment, vat_rate, tourism_tax_rate, invoice_prefix, current_invoice_number, invoice_format, fiscal_year_start, is_active) VALUES
('fiscal-hotel-porec', 'hotel-porec-main', 'demo', 0.2500, 1.35, 'HP', 1, 'YYYY-NNN-NNNN', '2026-01-01', true);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify room count by floor
-- SELECT floor, COUNT(*) as room_count FROM rooms WHERE hotel_id = 'hotel-porec-main' GROUP BY floor ORDER BY floor;
-- Expected: Floor 1=18, Floor 2=18, Floor 3=18, Floor 4=1, Total=55 rooms

-- Verify room types distribution  
-- SELECT rt.name_english, COUNT(*) as count FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = 'hotel-porec-main' GROUP BY rt.name_english ORDER BY count DESC;
-- Expected: Double=39, Triple=12, Family=3, Single=3, Rooftop Apartment=1

-- Verify pricing configuration
-- SELECT rt.name_english, rtp.price_period_a, rtp.price_period_b, rtp.price_period_c, rtp.price_period_d FROM room_type_pricing rtp JOIN room_types rt ON rtp.room_type_id = rt.id WHERE rtp.price_list_id = 'price-list-2026' ORDER BY rt.display_order;

-- =============================================
-- SUMMARY
-- =============================================
-- ✅ Hotel Porec configuration inserted
-- ✅ 8 room types with real Croatian pricing
-- ✅ 2026 price list with seasonal periods A/B/C/D
-- ✅ Fixed pricing per period (not multipliers)
-- ✅ Croatian fee structure (tourism tax, pet fee, parking, children discounts)
-- ✅ 4 room groups for visual organization  
-- ✅ All 55 rooms inserted with exact localStorage pattern:
--     - Floor 1: 101-118 (18 rooms)
--     - Floor 2: 201-218 (18 rooms) 
--     - Floor 3: 301-318 (18 rooms)
--     - Floor 4: 401 (1 premium rooftop apartment)
-- ✅ Room status tracking (cleaned, active)
-- ✅ Croatian fiscal configuration ready