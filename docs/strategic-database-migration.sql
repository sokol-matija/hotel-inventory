-- =============================================
-- HOTEL INVENTORY DATABASE STRATEGIC MIGRATION
-- Clean Slate Implementation for Hotel Management System
-- =============================================

-- =============================================
-- PHASE 1: CLEANUP & FOUNDATION
-- =============================================

-- First, let's check what exists and clean conflicting structures
-- Note: This preserves Supabase auth and any valid existing data

-- Drop conflicting tables if they exist (be careful here)
-- DROP TABLE IF EXISTS incompatible_rooms CASCADE;
-- DROP TABLE IF EXISTS inventory CASCADE;  -- Only if not hotel-related

-- =============================================
-- PHASE 2: CORE HOTEL FOUNDATION (TIER 1)
-- =============================================

-- 1. HOTELS TABLE (Central configuration)
CREATE TABLE IF NOT EXISTS hotels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    oib TEXT UNIQUE NOT NULL,  -- Croatian tax ID
    business_name TEXT,
    address JSONB NOT NULL,
    contact_info JSONB NOT NULL,
    default_currency TEXT DEFAULT 'EUR',
    timezone TEXT DEFAULT 'Europe/Zagreb',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROOM TYPES (8 types from Hotel Porec)
CREATE TABLE IF NOT EXISTS room_types (
    id TEXT PRIMARY KEY,
    hotel_id TEXT REFERENCES hotels(id) ON DELETE CASCADE,
    code TEXT NOT NULL,  -- BD, BS, D, T, S, F, A, RA
    name_croatian TEXT NOT NULL,
    name_english TEXT NOT NULL,
    max_occupancy INTEGER NOT NULL,
    default_occupancy INTEGER DEFAULT 2,
    amenities JSONB DEFAULT '[]',
    base_rate DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, code)
);

-- 3. ROOMS (Update existing or recreate properly)
-- First backup existing rooms data if needed
CREATE TABLE IF NOT EXISTS rooms_backup AS 
SELECT * FROM rooms WHERE EXISTS (SELECT 1 FROM rooms LIMIT 1);

-- Drop and recreate rooms table with proper schema
DROP TABLE IF EXISTS rooms CASCADE;
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    hotel_id TEXT REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id TEXT REFERENCES room_types(id) ON DELETE RESTRICT,
    room_group_id TEXT,  -- Will reference room_groups later
    number TEXT NOT NULL,  -- Room number (101, 102, etc.)
    floor INTEGER NOT NULL,
    building TEXT DEFAULT 'MAIN',
    is_active BOOLEAN DEFAULT true,
    is_cleaned BOOLEAN DEFAULT true,
    max_occupancy_override INTEGER,
    is_premium BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, number)
);

-- 4. GUESTS (Update schema, preserve data)
-- Check if guests table has required columns
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'first_name') THEN
        ALTER TABLE guests ADD COLUMN first_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'last_name') THEN
        ALTER TABLE guests ADD COLUMN last_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'email') THEN
        ALTER TABLE guests ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'phone') THEN
        ALTER TABLE guests ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'nationality') THEN
        ALTER TABLE guests ADD COLUMN nationality TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'preferred_language') THEN
        ALTER TABLE guests ADD COLUMN preferred_language TEXT DEFAULT 'en';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'has_pets') THEN
        ALTER TABLE guests ADD COLUMN has_pets BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'date_of_birth') THEN
        ALTER TABLE guests ADD COLUMN date_of_birth DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'is_vip') THEN
        ALTER TABLE guests ADD COLUMN is_vip BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'total_stays') THEN
        ALTER TABLE guests ADD COLUMN total_stays INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'emergency_contact_name') THEN
        ALTER TABLE guests ADD COLUMN emergency_contact_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'emergency_contact_phone') THEN
        ALTER TABLE guests ADD COLUMN emergency_contact_phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'created_at') THEN
        ALTER TABLE guests ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'updated_at') THEN
        ALTER TABLE guests ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 5. RESERVATIONS (Update schema, preserve data)
-- Backup existing reservations
CREATE TABLE IF NOT EXISTS reservations_backup AS 
SELECT * FROM reservations WHERE EXISTS (SELECT 1 FROM reservations LIMIT 1);

