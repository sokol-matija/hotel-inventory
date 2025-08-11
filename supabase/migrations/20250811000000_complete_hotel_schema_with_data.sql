-- Hotel Management System - Complete Database Schema with Hotel Porec Data
-- Updated August 2025 with Croatian fiscalization, VAT handling, and Room 401 logic

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. CORE CONFIGURATION TABLES
-- =============================================

-- Hotels table
CREATE TABLE hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    oib VARCHAR(11) NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    address JSONB NOT NULL,
    contact_info JSONB NOT NULL,
    default_currency VARCHAR(3) DEFAULT 'EUR',
    timezone VARCHAR(50) DEFAULT 'Europe/Zagreb',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_oib CHECK (oib ~ '^[0-9]{11}$')
);

-- Room types table
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    code VARCHAR(20) NOT NULL,
    name_croatian TEXT NOT NULL,
    name_english TEXT NOT NULL,
    name_german TEXT,
    name_italian TEXT,
    max_occupancy INTEGER NOT NULL DEFAULT 2,
    default_occupancy INTEGER NOT NULL DEFAULT 2,
    amenities TEXT[] DEFAULT '{}',
    base_rate DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(hotel_id, code)
);

-- Price lists for seasonal configuration
CREATE TABLE price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(hotel_id, year, name)
);

-- Seasonal period definitions
CREATE TABLE seasonal_period_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    period_code VARCHAR(1) NOT NULL,
    period_name TEXT NOT NULL,
    date_ranges JSONB NOT NULL,
    color_hex VARCHAR(7) DEFAULT '#3498db',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(price_list_id, period_code)
);

-- Room type pricing (fixed prices per period)
CREATE TABLE room_type_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES room_types(id),
    price_period_a DECIMAL(10,2) NOT NULL,
    price_period_b DECIMAL(10,2) NOT NULL,
    price_period_c DECIMAL(10,2) NOT NULL,
    price_period_d DECIMAL(10,2) NOT NULL,
    minimum_stay_nights INTEGER DEFAULT 1,
    maximum_stay_nights INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(price_list_id, room_type_id)
);

-- Pricing tiers for agency rates and special pricing
CREATE TABLE pricing_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Rate modifiers (percentage adjustments to base rates)
    seasonal_rate_modifiers JSONB NOT NULL DEFAULT '{"A": 0, "B": 0, "C": 0, "D": 0}',
    
    -- Fee adjustments
    fee_modifiers JSONB NOT NULL DEFAULT '{"tourismTax": 0, "pets": 0, "parking": 0, "shortStay": 0, "additional": 0}',
    
    -- Applicability
    room_types TEXT[] DEFAULT '{}',
    minimum_stay INTEGER,
    maximum_stay INTEGER,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(hotel_id, name),
    CONSTRAINT valid_rate_modifiers CHECK (
        jsonb_typeof(seasonal_rate_modifiers) = 'object' AND
        seasonal_rate_modifiers ? 'A' AND seasonal_rate_modifiers ? 'B' AND
        seasonal_rate_modifiers ? 'C' AND seasonal_rate_modifiers ? 'D'
    )
);

-- Fee configurations (Croatian requirements)
CREATE TABLE fee_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    fee_type VARCHAR(30) NOT NULL,
    fee_name TEXT NOT NULL,
    calculation_method VARCHAR(20) NOT NULL,
    fixed_amount DECIMAL(10,2),
    percentage_rate DECIMAL(5,2),
    monthly_rates JSONB,
    children_rules JSONB,
    conditions JSONB,
    applies_to_room_types UUID[],
    applies_to_guest_types TEXT[] DEFAULT '{"all"}',
    vat_rate DECIMAL(5,4) DEFAULT 0.25,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    CONSTRAINT valid_calculation_method CHECK (
        calculation_method IN ('fixed_amount', 'percentage', 'per_person_per_night', 'conditional')
    )
);

