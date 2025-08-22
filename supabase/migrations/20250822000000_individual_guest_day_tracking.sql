-- Individual Guest/Object Day Tracking & Pricing Refactor Migration
-- This migration implements individual guest day tracking and fixes VAT double-charging

-- 1. Create guest_children table if it doesn't exist
CREATE TABLE IF NOT EXISTS guest_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  age INTEGER NOT NULL, -- Calculated field for convenience
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create reservation_daily_details table for individual guest/object day tracking
CREATE TABLE reservation_daily_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  stay_date DATE NOT NULL,
  
  -- Individual guest tracking
  adults_present INTEGER NOT NULL DEFAULT 0,
  children_present UUID[] DEFAULT '{}', -- Array of guest_children.id's
  
  -- Service tracking per day
  parking_spots_needed INTEGER DEFAULT 0,
  pets_present BOOLEAN DEFAULT FALSE,
  pet_count INTEGER DEFAULT 0,
  towel_rentals INTEGER DEFAULT 0,
  
  -- Calculated pricing (single source of truth)
  base_accommodation_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  child_discounts DECIMAL(10,2) DEFAULT 0,
  service_fees JSONB DEFAULT '{}', -- {parking: 0, pets: 0, towels: 0, tourism: 0}
  daily_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- VAT handling (already included in room rates per Croatian law)
  vat_included_in_rates DECIMAL(10,2) DEFAULT 0, -- For reporting only
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(reservation_id, stay_date)
);

-- 3. Create seasonal pricing periods table for better pricing management
CREATE TABLE IF NOT EXISTS seasonal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_code VARCHAR(1) NOT NULL UNIQUE, -- A, B, C, D
  name VARCHAR(100) NOT NULL,
  description TEXT,
  tourism_tax_rate DECIMAL(4,2) NOT NULL DEFAULT 1.10,
  date_ranges JSONB NOT NULL, -- Array of {start_date, end_date} objects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create room_seasonal_rates table linking rooms to seasonal pricing
CREATE TABLE IF NOT EXISTS room_seasonal_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  seasonal_period VARCHAR(1) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  vat_included BOOLEAN DEFAULT TRUE, -- Croatian law compliance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(room_id, seasonal_period)
);

-- 5. Performance indexes
CREATE INDEX idx_reservation_daily_details_reservation_id ON reservation_daily_details(reservation_id);
CREATE INDEX idx_reservation_daily_details_stay_date ON reservation_daily_details(stay_date);
CREATE INDEX idx_guest_children_reservation_id ON guest_children(reservation_id);
CREATE INDEX idx_guest_children_guest_id ON guest_children(guest_id);
CREATE INDEX idx_room_seasonal_rates_room_id ON room_seasonal_rates(room_id);
CREATE INDEX idx_room_seasonal_rates_period ON room_seasonal_rates(seasonal_period);

-- 6. Insert default seasonal periods for 2025 (Croatian tourism seasons)
INSERT INTO seasonal_periods (period_code, name, description, tourism_tax_rate, date_ranges) VALUES
('A', 'Winter/Early Spring', 'Low season - January to April, December', 1.10, 
 '[
   {"start_date": "2025-01-01", "end_date": "2025-04-30"},
   {"start_date": "2025-12-01", "end_date": "2025-12-31"}
 ]'::jsonb),
('B', 'Spring/Late Fall', 'Mid season - May, October, November', 1.10, 
 '[
   {"start_date": "2025-05-01", "end_date": "2025-05-31"},
   {"start_date": "2025-10-01", "end_date": "2025-11-30"}
 ]'::jsonb),
('C', 'Early Summer/Early Fall', 'High season - June, September', 1.50, 
 '[
   {"start_date": "2025-06-01", "end_date": "2025-06-30"},
   {"start_date": "2025-09-01", "end_date": "2025-09-30"}
 ]'::jsonb),