-- Update reservations table schema
DO $$ 
BEGIN
    -- Add missing columns for reservations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'hotel_id') THEN
        ALTER TABLE reservations ADD COLUMN hotel_id TEXT REFERENCES hotels(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'room_id') THEN
        ALTER TABLE reservations ADD COLUMN room_id TEXT REFERENCES rooms(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'primary_guest_id') THEN
        ALTER TABLE reservations ADD COLUMN primary_guest_id TEXT REFERENCES guests(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'confirmation_number') THEN
        ALTER TABLE reservations ADD COLUMN confirmation_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'check_in') THEN
        ALTER TABLE reservations ADD COLUMN check_in DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'check_out') THEN
        ALTER TABLE reservations ADD COLUMN check_out DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'adults') THEN
        ALTER TABLE reservations ADD COLUMN adults INTEGER DEFAULT 2;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'children') THEN
        ALTER TABLE reservations ADD COLUMN children INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'total_guests') THEN
        ALTER TABLE reservations ADD COLUMN total_guests INTEGER DEFAULT 2;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'status') THEN
        ALTER TABLE reservations ADD COLUMN status TEXT DEFAULT 'confirmed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'booking_source') THEN
        ALTER TABLE reservations ADD COLUMN booking_source TEXT DEFAULT 'direct';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'special_requests') THEN
        ALTER TABLE reservations ADD COLUMN special_requests TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'seasonal_period') THEN
        ALTER TABLE reservations ADD COLUMN seasonal_period TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'base_room_rate') THEN
        ALTER TABLE reservations ADD COLUMN base_room_rate DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'number_of_nights') THEN
        ALTER TABLE reservations ADD COLUMN number_of_nights INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'subtotal_accommodation') THEN
        ALTER TABLE reservations ADD COLUMN subtotal_accommodation DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'children_discount') THEN
        ALTER TABLE reservations ADD COLUMN children_discount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'tourism_tax') THEN
        ALTER TABLE reservations ADD COLUMN tourism_tax DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'vat_accommodation') THEN
        ALTER TABLE reservations ADD COLUMN vat_accommodation DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'pet_fee_subtotal') THEN
        ALTER TABLE reservations ADD COLUMN pet_fee_subtotal DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'parking_fee_subtotal') THEN
        ALTER TABLE reservations ADD COLUMN parking_fee_subtotal DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'short_stay_supplement') THEN
        ALTER TABLE reservations ADD COLUMN short_stay_supplement DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'additional_services_subtotal') THEN
        ALTER TABLE reservations ADD COLUMN additional_services_subtotal DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'total_amount') THEN
        ALTER TABLE reservations ADD COLUMN total_amount DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'total_vat_amount') THEN
        ALTER TABLE reservations ADD COLUMN total_vat_amount DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'payment_status') THEN
        ALTER TABLE reservations ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'has_pets') THEN
        ALTER TABLE reservations ADD COLUMN has_pets BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'booking_date') THEN
        ALTER TABLE reservations ADD COLUMN booking_date TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'created_at') THEN
        ALTER TABLE reservations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'updated_at') THEN
        ALTER TABLE reservations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- =============================================
-- PHASE 3: PRICING & BUSINESS LOGIC (TIER 2)
-- =============================================

-- 6. PRICE LISTS (Seasonal pricing structure)
CREATE TABLE IF NOT EXISTS price_lists (
    id TEXT PRIMARY KEY,
    hotel_id TEXT REFERENCES hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    currency TEXT DEFAULT 'EUR',
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, year)
);

-- 7. SEASONAL PERIOD DEFINITIONS (A/B/C/D periods)
CREATE TABLE IF NOT EXISTS seasonal_period_definitions (
    id TEXT PRIMARY KEY,
    price_list_id TEXT REFERENCES price_lists(id) ON DELETE CASCADE,
    period_code TEXT NOT NULL,  -- A, B, C, D
    period_name TEXT NOT NULL,
    date_ranges JSONB NOT NULL,  -- Array of {from, to} date ranges
    color_hex TEXT DEFAULT '#3498db',
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(price_list_id, period_code)
);

-- 8. ROOM TYPE PRICING (Fixed rates per season)
CREATE TABLE IF NOT EXISTS room_type_pricing (
    id TEXT PRIMARY KEY,
    price_list_id TEXT REFERENCES price_lists(id) ON DELETE CASCADE,
    room_type_id TEXT REFERENCES room_types(id) ON DELETE CASCADE,
    price_period_a DECIMAL(10,2) NOT NULL,
    price_period_b DECIMAL(10,2) NOT NULL,
    price_period_c DECIMAL(10,2) NOT NULL,
    price_period_d DECIMAL(10,2) NOT NULL,
    minimum_stay_nights INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(price_list_id, room_type_id)
);

