-- Hotel Management System - Complete Database Schema with Critical Fixes
-- Addresses missing pricing_tiers table, Room 401 logic, and data migration

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

-- CRITICAL FIX: Add missing pricing_tiers table
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

-- Fee configurations
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
    applies_to_guest_types TEXT[] DEFAULT '{\"all\"}',
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
    pricing_tier_id UUID REFERENCES pricing_tiers(id), -- CRITICAL FIX: Link to pricing tiers
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
    base_room_rate DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    children_discount DECIMAL(10,2) DEFAULT 0,
    company_discount DECIMAL(10,2) DEFAULT 0,
    promotional_discount DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL,
    tourism_tax DECIMAL(10,2) DEFAULT 0,
    pet_fee DECIMAL(10,2) DEFAULT 0,
    parking_fee DECIMAL(10,2) DEFAULT 0,
    short_stay_supplement DECIMAL(10,2) DEFAULT 0,
    additional_services_fee DECIMAL(10,2) DEFAULT 0,
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
    subtotal DECIMAL(12,2) NOT NULL,
    total_discounts DECIMAL(12,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) NOT NULL,
    tourism_tax DECIMAL(12,2) DEFAULT 0,
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
    vat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2500,
    tourism_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 1.35,
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
-- 7. PERFORMANCE INDEXES
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
-- 8. TRIGGERS AND FUNCTIONS
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

-- =============================================
-- SCHEMA COMPLETE
-- =============================================