-- Room groups for visual organization
CREATE TABLE room_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    name TEXT NOT NULL,
    code VARCHAR(10) NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#3498db',
    background_color VARCHAR(7) DEFAULT '#ecf0f1',
    text_color VARCHAR(7) DEFAULT '#2c3e50',
    description TEXT,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(hotel_id, code)
);

-- Rooms table with enhanced status tracking
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_type_id UUID NOT NULL REFERENCES room_types(id),
    room_group_id UUID REFERENCES room_groups(id),
    number VARCHAR(10) NOT NULL,
    floor INTEGER NOT NULL,
    building VARCHAR(10) DEFAULT 'MAIN',
    is_active BOOLEAN DEFAULT true,
    is_out_of_order BOOLEAN DEFAULT false,
    is_cleaned BOOLEAN DEFAULT true,
    maintenance_notes TEXT,
    max_occupancy_override INTEGER,
    is_premium BOOLEAN DEFAULT false,
    amenities_additional TEXT[] DEFAULT '{}',
    -- Room 401 special constraints
    minimum_stay_override INTEGER, -- For Room 401: 4 nights
    cleaning_buffer_days INTEGER DEFAULT 0, -- For Room 401: 1 day
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(hotel_id, number)
);

-- =============================================
-- 2. GUEST & COMPANY MANAGEMENT
-- =============================================

-- Guests table
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    nationality VARCHAR(3),
    passport_number TEXT,
    id_card_number TEXT,
    preferred_language VARCHAR(5) DEFAULT 'en',
    dietary_restrictions TEXT[] DEFAULT '{}',
    special_needs TEXT,
    has_pets BOOLEAN DEFAULT false,
    is_vip BOOLEAN DEFAULT false,
    vip_level INTEGER DEFAULT 0,
    marketing_consent BOOLEAN DEFAULT false,
    communication_preferences JSONB DEFAULT '{"email": true, "sms": false, "phone": false}',
    total_stays INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_rating DECIMAL(3,2),
    last_stay_date DATE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_vip_level CHECK (vip_level >= 0 AND vip_level <= 5),
    CONSTRAINT valid_rating CHECK (average_rating IS NULL OR (average_rating >= 1 AND average_rating <= 5))
);

-- Guest children table
CREATE TABLE guest_children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    current_age INTEGER,
    discount_category VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    legal_name TEXT,
    oib VARCHAR(11) UNIQUE,
    tax_number TEXT,
    registration_number TEXT,
    address JSONB NOT NULL,
    primary_contact_person TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    fax TEXT,
    website TEXT,
    company_type VARCHAR(20) DEFAULT 'corporate',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    payment_terms_days INTEGER DEFAULT 30,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    guaranteed_rooms INTEGER DEFAULT 0,
    preferred_room_types UUID[],
    is_active BOOLEAN DEFAULT true,
    credit_rating VARCHAR(10) DEFAULT 'GOOD',
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    last_booking_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_oib CHECK (oib IS NULL OR oib ~ '^[0-9]{11}$'),
    CONSTRAINT valid_credit_limit CHECK (credit_limit >= 0),
    CONSTRAINT valid_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- =============================================
-- 3. RESERVATION SYSTEM
-- =============================================

-- Reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    primary_guest_id UUID NOT NULL REFERENCES guests(id),
    company_id UUID REFERENCES companies(id),
    price_list_id UUID REFERENCES price_lists(id),
    pricing_tier_id UUID REFERENCES pricing_tiers(id),
    confirmation_number VARCHAR(20) NOT NULL UNIQUE,
    booking_reference VARCHAR(50),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    number_of_nights INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER DEFAULT 0,
    total_guests INTEGER GENERATED ALWAYS AS (adults + children) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    booking_source VARCHAR(50) DEFAULT 'direct',
    special_requests TEXT,
    accessibility_needs TEXT[] DEFAULT '{}',
    has_pets BOOLEAN DEFAULT false,
    pet_count INTEGER DEFAULT 0,
    parking_required BOOLEAN DEFAULT false,
    seasonal_period VARCHAR(1) NOT NULL,
    
    -- Pricing breakdown with Croatian VAT complexity
    base_room_rate DECIMAL(10,2) NOT NULL,
    subtotal_accommodation DECIMAL(12,2) NOT NULL, -- Before VAT
    vat_accommodation DECIMAL(10,2) NOT NULL, -- 13% VAT (included in prices)
    children_discount DECIMAL(10,2) DEFAULT 0,
    company_discount DECIMAL(10,2) DEFAULT 0,
    promotional_discount DECIMAL(10,2) DEFAULT 0,
    short_stay_supplement DECIMAL(10,2) DEFAULT 0,
    
    -- Additional services with 25% VAT
    tourism_tax DECIMAL(10,2) DEFAULT 0, -- No VAT
    pet_fee_subtotal DECIMAL(10,2) DEFAULT 0,
    pet_fee_vat DECIMAL(10,2) DEFAULT 0, -- 25% VAT
    parking_fee_subtotal DECIMAL(10,2) DEFAULT 0,
    parking_fee_vat DECIMAL(10,2) DEFAULT 0, -- 25% VAT
    additional_services_subtotal DECIMAL(10,2) DEFAULT 0,
    additional_services_vat DECIMAL(10,2) DEFAULT 0, -- 25% VAT
    
    total_vat_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_due DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    
    booking_date TIMESTAMPTZ DEFAULT now(),
    cancellation_date TIMESTAMPTZ,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    booked_by UUID,
    checked_in_by UUID,
    checked_out_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_dates CHECK (check_out > check_in),
    CONSTRAINT valid_guests CHECK (adults >= 1 AND children >= 0),
    CONSTRAINT valid_status CHECK (status IN ('inquiry', 'confirmed', 'checked-in', 'checked-out', 'no-show', 'cancelled')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
    CONSTRAINT valid_seasonal_period CHECK (seasonal_period IN ('A', 'B', 'C', 'D')),
    CONSTRAINT valid_amounts CHECK (total_amount >= 0 AND paid_amount >= 0)
);

-- Reservation guests junction table
CREATE TABLE reservation_guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id),
    role VARCHAR(20) DEFAULT 'guest',
    is_primary BOOLEAN DEFAULT false,
    age_at_booking INTEGER,
    discount_applied DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(reservation_id, guest_id)
);

-- =============================================
-- 4. FINANCIAL SYSTEM
-- =============================================

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    invoice_number VARCHAR(30) NOT NULL,
    fiscal_number VARCHAR(30),
    bill_to_guest_id UUID REFERENCES guests(id),
    bill_to_company_id UUID REFERENCES companies(id),
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    service_date_from DATE NOT NULL,
    service_date_to DATE NOT NULL,
    
    -- Croatian VAT breakdown
    subtotal_accommodation DECIMAL(12,2) NOT NULL, -- Accommodation before VAT
    vat_accommodation DECIMAL(12,2) NOT NULL, -- 13% VAT (included)
    subtotal_services DECIMAL(12,2) NOT NULL, -- Services before VAT 
    vat_services DECIMAL(12,2) NOT NULL, -- 25% VAT on services
    tourism_tax DECIMAL(12,2) DEFAULT 0, -- No VAT
    total_discounts DECIMAL(12,2) DEFAULT 0,
    total_vat_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_due DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    sent_date TIMESTAMPTZ,
    paid_date TIMESTAMPTZ,
    is_fiscal BOOLEAN DEFAULT true,
    fiscal_data JSONB,
    pdf_path TEXT,
    delivery_method VARCHAR(20) DEFAULT 'email',
    delivery_address TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_dates CHECK (due_date >= issue_date),
    CONSTRAINT valid_service_dates CHECK (service_date_to >= service_date_from),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
    CONSTRAINT valid_amounts CHECK (total_amount >= 0 AND paid_amount >= 0),
    CONSTRAINT billing_target CHECK (bill_to_guest_id IS NOT NULL OR bill_to_company_id IS NOT NULL),
    UNIQUE(hotel_id, invoice_number)
);