-- 9. FEE CONFIGURATIONS (Tourism tax, pet fees, etc.)
CREATE TABLE IF NOT EXISTS fee_configurations (
    id TEXT PRIMARY KEY,
    price_list_id TEXT REFERENCES price_lists(id) ON DELETE CASCADE,
    fee_type TEXT NOT NULL,  -- tourism_tax, pet_fee, parking_fee, etc.
    fee_name TEXT NOT NULL,
    calculation_method TEXT NOT NULL,  -- fixed_amount, per_person_per_night, etc.
    fixed_amount DECIMAL(10,2),
    monthly_rates JSONB,  -- For tourism tax monthly variations
    children_rules JSONB,  -- For children discount rules
    conditions JSONB,  -- For conditional fees
    applies_to_guest_types JSONB DEFAULT '["adults"]',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(price_list_id, fee_type)
);

-- 10. FISCAL CONFIGURATION (Croatian tax authority)
CREATE TABLE IF NOT EXISTS fiscal_configuration (
    id TEXT PRIMARY KEY,
    hotel_id TEXT REFERENCES hotels(id) ON DELETE CASCADE,
    environment TEXT DEFAULT 'demo',  -- demo, production
    vat_rate DECIMAL(5,4) DEFAULT 0.2500,  -- 25% Croatian VAT
    tourism_tax_rate DECIMAL(5,2) DEFAULT 1.35,  -- Average rate
    invoice_prefix TEXT DEFAULT 'HP',
    current_invoice_number INTEGER DEFAULT 1,
    invoice_format TEXT DEFAULT 'YYYY-NNN-NNNN',
    fiscal_year_start DATE DEFAULT '2026-01-01',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id)
);

-- =============================================
-- PHASE 4: CORPORATE FEATURES (TIER 3)
-- =============================================

-- 11. COMPANIES (Keep existing, just ensure schema)
-- Companies table should already exist, just ensure it has required columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'name') THEN
        ALTER TABLE companies ADD COLUMN name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'oib') THEN
        ALTER TABLE companies ADD COLUMN oib TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'address') THEN
        ALTER TABLE companies ADD COLUMN address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'city') THEN
        ALTER TABLE companies ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'postal_code') THEN
        ALTER TABLE companies ADD COLUMN postal_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'country') THEN
        ALTER TABLE companies ADD COLUMN country TEXT DEFAULT 'Croatia';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'contact_person') THEN
        ALTER TABLE companies ADD COLUMN contact_person TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'email') THEN
        ALTER TABLE companies ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'phone') THEN
        ALTER TABLE companies ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'fax') THEN
        ALTER TABLE companies ADD COLUMN fax TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'is_active') THEN
        ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'notes') THEN
        ALTER TABLE companies ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'created_at') THEN
        ALTER TABLE companies ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'updated_at') THEN
        ALTER TABLE companies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 12. PRICING TIERS (Keep existing, ensure schema)
