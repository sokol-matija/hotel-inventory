-- Phase 1: Create Normalized Schema Tables
-- This migration creates new normalized tables alongside existing ones
-- Zero downtime approach - existing tables remain untouched

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to check if tables exist
CREATE OR REPLACE FUNCTION check_tables_exist(table_names text[])
RETURNS TABLE(table_name text) AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name = ANY(table_names);
END;
$$ LANGUAGE plpgsql;

-- 1. Reservation-Guest Junction Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS reservation_guests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Ensure unique guest-reservation pairs
    CONSTRAINT unique_reservation_guest UNIQUE (reservation_id, guest_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_reservation_guests_reservation_id ON reservation_guests(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_guests_guest_id ON reservation_guests(guest_id);

-- 2. Individual Guest Stays (Independent Check-in/Check-out)
CREATE TABLE IF NOT EXISTS guest_stays (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    check_in timestamptz NOT NULL,
    check_out timestamptz NOT NULL,
    actual_check_in timestamptz,
    actual_check_out timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_stay_dates CHECK (check_out > check_in),
    CONSTRAINT valid_actual_dates CHECK (actual_check_out IS NULL OR actual_check_in IS NULL OR actual_check_out > actual_check_in),
    
    -- Ensure unique guest stays per reservation
    CONSTRAINT unique_guest_stay UNIQUE (reservation_id, guest_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_stays_reservation_id ON guest_stays(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_stays_guest_id ON guest_stays(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_stays_dates ON guest_stays(check_in, check_out);

-- 3. Daily Guest Services (Per Guest Per Day)
CREATE TABLE IF NOT EXISTS daily_guest_services (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_stay_id uuid NOT NULL REFERENCES guest_stays(id) ON DELETE CASCADE,
    service_date date NOT NULL,
    parking_spots integer DEFAULT 0,
    pet_fee boolean DEFAULT false,
    extra_towels integer DEFAULT 0,
    extra_bed boolean DEFAULT false,
    minibar_consumed jsonb DEFAULT '{}',
    tourism_tax_paid boolean DEFAULT false,
    tourism_tax_amount decimal(10,2) DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_parking_spots CHECK (parking_spots >= 0),
    CONSTRAINT valid_extra_towels CHECK (extra_towels >= 0),
    CONSTRAINT valid_tourism_tax CHECK (tourism_tax_amount >= 0),
    
    -- One service record per guest per day
    CONSTRAINT unique_guest_service_date UNIQUE (guest_stay_id, service_date)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_daily_guest_services_stay_id ON daily_guest_services(guest_stay_id);
CREATE INDEX IF NOT EXISTS idx_daily_guest_services_date ON daily_guest_services(service_date);

-- 4. Enhanced Guest Children Table (if not exists)
CREATE TABLE IF NOT EXISTS guest_children (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    birth_date date,
    age_at_stay integer,
    special_needs text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_age CHECK (age_at_stay IS NULL OR age_at_stay >= 0),
    CONSTRAINT valid_birth_date CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_guest_children_parent_id ON guest_children(parent_guest_id);

-- 5. Reservation Daily Details (if not exists) - Enhanced
DO $$
BEGIN
    -- Check if table exists and create/modify as needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_daily_details') THEN
        CREATE TABLE reservation_daily_details (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
            date date NOT NULL,
            total_guests integer NOT NULL DEFAULT 0,
            adults_count integer NOT NULL DEFAULT 0,
            children_count integer NOT NULL DEFAULT 0,
            total_parking_spots integer DEFAULT 0,
            total_pet_fees decimal(10,2) DEFAULT 0,
            total_tourism_tax decimal(10,2) DEFAULT 0,
            daily_rate decimal(10,2),
            daily_total decimal(10,2),
            occupancy_status text DEFAULT 'occupied',
            notes text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            
            -- Constraints
            CONSTRAINT valid_guest_counts CHECK (total_guests >= 0 AND adults_count >= 0 AND children_count >= 0),
            CONSTRAINT valid_occupancy_status CHECK (occupancy_status IN ('occupied', 'checkout', 'cleaning', 'maintenance')),
            
            -- One record per reservation per date
            CONSTRAINT unique_reservation_date UNIQUE (reservation_id, date)
        );
        
        -- Indexes
        CREATE INDEX idx_reservation_daily_details_reservation_id ON reservation_daily_details(reservation_id);
        CREATE INDEX idx_reservation_daily_details_date ON reservation_daily_details(date);
    END IF;
END $$;

-- 6. Update triggers for timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to new tables
DROP TRIGGER IF EXISTS update_reservation_guests_updated_at ON reservation_guests;
CREATE TRIGGER update_reservation_guests_updated_at
    BEFORE UPDATE ON reservation_guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_stays_updated_at ON guest_stays;
CREATE TRIGGER update_guest_stays_updated_at
    BEFORE UPDATE ON guest_stays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_guest_services_updated_at ON daily_guest_services;
CREATE TRIGGER update_daily_guest_services_updated_at
    BEFORE UPDATE ON daily_guest_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_children_updated_at ON guest_children;
CREATE TRIGGER update_guest_children_updated_at
    BEFORE UPDATE ON guest_children
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Row Level Security (RLS) Policies
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_guest_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_children ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (expand based on your authentication needs)
CREATE POLICY "Enable all operations for authenticated users" ON reservation_guests
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON guest_stays
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON daily_guest_services
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON guest_children
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Views for backward compatibility and easy querying
CREATE OR REPLACE VIEW reservation_with_all_guests AS
SELECT 
    r.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', g.id,
                'first_name', g.first_name,
                'last_name', g.last_name,
                'email', g.email,
                'phone', g.phone,
                'is_primary', g.id = r.primary_guest_id,
                'check_in', COALESCE(gs.check_in, r.check_in),
                'check_out', COALESCE(gs.check_out, r.check_out)
            )
        ) FILTER (WHERE g.id IS NOT NULL),
        '[]'::json
    ) AS all_guests
FROM reservations r
LEFT JOIN reservation_guests rg ON r.id = rg.reservation_id
LEFT JOIN guests g ON rg.guest_id = g.id
LEFT JOIN guest_stays gs ON r.id = gs.reservation_id AND g.id = gs.guest_id
GROUP BY r.id;

-- 9. Materialized view for performance (daily occupancy)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_occupancy_summary AS
SELECT 
    date,
    room_id,
    COUNT(*) as total_reservations,
    SUM(adults_count) as total_adults,
    SUM(children_count) as total_children,
    SUM(total_parking_spots) as total_parking,
    SUM(total_tourism_tax) as total_tourism_tax,
    SUM(daily_total) as total_revenue
FROM reservation_daily_details
GROUP BY date, room_id;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_occupancy_summary_date_room 
ON daily_occupancy_summary(date, room_id);

-- 10. Helper functions for migration
CREATE OR REPLACE FUNCTION migrate_reservation_guests()
RETURNS integer AS $$
DECLARE
    reservation_record RECORD;
    guest_ids text[];
    guest_id text;
    migrated_count integer := 0;
BEGIN
    -- Migrate existing reservations
    FOR reservation_record IN 
        SELECT id, primary_guest_id, notes, special_requests, adults, children
        FROM reservations 
        WHERE id NOT IN (SELECT DISTINCT reservation_id FROM reservation_guests)
    LOOP
        -- Add primary guest
        INSERT INTO reservation_guests (reservation_id, guest_id)
        VALUES (reservation_record.id, reservation_record.primary_guest_id)
        ON CONFLICT DO NOTHING;
        
        -- Parse additional guests from notes
        IF reservation_record.notes IS NOT NULL THEN
            guest_ids := string_to_array(
                substring(reservation_record.notes FROM 'additional_adults:([^|]+)'), 
                ','
            );
            
            FOREACH guest_id IN ARRAY guest_ids
            LOOP
                guest_id := trim(guest_id);
                IF guest_id != '' THEN
                    INSERT INTO reservation_guests (reservation_id, guest_id)
                    VALUES (reservation_record.id, guest_id::uuid)
                    ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Phase 1 Migration Complete: Normalized schema tables created';
    RAISE NOTICE '📊 New tables: reservation_guests, guest_stays, daily_guest_services, guest_children';
    RAISE NOTICE '🔄 Views created for backward compatibility';
    RAISE NOTICE '⚡ Ready for Phase 2: Data migration';
END $$;