-- Invoice line items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    item_type VARCHAR(30) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    line_subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    vat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.25,
    vat_amount DECIMAL(10,2) GENERATED ALWAYS AS (line_subtotal * vat_rate) STORED,
    line_total DECIMAL(12,2) GENERATED ALWAYS AS (line_subtotal + vat_amount) STORED,
    service_date_from DATE,
    service_date_to DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(invoice_id, line_number),
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_price CHECK (unit_price >= 0)
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    invoice_id UUID REFERENCES invoices(id),
    reservation_id UUID REFERENCES reservations(id),
    payment_reference VARCHAR(50),
    external_transaction_id TEXT,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    amount_in_base_currency DECIMAL(12,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
    payment_method VARCHAR(30) NOT NULL,
    payment_processor VARCHAR(50),
    card_last_four VARCHAR(4),
    card_type VARCHAR(20),
    authorization_code TEXT,
    bank_reference TEXT,
    merchant_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - merchant_fee) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    received_date TIMESTAMPTZ DEFAULT now(),
    processed_date TIMESTAMPTZ,
    settled_date TIMESTAMPTZ,
    processed_by UUID,
    payment_location VARCHAR(50) DEFAULT 'front_desk',
    is_refund BOOLEAN DEFAULT false,
    original_payment_id UUID REFERENCES payments(id),
    refund_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
    CONSTRAINT valid_method CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'crypto', 'check', 'gift_card')),
    CONSTRAINT valid_card_digits CHECK (card_last_four IS NULL OR card_last_four ~ '^[0-9]{4}$'),
    CONSTRAINT refund_logic CHECK ((is_refund = false) OR (is_refund = true AND original_payment_id IS NOT NULL))
);

-- =============================================
-- 5. FISCAL COMPLIANCE
-- =============================================

-- Fiscal configuration
CREATE TABLE fiscal_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    environment VARCHAR(20) NOT NULL DEFAULT 'demo',
    vat_rate_accommodation DECIMAL(5,4) NOT NULL DEFAULT 0.1300, -- 13% included
    vat_rate_services DECIMAL(5,4) NOT NULL DEFAULT 0.2500, -- 25% on services
    vat_rate_tourism_tax DECIMAL(5,4) NOT NULL DEFAULT 0.0000, -- No VAT
    tourism_tax_rate_low DECIMAL(5,2) NOT NULL DEFAULT 1.10,
    tourism_tax_rate_high DECIMAL(5,2) NOT NULL DEFAULT 1.60,
    invoice_prefix VARCHAR(10) DEFAULT 'HP',
    current_invoice_number INTEGER DEFAULT 1,
    invoice_format VARCHAR(50) DEFAULT 'YYYY-NNN-NNNN',
    fiscal_year_start DATE DEFAULT '2026-01-01',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(hotel_id)
);

-- Fiscal submissions
CREATE TABLE fiscal_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    jir VARCHAR(36) UNIQUE,
    zki VARCHAR(32) NOT NULL,
    submission_timestamp TIMESTAMPTZ DEFAULT now(),
    submission_xml TEXT NOT NULL,
    response_status VARCHAR(20) DEFAULT 'pending',
    response_timestamp TIMESTAMPTZ,
    response_xml TEXT,
    response_message TEXT,
    error_code VARCHAR(10),
    qr_code_data TEXT,
    fiscal_receipt_url TEXT,
    processing_attempts INTEGER DEFAULT 1,
    last_retry_at TIMESTAMPTZ,
    operator_oib VARCHAR(11),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_jir CHECK (jir IS NULL OR jir ~ '^[0-9a-f-]{36}$'),
    CONSTRAINT valid_zki CHECK (zki ~ '^[0-9a-f]{32}$'),
    CONSTRAINT valid_response_status CHECK (response_status IN ('pending', 'success', 'error', 'timeout', 'retry')),
    CONSTRAINT valid_operator_oib CHECK (operator_oib IS NULL OR operator_oib ~ '^[0-9]{11}$')
);

-- =============================================
-- 6. AUDIT SYSTEM
-- =============================================

