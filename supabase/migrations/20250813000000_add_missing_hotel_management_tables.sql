-- Migration: Add missing hotel management tables to align with localStorage structure
-- This migration adds the missing tables for companies, pricing_tiers, invoices, payments, fiscal_records
-- and aligns existing tables with localStorage data structures

-- 1. Add missing fields to guests table to match localStorage structure
ALTER TABLE guests ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(50);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[];
ALTER TABLE guests ADD COLUMN IF NOT EXISTS special_needs TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS has_pets BOOLEAN DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS total_stays INTEGER DEFAULT 0;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS last_stay_date DATE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add constraints for guests (skip if they already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_vip_level' AND table_name = 'guests'
    ) THEN
        ALTER TABLE guests ADD CONSTRAINT valid_vip_level CHECK (vip_level >= 0 AND vip_level <= 5);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_rating' AND table_name = 'guests'
    ) THEN
        ALTER TABLE guests ADD CONSTRAINT valid_rating CHECK (average_rating IS NULL OR (average_rating >= 1 AND average_rating <= 5));
    END IF;
END $$;

-- 2. Create companies table for corporate billing
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    oib VARCHAR(11) UNIQUE, -- Croatian tax number
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(3) DEFAULT 'HR',
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    fax VARCHAR(50),
    
    -- Business relationship
    pricing_tier_id INTEGER,
    room_allocation_guarantee INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_oib CHECK (oib IS NULL OR oib ~ '^[0-9]{11}$')
);

-- 3. Create pricing_tiers table for agency rates and special pricing
CREATE TABLE IF NOT EXISTS pricing_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    
    -- Seasonal rates structure (multipliers)
    seasonal_rate_a DECIMAL(4,3) DEFAULT 1.000, -- Winter/Early Spring
    seasonal_rate_b DECIMAL(4,3) DEFAULT 1.000, -- Spring/Late Fall  
    seasonal_rate_c DECIMAL(4,3) DEFAULT 1.000, -- Early Summer/Early Fall
    seasonal_rate_d DECIMAL(4,3) DEFAULT 1.000, -- Peak Summer
    
    -- Special rules
    is_percentage_discount BOOLEAN DEFAULT true,
    minimum_stay INTEGER,
    
    -- Applicability
    valid_from DATE NOT NULL,
    valid_to DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_rates CHECK (
        seasonal_rate_a >= 0 AND seasonal_rate_b >= 0 AND 
        seasonal_rate_c >= 0 AND seasonal_rate_d >= 0
    )
);

-- 4. Create invoices table for financial management
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    reservation_id INTEGER NOT NULL,
    guest_id INTEGER,
    company_id INTEGER, -- For corporate billing
    
    -- Invoice details
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    paid_date DATE,
    
    -- Financial breakdown
    subtotal DECIMAL(12,2) NOT NULL,
    children_discounts DECIMAL(10,2) DEFAULT 0,
    tourism_tax DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL,
    pet_fee DECIMAL(10,2) DEFAULT 0,
    parking_fee DECIMAL(10,2) DEFAULT 0,
    short_stay_supplement DECIMAL(10,2) DEFAULT 0,
    additional_charges DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_due DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'draft',
    pdf_path TEXT,
    email_sent_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    CONSTRAINT valid_amounts CHECK (total_amount >= 0 AND paid_amount >= 0),
    CONSTRAINT billing_target CHECK (guest_id IS NOT NULL OR company_id IS NOT NULL)
);

-- 5. Create payments table for payment tracking
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    reservation_id INTEGER,
    
    -- Payment details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100),
    
    -- Payment processor info
    card_last_four VARCHAR(4),
    card_type VARCHAR(20),
    authorization_code VARCHAR(50),
    
    -- Status and dates
    status VARCHAR(20) DEFAULT 'pending',
    received_date TIMESTAMPTZ DEFAULT now(),
    processed_date TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
    CONSTRAINT valid_method CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'other'))
);

