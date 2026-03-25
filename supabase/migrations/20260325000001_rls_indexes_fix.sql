-- Migration: RLS hardening + missing performance indexes + data integrity
--
-- Fixes:
--   1. reservation_charges / invoice_lines had broad "all authenticated" RLS policies —
--      upgrade to role-based using get_user_role_id() (same as reservations/invoices)
--   2. invoice_lines was missing a CHECK constraint on charge_type (reservation_charges had one)
--   3. Add missing performance indexes for common query patterns

-- ─────────────────────────────────────────────────────────────
-- 1. Fix RLS on reservation_charges
--    reception (1) + bookkeeping (4, read only) + admin (5)
--    matches the reservations access pattern
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.reservation_charges;

CREATE POLICY "charges_read" ON public.reservation_charges
  FOR SELECT USING (get_user_role_id() IN (1, 4, 5));

CREATE POLICY "charges_write" ON public.reservation_charges
  FOR ALL USING (get_user_role_id() IN (1, 5));

-- ─────────────────────────────────────────────────────────────
-- 2. Fix RLS on invoice_lines
--    same as invoices: bookkeeping (4) + reception (1) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.invoice_lines;

CREATE POLICY "invoice_lines_read" ON public.invoice_lines
  FOR SELECT USING (get_user_role_id() IN (1, 4, 5));

CREATE POLICY "invoice_lines_write" ON public.invoice_lines
  FOR ALL USING (get_user_role_id() IN (1, 4, 5));

-- ─────────────────────────────────────────────────────────────
-- 3. Add CHECK constraint on invoice_lines.charge_type
--    reservation_charges already has this; invoice_lines was missing it
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.invoice_lines
  ADD CONSTRAINT invoice_lines_charge_type_check
  CHECK (charge_type IN (
    'accommodation', 'tourism_tax', 'parking', 'pet_fee',
    'short_stay_supplement', 'room_service', 'towel_rental',
    'additional', 'discount'
  ));

-- ─────────────────────────────────────────────────────────────
-- 4. Missing performance indexes
-- ─────────────────────────────────────────────────────────────

-- Guest search (used in DatabaseAdapter + GuestAutocomplete)
CREATE INDEX IF NOT EXISTS idx_guests_last_name ON public.guests (last_name);
CREATE INDEX IF NOT EXISTS idx_guests_email     ON public.guests (email);
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON public.guests (full_name);

-- Housekeeping dashboard composite filter (covers both columns in a single index scan)
CREATE INDEX IF NOT EXISTS idx_rooms_active_clean
  ON public.rooms (is_active, is_clean);

-- Location type filter
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations (type);

-- Items: is_active filter (every item list query filters this)
CREATE INDEX IF NOT EXISTS idx_items_active ON public.items (is_active);

-- Pricing tiers: active tier date range lookup
-- Partial index — only indexes rows where is_active = true (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_valid_dates
  ON public.pricing_tiers (valid_from, valid_to) WHERE is_active = true;

-- Charges: per-day views and early-checkout queries
-- Partial index — stay_date is only set on accommodation/tourism_tax rows
CREATE INDEX IF NOT EXISTS idx_charges_stay_date
  ON public.reservation_charges (stay_date) WHERE stay_date IS NOT NULL;