-- Audit events
CREATE TABLE audit_events (
    id BIGSERIAL PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    description TEXT,
    severity VARCHAR(20) DEFAULT 'info',
    tags TEXT[] DEFAULT '{}',
    event_timestamp TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- =============================================
-- 7. ROW LEVEL SECURITY (RLS) - ALLOW ALL FOR NOW
-- =============================================

-- Enable RLS on all tables
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_period_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_type_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Create allow-all policies (temporary for development)
CREATE POLICY "Allow all operations on hotels" ON hotels FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on room_types" ON room_types FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on price_lists" ON price_lists FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on seasonal_period_definitions" ON seasonal_period_definitions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on room_type_pricing" ON room_type_pricing FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on pricing_tiers" ON pricing_tiers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on fee_configurations" ON fee_configurations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on room_groups" ON room_groups FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on rooms" ON rooms FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on guests" ON guests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on guest_children" ON guest_children FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on companies" ON companies FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on reservations" ON reservations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on reservation_guests" ON reservation_guests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoice_line_items" ON invoice_line_items FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on fiscal_configuration" ON fiscal_configuration FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on fiscal_submissions" ON fiscal_submissions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on audit_events" ON audit_events FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- =============================================
-- 8. PERFORMANCE INDEXES
-- =============================================

-- High-performance indexes for common queries
CREATE INDEX idx_rooms_hotel_floor ON rooms(hotel_id, floor);
CREATE INDEX idx_rooms_type_active ON rooms(room_type_id, is_active);
CREATE INDEX idx_guests_email ON guests(email) WHERE email IS NOT NULL;
CREATE INDEX idx_guests_vip ON guests(is_vip, vip_level) WHERE is_vip = true;
CREATE INDEX idx_guests_name ON guests(last_name, first_name);
CREATE INDEX idx_companies_oib ON companies(oib) WHERE oib IS NOT NULL;
CREATE INDEX idx_companies_active ON companies(is_active) WHERE is_active = true;
CREATE INDEX idx_reservations_hotel_dates ON reservations(hotel_id, check_in, check_out);
CREATE INDEX idx_reservations_room_dates ON reservations(room_id, check_in, check_out);
CREATE INDEX idx_reservations_guest ON reservations(primary_guest_id);
CREATE INDEX idx_reservations_status ON reservations(status) WHERE status IN ('confirmed', 'checked-in');
CREATE INDEX idx_reservations_confirmation ON reservations(confirmation_number);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_payments_status ON payments(status) WHERE status IN ('pending', 'completed');
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_processed_date ON payments(processed_date);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_events(user_id, event_timestamp);
CREATE INDEX idx_audit_type ON audit_events(event_type, event_timestamp);

-- =============================================
-- 9. TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to calculate child age and discount category
CREATE OR REPLACE FUNCTION calculate_child_age()
RETURNS TRIGGER AS $$
BEGIN
    NEW.current_age := EXTRACT(YEAR FROM AGE(NEW.date_of_birth));
    NEW.discount_category := CASE
        WHEN NEW.current_age < 3 THEN '0-3'
        WHEN NEW.current_age < 7 THEN '3-7'
        WHEN NEW.current_age < 14 THEN '7-14'
        ELSE 'adult'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for child age calculation
CREATE TRIGGER trigger_calculate_child_age
    BEFORE INSERT OR UPDATE ON guest_children
    FOR EACH ROW EXECUTE FUNCTION calculate_child_age();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trigger_hotels_updated_at BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_room_types_updated_at BEFORE UPDATE ON room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_price_lists_updated_at BEFORE UPDATE ON price_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_room_groups_updated_at BEFORE UPDATE ON room_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_guest_children_updated_at BEFORE UPDATE ON guest_children FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_fiscal_configuration_updated_at BEFORE UPDATE ON fiscal_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Room 401 booking validation function
CREATE OR REPLACE FUNCTION validate_room_401_booking()
RETURNS TRIGGER AS $$
DECLARE
    room_number VARCHAR(10);
    nights INTEGER;
BEGIN
    -- Get room number
    SELECT r.number INTO room_number 
    FROM rooms r 
    WHERE r.id = NEW.room_id;
    
    -- Only apply validation to Room 401
    IF room_number = '401' THEN
        nights := NEW.check_out - NEW.check_in;
        
        -- Check minimum stay requirement (4 nights)
        IF nights < 4 THEN
            RAISE EXCEPTION 'Room 401 requires minimum 4 night stay. Attempted booking: % nights', nights;
        END IF;
        
        -- Check for conflicting reservations within cleaning buffer
        IF EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.room_id = NEW.room_id 
            AND r.id != COALESCE(NEW.id, uuid_nil())
            AND r.status NOT IN ('cancelled', 'no-show')
            AND (
                -- Overlapping dates
                (r.check_in < NEW.check_out AND r.check_out > NEW.check_in)
                -- Or within 1-day cleaning buffer
                OR (r.check_out = NEW.check_in OR r.check_in = NEW.check_out)
            )
        ) THEN
            RAISE EXCEPTION 'Room 401 booking conflicts with existing reservation or cleaning requirements';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Room 401 validation
