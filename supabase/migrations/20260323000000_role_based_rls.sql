-- Migration: Role-based RLS policies (C-26)
-- Replace broad "any authenticated user" policies with role-specific access control.
--
-- Roles (from user_roles):
--   1 = reception      Front desk, guest services
--   2 = kitchen        Kitchen, room service
--   3 = housekeeping   Housekeeping, room status
--   4 = bookkeeping    Accounting, invoices, payments
--   5 = admin          Full access

-- ─────────────────────────────────────────────────────────────
-- Helper: get current user's role_id from user_profiles
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role_id()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role_id
  FROM public.user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- reservations: reception (1) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."reservations";

CREATE POLICY "reservations_role_access" ON "public"."reservations"
  USING (get_user_role_id() IN (1, 5));

-- ─────────────────────────────────────────────────────────────
-- rooms: reception (1) + housekeeping (3) + admin (5) — read-only for housekeeping
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."rooms";

CREATE POLICY "rooms_read" ON "public"."rooms"
  FOR SELECT USING (get_user_role_id() IN (1, 2, 3, 4, 5));

CREATE POLICY "rooms_write" ON "public"."rooms"
  FOR ALL USING (get_user_role_id() IN (1, 5));

-- ─────────────────────────────────────────────────────────────
-- guests: reception (1) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."guests";

CREATE POLICY "guests_role_access" ON "public"."guests"
  USING (get_user_role_id() IN (1, 5));

-- ─────────────────────────────────────────────────────────────
-- guest_stays, guest_children, reservation_guests: reception (1) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."guest_stays";
CREATE POLICY "guest_stays_role_access" ON "public"."guest_stays"
  USING (get_user_role_id() IN (1, 5));

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."guest_children";
CREATE POLICY "guest_children_role_access" ON "public"."guest_children"
  USING (get_user_role_id() IN (1, 5));

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."reservation_guests";
CREATE POLICY "reservation_guests_role_access" ON "public"."reservation_guests"
  USING (get_user_role_id() IN (1, 5));

-- ─────────────────────────────────────────────────────────────
-- inventory + items + locations + categories:
--   read: kitchen (2) + reception (1) + admin (5)
--   write: kitchen (2) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."inventory";
CREATE POLICY "inventory_read" ON "public"."inventory"
  FOR SELECT USING (get_user_role_id() IN (1, 2, 3, 5));
CREATE POLICY "inventory_write" ON "public"."inventory"
  FOR ALL USING (get_user_role_id() IN (2, 5));

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."items";
CREATE POLICY "items_read" ON "public"."items"
  FOR SELECT USING (get_user_role_id() IN (1, 2, 3, 4, 5));
CREATE POLICY "items_write" ON "public"."items"
  FOR ALL USING (get_user_role_id() IN (2, 5));

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."locations";
CREATE POLICY "locations_read" ON "public"."locations"
  FOR SELECT USING (get_user_role_id() IN (1, 2, 3, 4, 5));
CREATE POLICY "locations_write" ON "public"."locations"
  FOR ALL USING (get_user_role_id() IN (2, 5));

-- categories: all authenticated can read
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."categories";
CREATE POLICY "categories_read" ON "public"."categories"
  FOR SELECT USING (get_user_role_id() IS NOT NULL);
CREATE POLICY "categories_write" ON "public"."categories"
  FOR ALL USING (get_user_role_id() IN (5));

-- ─────────────────────────────────────────────────────────────
-- room_service_orders: kitchen (2) + reception (1) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."room_service_orders";
CREATE POLICY "room_service_orders_role_access" ON "public"."room_service_orders"
  USING (get_user_role_id() IN (1, 2, 5));

-- ─────────────────────────────────────────────────────────────
-- daily_guest_services: housekeeping (3) + reception (1) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."daily_guest_services";
CREATE POLICY "daily_guest_services_role_access" ON "public"."daily_guest_services"
  USING (get_user_role_id() IN (1, 3, 5));

-- ─────────────────────────────────────────────────────────────
-- invoices, payments, fiscal_records: bookkeeping (4) + reception (1, can read) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations on invoices" ON "public"."invoices";
CREATE POLICY "invoices_read" ON "public"."invoices"
  FOR SELECT USING (get_user_role_id() IN (1, 4, 5));
CREATE POLICY "invoices_write" ON "public"."invoices"
  FOR ALL USING (get_user_role_id() IN (1, 4, 5));

DROP POLICY IF EXISTS "Allow all operations on payments" ON "public"."payments";
CREATE POLICY "payments_read" ON "public"."payments"
  FOR SELECT USING (get_user_role_id() IN (1, 4, 5));
CREATE POLICY "payments_write" ON "public"."payments"
  FOR ALL USING (get_user_role_id() IN (1, 4, 5));

DROP POLICY IF EXISTS "Allow all operations on fiscal_records" ON "public"."fiscal_records";
CREATE POLICY "fiscal_records_read" ON "public"."fiscal_records"
  FOR SELECT USING (get_user_role_id() IN (1, 4, 5));
CREATE POLICY "fiscal_records_write" ON "public"."fiscal_records"
  FOR ALL USING (get_user_role_id() IN (1, 4, 5));

-- ─────────────────────────────────────────────────────────────
-- pricing_tiers: admin (5) only for write; all can read
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations on pricing_tiers" ON "public"."pricing_tiers";
CREATE POLICY "pricing_tiers_read" ON "public"."pricing_tiers"
  FOR SELECT USING (get_user_role_id() IS NOT NULL);
CREATE POLICY "pricing_tiers_write" ON "public"."pricing_tiers"
  FOR ALL USING (get_user_role_id() IN (5));

-- ─────────────────────────────────────────────────────────────
-- companies: bookkeeping (4) + admin (5)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations on companies" ON "public"."companies";
CREATE POLICY "companies_read" ON "public"."companies"
  FOR SELECT USING (get_user_role_id() IN (1, 4, 5));
CREATE POLICY "companies_write" ON "public"."companies"
  FOR ALL USING (get_user_role_id() IN (4, 5));

-- ─────────────────────────────────────────────────────────────
-- user_roles: all can read (needed for onboarding dropdown)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "public"."user_roles";
CREATE POLICY "user_roles_read" ON "public"."user_roles"
  FOR SELECT USING (true); -- public read (needed during onboarding before profile exists)