-- Pricing tiers should already exist, ensure required columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'name') THEN
        ALTER TABLE pricing_tiers ADD COLUMN name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'description') THEN
        ALTER TABLE pricing_tiers ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'seasonal_rate_a') THEN
        ALTER TABLE pricing_tiers ADD COLUMN seasonal_rate_a DECIMAL(5,4) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'seasonal_rate_b') THEN
        ALTER TABLE pricing_tiers ADD COLUMN seasonal_rate_b DECIMAL(5,4) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'seasonal_rate_c') THEN
        ALTER TABLE pricing_tiers ADD COLUMN seasonal_rate_c DECIMAL(5,4) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'seasonal_rate_d') THEN
        ALTER TABLE pricing_tiers ADD COLUMN seasonal_rate_d DECIMAL(5,4) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'is_percentage_discount') THEN
        ALTER TABLE pricing_tiers ADD COLUMN is_percentage_discount BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'minimum_stay') THEN
        ALTER TABLE pricing_tiers ADD COLUMN minimum_stay INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'valid_from') THEN
        ALTER TABLE pricing_tiers ADD COLUMN valid_from DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'valid_to') THEN
        ALTER TABLE pricing_tiers ADD COLUMN valid_to DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'is_active') THEN
        ALTER TABLE pricing_tiers ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'is_default') THEN
        ALTER TABLE pricing_tiers ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'created_at') THEN
        ALTER TABLE pricing_tiers ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pricing_tiers' AND column_name = 'updated_at') THEN
        ALTER TABLE pricing_tiers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 13. INVOICES (Financial management)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
    guest_id TEXT REFERENCES guests(id) ON DELETE RESTRICT,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    service_date DATE,
    paid_date DATE,
    status TEXT DEFAULT 'draft',  -- draft, sent, paid, overdue, cancelled
    currency TEXT DEFAULT 'EUR',
    items JSONB DEFAULT '[]',
    subtotal DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,4) DEFAULT 0.2500,
    vat_amount DECIMAL(10,2) NOT NULL,
    tourism_tax DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    remaining_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    fiscal_data JSONB,  -- Croatian fiscal compliance data
    issued_by TEXT,
    pdf_path TEXT,
    is_email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. PAYMENTS (Payment tracking)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
    reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    method TEXT NOT NULL,  -- cash, card, bank_transfer, online, booking-com, other
    status TEXT DEFAULT 'pending',  -- pending, partial, paid, refunded, cancelled
    transaction_id TEXT,
    reference_number TEXT,
    received_date TIMESTAMPTZ NOT NULL,
    processed_date TIMESTAMPTZ,
    card_last_four TEXT,
    bank_reference TEXT,
    processing_fee DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    exchange_rate DECIMAL(10,6),
    original_amount DECIMAL(10,2),
    original_currency TEXT,
    gateway_response JSONB,
    is_refund BOOLEAN DEFAULT false,
    parent_payment_id TEXT REFERENCES payments(id),
    processed_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. FISCAL RECORDS (Croatian fiscal compliance)
CREATE TABLE IF NOT EXISTS fiscal_records (
    id TEXT PRIMARY KEY,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
    jir TEXT NOT NULL,  -- Jedinstveni identifikator računa
    zki TEXT NOT NULL,  -- Zaštitni kod izdavatelja
    broj_racuna TEXT NOT NULL,  -- Invoice number
    oznaka_sljednosti_racuna TEXT NOT NULL,  -- Sequential receipt mark
    naknadna_dostava_poruke BOOLEAN DEFAULT false,
    paragon_broj TEXT,
    specifični_namjet_racuna TEXT NOT NULL,
    date_time_submitted TIMESTAMPTZ NOT NULL,
    date_time_received TIMESTAMPTZ,
    ukupan_iznos DECIMAL(10,2) NOT NULL,
    naknada_za_zastitu_okolisa DECIMAL(10,2),
    ukupan_iznos_poreza_po_stopama DECIMAL(10,2) NOT NULL,
    ukupan_iznos_oslobodjenja_porstopa DECIMAL(10,2) NOT NULL,
    ukupan_iznos_neporezivo DECIMAL(10,2) NOT NULL,
    ukupan_iznos_poreza DECIMAL(10,2) NOT NULL,
    ukupan_iznos_naplata DECIMAL(10,2) NOT NULL,
    nacin_placanja TEXT NOT NULL,
    oib_oper TEXT NOT NULL,
    nap TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    xml_request TEXT,
    xml_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PHASE 5: ORGANIZATION (TIER 4)
-- =============================================

-- 16. ROOM GROUPS (Visual organization)
CREATE TABLE IF NOT EXISTS room_groups (
    id TEXT PRIMARY KEY,
    hotel_id TEXT REFERENCES hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    color_hex TEXT DEFAULT '#3498db',
    background_color TEXT DEFAULT '#ecf0f1',
    text_color TEXT DEFAULT '#2c3e50',
    description TEXT,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, code)
);

-- Add foreign key constraint to rooms table
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_room_group 
    FOREIGN KEY (room_group_id) REFERENCES room_groups(id) ON DELETE SET NULL;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Core hotel indexes
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_floor ON rooms(hotel_id, floor);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_number ON rooms(hotel_id, number);

-- Reservation indexes
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON reservations(primary_guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Guest indexes
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_invoices_guest ON invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
DROP TRIGGER IF EXISTS update_hotels_updated_at ON hotels;
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_types_updated_at ON room_types;
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_tiers_updated_at ON pricing_tiers;
CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ HOTEL DATABASE SCHEMA MIGRATION COMPLETED';
    RAISE NOTICE '📊 Next Step: Run strategic-test-data-insertion.sql';
    RAISE NOTICE '🏨 Ready for Hotel Porec configuration';
END $$;