CREATE TRIGGER trigger_validate_room_401_booking
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION validate_room_401_booking();

-- =============================================
-- 10. HOTEL POREC DATA INSERTION
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

-- Create Room Types (matching localStorage structure)
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

-- 401 Rooftop Apartment (Premium) - Using localStorage value of €450 for Period D
('rt-rooftop-apartment', 'hotel-porec-main', 'rooftop-apartment', '401 ROOFTOP APARTMAN', '401 Rooftop Apartment', 4, 4,
 '{"Private Bathroom", "Air Conditioning", "TV", "WiFi", "Kitchenette", "Balcony", "Sea View", "Premium Furnishing"}', 250.00, true, 8);

-- Create 2026 Price List
INSERT INTO price_lists (id, hotel_id, name, year, currency, valid_from, valid_to, is_active, is_published) VALUES
('price-list-2026', 'hotel-porec-main', '2026 Season', 2026, 'EUR', '2026-01-01', '2026-12-31', true, true);

-- Seasonal Period Definitions (Croatian hotel document)
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

-- Room Type Pricing (using localStorage rates with Room 401 = €450 for Period D)
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

-- 401 Rooftop Apartment: 250€/300€/360€/450€ (using localStorage rate)
('pricing-rooftop', 'price-list-2026', 'rt-rooftop-apartment', 250.00, 300.00, 360.00, 450.00, 4, true);

-- Fee Configurations (Croatian requirements with correct VAT rates)
-- Tourism Tax (Monthly rates, NO VAT)
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, monthly_rates, applies_to_guest_types, vat_rate, is_active, display_order) VALUES
('fee-tourism-tax', 'price-list-2026', 'tourism_tax', 'Boravišna pristojba / Tourism Tax', 'per_person_per_night',
 '{"01": 1.10, "02": 1.10, "03": 1.10, "04": 1.60, "05": 1.60, "06": 1.60, "07": 1.60, "08": 1.60, "09": 1.60, "10": 1.10, "11": 1.10, "12": 1.10}',
 '{"adults"}', 0.0000, true, 1);

-- Pet Fee (25% VAT)
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, fixed_amount, vat_rate, is_active, display_order) VALUES
('fee-pets', 'price-list-2026', 'pet_fee', 'Kućni ljubimci / Pet Fee', 'fixed_amount', 20.00, 0.2500, true, 2);

-- Parking Fee (25% VAT)
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, fixed_amount, vat_rate, is_active, display_order) VALUES
('fee-parking', 'price-list-2026', 'parking_fee', 'Parking', 'fixed_amount', 7.00, 0.2500, true, 3);

-- Children Discounts
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, children_rules, applies_to_guest_types, vat_rate, is_active, display_order) VALUES
('fee-children-discount', 'price-list-2026', 'children_discount', 'Djeca / Children Discount', 'conditional',
 '[{"age_from": 0, "age_to": 3, "discount_percent": 100}, {"age_from": 3, "age_to": 7, "discount_percent": 50}, {"age_from": 7, "age_to": 14, "discount_percent": 20}]',
 '{"children"}', 0.0000, true, 4);