('D', 'Peak Summer', 'Peak season - July, August', 1.50, 
 '[
   {"start_date": "2025-07-01", "end_date": "2025-08-31"}
 ]'::jsonb)
ON CONFLICT (period_code) DO NOTHING;

-- 7. Migrate existing room rates to new seasonal rates table (if room_types table has seasonal rates)
INSERT INTO room_seasonal_rates (room_id, seasonal_period, rate, vat_included)
SELECT 
  r.id as room_id,
  'A' as seasonal_period,
  COALESCE(rt.base_rate, 100.00) as rate, -- Default rate if missing
  true as vat_included
FROM rooms r
LEFT JOIN room_types rt ON r.room_type_id = rt.id
WHERE NOT EXISTS (
  SELECT 1 FROM room_seasonal_rates rsr 
  WHERE rsr.room_id = r.id AND rsr.seasonal_period = 'A'
);

-- Repeat for other seasons (using base_rate as starting point, can be adjusted later)
INSERT INTO room_seasonal_rates (room_id, seasonal_period, rate, vat_included)
SELECT 
  r.id as room_id,
  period,
  COALESCE(rt.base_rate * multiplier, 100.00) as rate,
  true as vat_included
FROM rooms r
LEFT JOIN room_types rt ON r.room_type_id = rt.id
CROSS JOIN (
  VALUES 
    ('B', 1.2),  -- 20% higher than base
    ('C', 1.5),  -- 50% higher than base  
    ('D', 2.0)   -- 100% higher than base (peak season)
) AS seasons(period, multiplier)
WHERE NOT EXISTS (
  SELECT 1 FROM room_seasonal_rates rsr 
  WHERE rsr.room_id = r.id AND rsr.seasonal_period = seasons.period
);

-- 8. Add pricing calculation functions for Croatian VAT compliance
CREATE OR REPLACE FUNCTION calculate_vat_included_amount(base_amount DECIMAL, vat_rate DECIMAL DEFAULT 0.25)
RETURNS DECIMAL AS $$
BEGIN
  -- Croatian room rates already include VAT - this function extracts the VAT portion for reporting
  RETURN base_amount * (vat_rate / (1 + vat_rate));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_child_discount(child_age INTEGER, base_rate DECIMAL, is_apartment BOOLEAN DEFAULT FALSE)
RETURNS DECIMAL AS $$
BEGIN
  -- Room 401 (apartment) has fixed pricing, no per-person charges
  IF is_apartment THEN
    RETURN 0;
  END IF;
  
  -- Age-based discounts for regular rooms
  IF child_age <= 3 THEN
    RETURN base_rate; -- 100% discount (free)
  ELSIF child_age <= 7 THEN
    RETURN base_rate * 0.5; -- 50% discount
  ELSIF child_age <= 14 THEN
    RETURN base_rate * 0.3; -- 30% discount
  ELSE
    RETURN 0; -- Adult rate (no discount)
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Add updated_at trigger for reservation_daily_details
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reservation_daily_details_updated_at
    BEFORE UPDATE ON reservation_daily_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Add comments for documentation
COMMENT ON TABLE reservation_daily_details IS 'Individual guest and service tracking per day for detailed pricing and occupancy management';
COMMENT ON COLUMN reservation_daily_details.adults_present IS 'Number of adults actually present on this specific day';
COMMENT ON COLUMN reservation_daily_details.children_present IS 'Array of guest_children.id''s present on this specific day';
COMMENT ON COLUMN reservation_daily_details.vat_included_in_rates IS 'VAT amount already included in room rates (Croatian law compliance)';
COMMENT ON TABLE seasonal_periods IS 'Croatian tourism seasonal periods with tourism tax rates';
COMMENT ON TABLE room_seasonal_rates IS 'Room rates by seasonal period - single source of truth for pricing';

-- Migration complete
SELECT 'Individual guest day tracking schema created successfully' as result;