-- 6. Create fiscal_records table for Croatian fiscal compliance
CREATE TABLE IF NOT EXISTS fiscal_records (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    
    -- Fiscal identifiers
    jir VARCHAR(36), -- Jedinstveni identifikator računa
    zki VARCHAR(32) NOT NULL, -- Zaštitni kod izdavatelja
    
    -- Submission details
    submitted_at TIMESTAMPTZ DEFAULT now(),
    response_status VARCHAR(20) DEFAULT 'pending',
    response_message TEXT,
    qr_code_data TEXT,
    
    -- Croatian fiscal specifics
    operator_oib VARCHAR(11),
    business_space_code VARCHAR(20),
    register_number INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_jir CHECK (jir IS NULL OR jir ~ '^[0-9a-f-]{36}$'),
    CONSTRAINT valid_zki CHECK (zki ~ '^[0-9a-f]{32}$'),
    CONSTRAINT valid_response_status CHECK (response_status IN ('pending', 'success', 'error', 'timeout'))
);

-- 7. Update reservations table to align with localStorage structure
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pricing_tier_id INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS has_pets BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS parking_required BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS last_modified TIMESTAMPTZ DEFAULT now();
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

-- Update guest_children to be linked to guests instead of just reservations
ALTER TABLE guest_children ADD COLUMN IF NOT EXISTS guest_id INTEGER;
ALTER TABLE guest_children ADD COLUMN IF NOT EXISTS discount_category VARCHAR(20);

-- 8. Create foreign key relationships (skip if they already exist)
DO $$ 
BEGIN
    -- Add foreign key constraints only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'companies_pricing_tier_fkey' AND table_name = 'companies'
    ) THEN
        ALTER TABLE companies ADD CONSTRAINT companies_pricing_tier_fkey 
            FOREIGN KEY (pricing_tier_id) REFERENCES pricing_tiers(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reservations_company_fkey' AND table_name = 'reservations'
    ) THEN
        ALTER TABLE reservations ADD CONSTRAINT reservations_company_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
        
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reservations_pricing_tier_fkey' AND table_name = 'reservations'
    ) THEN
        ALTER TABLE reservations ADD CONSTRAINT reservations_pricing_tier_fkey 
            FOREIGN KEY (pricing_tier_id) REFERENCES pricing_tiers(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoices_reservation_fkey' AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_reservation_fkey 
            FOREIGN KEY (reservation_id) REFERENCES reservations(id);
    END IF;
        
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoices_guest_fkey' AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_guest_fkey 
            FOREIGN KEY (guest_id) REFERENCES guests(id);
    END IF;
        
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoices_company_fkey' AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_company_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_invoice_fkey' AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT payments_invoice_fkey 
            FOREIGN KEY (invoice_id) REFERENCES invoices(id);
    END IF;
        
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_reservation_fkey' AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT payments_reservation_fkey 
            FOREIGN KEY (reservation_id) REFERENCES reservations(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fiscal_records_invoice_fkey' AND table_name = 'fiscal_records'
    ) THEN
        ALTER TABLE fiscal_records ADD CONSTRAINT fiscal_records_invoice_fkey 
            FOREIGN KEY (invoice_id) REFERENCES invoices(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'guest_children_guest_fkey' AND table_name = 'guest_children'
    ) THEN
        ALTER TABLE guest_children ADD CONSTRAINT guest_children_guest_fkey 
            FOREIGN KEY (guest_id) REFERENCES guests(id);
    END IF;
END $$;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_oib ON companies(oib);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_active ON pricing_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_default ON pricing_tiers(is_default);
CREATE INDEX IF NOT EXISTS idx_invoices_reservation ON invoices(reservation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_guest ON invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_records_invoice ON fiscal_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reservations_company ON reservations(company_id);
CREATE INDEX IF NOT EXISTS idx_reservations_pricing_tier ON reservations(pricing_tier_id);

-- 10. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS pricing_tiers_updated_at ON pricing_tiers;
CREATE TRIGGER pricing_tiers_updated_at 
    BEFORE UPDATE ON pricing_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS guests_updated_at ON guests;
CREATE TRIGGER guests_updated_at 
    BEFORE UPDATE ON guests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Enable RLS for new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for development)
CREATE POLICY "Allow all operations on companies" ON companies FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on pricing_tiers" ON pricing_tiers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on fiscal_records" ON fiscal_records FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 12. Insert default pricing tier
INSERT INTO pricing_tiers (name, description, is_default, valid_from) 
VALUES ('Standard 2025', 'Default pricing tier for 2025', true, '2025-01-01')
ON CONFLICT (name) DO NOTHING;

-- Migration complete
-- Next step: Create service layer to replace localStorage operations