-- Short Stay Supplement (+20% for stays shorter than 3 days)
INSERT INTO fee_configurations (id, price_list_id, fee_type, fee_name, calculation_method, conditions, vat_rate, is_active, display_order) VALUES
('fee-short-stay', 'price-list-2026', 'short_stay_supplement', 'Boravak kraći od 3 dana / Short Stay Supplement', 'conditional',
 '{"max_nights": 3, "supplement_percent": 20}', 0.1300, true, 5);

-- Room Groups (Visual organization for timeline)
INSERT INTO room_groups (id, hotel_id, name, code, color_hex, background_color, text_color, description, priority, is_active) VALUES

-- Main Building Floors
('group-floor1', 'hotel-porec-main', 'Floor 1', 'F1', '#3498db', '#ecf0f1', '#2c3e50', '18 rooms on ground floor', 1, true),
('group-floor2', 'hotel-porec-main', 'Floor 2', 'F2', '#2ecc71', '#d5f5d5', '#27ae60', '18 rooms on second floor', 2, true), 
('group-floor3', 'hotel-porec-main', 'Floor 3', 'F3', '#f39c12', '#fdf2e3', '#e67e22', '18 rooms on third floor', 3, true),
('group-floor4', 'hotel-porec-main', 'Floor 4 - Premium', 'F4', '#e74c3c', '#fdeaea', '#c0392b', 'Premium rooftop apartment', 4, true);

-- All 55 Hotel Porec Rooms with Room 401 special settings
INSERT INTO rooms (id, hotel_id, room_type_id, room_group_id, number, floor, building, is_active, is_cleaned, max_occupancy_override, is_premium, minimum_stay_override, cleaning_buffer_days) VALUES

-- Floor 1 - Room pattern: Family, Double(4), Triple(2), Double(7), Triple(2), Double, Single
('room-101', 'hotel-porec-main', 'rt-family', 'group-floor1', '101', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-102', 'hotel-porec-main', 'rt-double', 'group-floor1', '102', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-103', 'hotel-porec-main', 'rt-double', 'group-floor1', '103', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-104', 'hotel-porec-main', 'rt-double', 'group-floor1', '104', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-105', 'hotel-porec-main', 'rt-double', 'group-floor1', '105', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-106', 'hotel-porec-main', 'rt-triple', 'group-floor1', '106', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-107', 'hotel-porec-main', 'rt-triple', 'group-floor1', '107', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-108', 'hotel-porec-main', 'rt-double', 'group-floor1', '108', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-109', 'hotel-porec-main', 'rt-double', 'group-floor1', '109', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-110', 'hotel-porec-main', 'rt-double', 'group-floor1', '110', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-111', 'hotel-porec-main', 'rt-double', 'group-floor1', '111', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-112', 'hotel-porec-main', 'rt-double', 'group-floor1', '112', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-113', 'hotel-porec-main', 'rt-double', 'group-floor1', '113', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-114', 'hotel-porec-main', 'rt-double', 'group-floor1', '114', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-115', 'hotel-porec-main', 'rt-triple', 'group-floor1', '115', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-116', 'hotel-porec-main', 'rt-triple', 'group-floor1', '116', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-117', 'hotel-porec-main', 'rt-double', 'group-floor1', '117', 1, 'MAIN', true, true, NULL, false, NULL, 0),
('room-118', 'hotel-porec-main', 'rt-single', 'group-floor1', '118', 1, 'MAIN', true, true, NULL, false, NULL, 0),

