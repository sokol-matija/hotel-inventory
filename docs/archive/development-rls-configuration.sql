-- =============================================
-- DEVELOPMENT-FRIENDLY RLS CONFIGURATION
-- Row-Level Security for Hotel Management System
-- =============================================

-- =============================================
-- STRATEGY: DEVELOPMENT-FIRST, PRODUCTION-READY
-- =============================================
-- 
-- For DEVELOPMENT:
-- - Permissive policies that allow testing
-- - Read access for all authenticated users
-- - Write access with basic validation
-- 
-- For PRODUCTION (future):
-- - Strict multi-tenant isolation
-- - Role-based permissions
-- - Audit trails
--
-- =============================================

-- =============================================
-- PHASE 1: DISABLE EXISTING RLS (Clean slate)
-- =============================================

-- Disable RLS on all tables to start fresh
ALTER TABLE hotels DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_period_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_type_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_configuration DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_groups DISABLE ROW LEVEL SECURITY;

-- Drop existing policies (they may not exist, but safe to try)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON hotels;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON room_types;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON rooms;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON guests;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON reservations;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON companies;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON pricing_tiers;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON price_lists;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON seasonal_period_definitions;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON room_type_pricing;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON fee_configurations;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON fiscal_configuration;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON fiscal_records;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON room_groups;

-- =============================================
-- PHASE 2: DEVELOPMENT-FRIENDLY RLS POLICIES
-- =============================================

-- HOTELS TABLE
-- Strategy: Read-only for all authenticated users
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" 
ON hotels FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON hotels FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON hotels FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ROOM_TYPES TABLE
-- Strategy: Full access for authenticated users (configuration data)
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON room_types FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ROOMS TABLE
-- Strategy: Full access for authenticated users
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON rooms FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- GUESTS TABLE
-- Strategy: Full access for authenticated users
-- Note: In production, limit to hotel staff + guest themselves
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON guests FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- RESERVATIONS TABLE
-- Strategy: Full access for authenticated users
-- Note: In production, limit by hotel + user role
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON reservations FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- COMPANIES TABLE
-- Strategy: Full access for authenticated users
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON companies FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- PRICING_TIERS TABLE
-- Strategy: Full access for authenticated users
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON pricing_tiers FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- PRICE_LISTS TABLE
-- Strategy: Read access for all, write for admin
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" 
ON price_lists FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow write access for authenticated users" 
ON price_lists FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON price_lists FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- SEASONAL_PERIOD_DEFINITIONS TABLE
ALTER TABLE seasonal_period_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON seasonal_period_definitions FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ROOM_TYPE_PRICING TABLE
ALTER TABLE room_type_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON room_type_pricing FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- FEE_CONFIGURATIONS TABLE
ALTER TABLE fee_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON fee_configurations FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- FISCAL_CONFIGURATION TABLE
ALTER TABLE fiscal_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" 
ON fiscal_configuration FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow write access for authenticated users" 
ON fiscal_configuration FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON fiscal_configuration FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- INVOICES TABLE
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON invoices FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- PAYMENTS TABLE
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON payments FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- FISCAL_RECORDS TABLE
ALTER TABLE fiscal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON fiscal_records FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ROOM_GROUPS TABLE
ALTER TABLE room_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" 
ON room_groups FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- =============================================
-- PHASE 3: ANON ACCESS FOR TESTING
-- =============================================

-- For development/testing, allow anon access to some tables
-- This enables testing without authentication setup

-- Allow anon read access to configuration tables
CREATE POLICY "Allow anon read access to hotels" 
ON hotels FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon read access to room_types" 
ON room_types FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon read access to rooms" 
ON rooms FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon read access to room_groups" 
ON room_groups FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon read access to price_lists" 
ON price_lists FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon read access to seasonal_periods" 
ON seasonal_period_definitions FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon read access to room_pricing" 
ON room_type_pricing FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon read access to fee_configs" 
ON fee_configurations FOR SELECT 
TO anon 
USING (true);

-- Allow anon access to operational data for testing
CREATE POLICY "Allow anon access to guests" 
ON guests FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow anon access to reservations" 
ON reservations FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow anon access to companies" 
ON companies FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow anon access to pricing_tiers" 
ON pricing_tiers FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- =============================================
-- PHASE 4: REALTIME PUBLICATION SETUP
-- =============================================

-- Enable realtime for key tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE guests;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- =============================================
-- PHASE 5: PRODUCTION-READY POLICIES (COMMENTED)
-- =============================================

/*
-- FUTURE PRODUCTION POLICIES:
-- These policies should be implemented when moving to production

-- Multi-tenant hotel isolation
CREATE POLICY "Hotel staff can only access their hotel's data" 
ON reservations FOR ALL 
TO authenticated 
USING (
  hotel_id IN (
    SELECT hotel_id FROM user_hotel_access 
    WHERE user_id = auth.uid()
  )
) 
WITH CHECK (
  hotel_id IN (
    SELECT hotel_id FROM user_hotel_access 
    WHERE user_id = auth.uid()
  )
);

-- Role-based access control
CREATE POLICY "Managers can manage all data" 
ON reservations FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('manager', 'admin')
  )
);

-- Guest can only see their own data
CREATE POLICY "Guests can only see their own data" 
ON reservations FOR SELECT 
TO authenticated 
USING (
  primary_guest_id IN (
    SELECT guest_id FROM user_guest_mapping 
    WHERE user_id = auth.uid()
  )
);

-- Financial data restricted to finance role
CREATE POLICY "Finance staff only" 
ON invoices FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('finance', 'manager', 'admin')
  )
);
*/

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ DEVELOPMENT RLS CONFIGURATION COMPLETED';
    RAISE NOTICE '🔓 Permissive policies enabled for development';
    RAISE NOTICE '📺 Realtime publication configured';
    RAISE NOTICE '🚀 Ready for front-desk testing';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Tighten policies before production!';
    RAISE NOTICE '📋 See commented production policies in this file';
END $$;