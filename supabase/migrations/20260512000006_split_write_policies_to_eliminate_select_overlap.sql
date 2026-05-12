-- Lint 0006_multiple_permissive_policies: every table here has both `*_read` (FOR SELECT)
-- and `*_write` (FOR ALL).  FOR ALL implicitly covers SELECT, so Postgres has to evaluate
-- both predicates on every read.  Split each `*_write` into three explicit policies:
-- _insert (FOR INSERT), _update (FOR UPDATE), _delete (FOR DELETE).  No SELECT overlap.
-- SELECT semantics preserved: `*_read` is now the sole permissive policy for reads.

-- categories
DROP POLICY IF EXISTS categories_write ON public.categories;
CREATE POLICY categories_insert ON public.categories FOR INSERT WITH CHECK (get_user_role_id() = 5);
CREATE POLICY categories_update ON public.categories FOR UPDATE USING (get_user_role_id() = 5) WITH CHECK (get_user_role_id() = 5);
CREATE POLICY categories_delete ON public.categories FOR DELETE USING (get_user_role_id() = 5);

-- companies
DROP POLICY IF EXISTS companies_write ON public.companies;
CREATE POLICY companies_insert ON public.companies FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[4,5]));
CREATE POLICY companies_update ON public.companies FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[4,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[4,5]));
CREATE POLICY companies_delete ON public.companies FOR DELETE USING (get_user_role_id() = ANY (ARRAY[4,5]));

-- fiscal_records
DROP POLICY IF EXISTS fiscal_records_write ON public.fiscal_records;
CREATE POLICY fiscal_records_insert ON public.fiscal_records FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[1,4,5]));
CREATE POLICY fiscal_records_update ON public.fiscal_records FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[1,4,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[1,4,5]));
CREATE POLICY fiscal_records_delete ON public.fiscal_records FOR DELETE USING (get_user_role_id() = ANY (ARRAY[1,4,5]));

-- inventory
DROP POLICY IF EXISTS inventory_write ON public.inventory;
CREATE POLICY inventory_insert ON public.inventory FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[2,5]));
CREATE POLICY inventory_update ON public.inventory FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[2,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[2,5]));
CREATE POLICY inventory_delete ON public.inventory FOR DELETE USING (get_user_role_id() = ANY (ARRAY[2,5]));

-- invoice_lines
DROP POLICY IF EXISTS invoice_lines_write ON public.invoice_lines;
CREATE POLICY invoice_lines_insert ON public.invoice_lines FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[1,4,5]));
CREATE POLICY invoice_lines_update ON public.invoice_lines FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[1,4,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[1,4,5]));
CREATE POLICY invoice_lines_delete ON public.invoice_lines FOR DELETE USING (get_user_role_id() = ANY (ARRAY[1,4,5]));

-- invoices
DROP POLICY IF EXISTS invoices_write ON public.invoices;
CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[1,4,5]));
CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[1,4,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[1,4,5]));
CREATE POLICY invoices_delete ON public.invoices FOR DELETE USING (get_user_role_id() = ANY (ARRAY[1,4,5]));

-- items
DROP POLICY IF EXISTS items_write ON public.items;
CREATE POLICY items_insert ON public.items FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[2,5]));
CREATE POLICY items_update ON public.items FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[2,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[2,5]));
CREATE POLICY items_delete ON public.items FOR DELETE USING (get_user_role_id() = ANY (ARRAY[2,5]));

-- locations
DROP POLICY IF EXISTS locations_write ON public.locations;
CREATE POLICY locations_insert ON public.locations FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[2,5]));
CREATE POLICY locations_update ON public.locations FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[2,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[2,5]));
CREATE POLICY locations_delete ON public.locations FOR DELETE USING (get_user_role_id() = ANY (ARRAY[2,5]));

-- pricing_tiers
DROP POLICY IF EXISTS pricing_tiers_write ON public.pricing_tiers;
CREATE POLICY pricing_tiers_insert ON public.pricing_tiers FOR INSERT WITH CHECK (get_user_role_id() = 5);
CREATE POLICY pricing_tiers_update ON public.pricing_tiers FOR UPDATE USING (get_user_role_id() = 5) WITH CHECK (get_user_role_id() = 5);
CREATE POLICY pricing_tiers_delete ON public.pricing_tiers FOR DELETE USING (get_user_role_id() = 5);

-- reservation_charges (policy names use charges_*)
DROP POLICY IF EXISTS charges_write ON public.reservation_charges;
CREATE POLICY charges_insert ON public.reservation_charges FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[1,5]));
CREATE POLICY charges_update ON public.reservation_charges FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[1,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[1,5]));
CREATE POLICY charges_delete ON public.reservation_charges FOR DELETE USING (get_user_role_id() = ANY (ARRAY[1,5]));

-- rooms
DROP POLICY IF EXISTS rooms_write ON public.rooms;
CREATE POLICY rooms_insert ON public.rooms FOR INSERT WITH CHECK (get_user_role_id() = ANY (ARRAY[1,5]));
CREATE POLICY rooms_update ON public.rooms FOR UPDATE USING (get_user_role_id() = ANY (ARRAY[1,5])) WITH CHECK (get_user_role_id() = ANY (ARRAY[1,5]));
CREATE POLICY rooms_delete ON public.rooms FOR DELETE USING (get_user_role_id() = ANY (ARRAY[1,5]));