-- Floor 2 - Same pattern as Floor 1
('room-201', 'hotel-porec-main', 'rt-family', 'group-floor2', '201', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-202', 'hotel-porec-main', 'rt-double', 'group-floor2', '202', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-203', 'hotel-porec-main', 'rt-double', 'group-floor2', '203', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-204', 'hotel-porec-main', 'rt-double', 'group-floor2', '204', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-205', 'hotel-porec-main', 'rt-double', 'group-floor2', '205', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-206', 'hotel-porec-main', 'rt-triple', 'group-floor2', '206', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-207', 'hotel-porec-main', 'rt-triple', 'group-floor2', '207', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-208', 'hotel-porec-main', 'rt-double', 'group-floor2', '208', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-209', 'hotel-porec-main', 'rt-double', 'group-floor2', '209', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-210', 'hotel-porec-main', 'rt-double', 'group-floor2', '210', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-211', 'hotel-porec-main', 'rt-double', 'group-floor2', '211', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-212', 'hotel-porec-main', 'rt-double', 'group-floor2', '212', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-213', 'hotel-porec-main', 'rt-double', 'group-floor2', '213', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-214', 'hotel-porec-main', 'rt-double', 'group-floor2', '214', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-215', 'hotel-porec-main', 'rt-triple', 'group-floor2', '215', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-216', 'hotel-porec-main', 'rt-triple', 'group-floor2', '216', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-217', 'hotel-porec-main', 'rt-double', 'group-floor2', '217', 2, 'MAIN', true, true, NULL, false, NULL, 0),
('room-218', 'hotel-porec-main', 'rt-single', 'group-floor2', '218', 2, 'MAIN', true, true, NULL, false, NULL, 0),

-- Floor 3 - Same pattern as Floor 1 & 2
('room-301', 'hotel-porec-main', 'rt-family', 'group-floor3', '301', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-302', 'hotel-porec-main', 'rt-double', 'group-floor3', '302', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-303', 'hotel-porec-main', 'rt-double', 'group-floor3', '303', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-304', 'hotel-porec-main', 'rt-double', 'group-floor3', '304', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-305', 'hotel-porec-main', 'rt-double', 'group-floor3', '305', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-306', 'hotel-porec-main', 'rt-triple', 'group-floor3', '306', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-307', 'hotel-porec-main', 'rt-triple', 'group-floor3', '307', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-308', 'hotel-porec-main', 'rt-double', 'group-floor3', '308', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-309', 'hotel-porec-main', 'rt-double', 'group-floor3', '309', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-310', 'hotel-porec-main', 'rt-double', 'group-floor3', '310', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-311', 'hotel-porec-main', 'rt-double', 'group-floor3', '311', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-312', 'hotel-porec-main', 'rt-double', 'group-floor3', '312', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-313', 'hotel-porec-main', 'rt-double', 'group-floor3', '313', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-314', 'hotel-porec-main', 'rt-double', 'group-floor3', '314', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-315', 'hotel-porec-main', 'rt-triple', 'group-floor3', '315', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-316', 'hotel-porec-main', 'rt-triple', 'group-floor3', '316', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-317', 'hotel-porec-main', 'rt-double', 'group-floor3', '317', 3, 'MAIN', true, true, NULL, false, NULL, 0),
('room-318', 'hotel-porec-main', 'rt-single', 'group-floor3', '318', 3, 'MAIN', true, true, NULL, false, NULL, 0),

-- Floor 4 - ROOM 401 (Premium Rooftop Apartment with special rules)
('room-401', 'hotel-porec-main', 'rt-rooftop-apartment', 'group-floor4', '401', 4, 'MAIN', true, true, NULL, true, 4, 1);

-- Croatian Fiscal Configuration
INSERT INTO fiscal_configuration (id, hotel_id, environment, vat_rate_accommodation, vat_rate_services, vat_rate_tourism_tax, tourism_tax_rate_low, tourism_tax_rate_high, invoice_prefix, current_invoice_number, invoice_format, fiscal_year_start, is_active) VALUES
('fiscal-hotel-porec', 'hotel-porec-main', 'demo', 0.1300, 0.2500, 0.0000, 1.10, 1.60, 'HP', 1, 'YYYY-NNN-NNNN', '2026-01-01', true);

-- =============================================
-- 11. VERIFICATION QUERIES (COMMENTED)
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
-- SCHEMA COMPLETE WITH HOTEL POREC DATA
-- =============================================