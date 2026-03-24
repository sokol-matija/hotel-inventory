-- Migration: Line-item pricing model
-- Replace 18 flat pricing columns on reservations with a reservation_charges table
-- where each fee is a per-person, per-season line item (like a receipt).
--
-- Tables added:   reservation_charges, invoice_lines
-- Tables dropped: room_service_orders, reservation_daily_details
--                 (daily_guest_services, payments already gone from live DB)
-- Tables slimmed: reservations (-18 columns), invoices (-7 columns), pricing_tiers (-4 cols +1)
-- Views updated:  guest_stats, reservation_with_all_guests, reservations_with_enums

-- ─────────────────────────────────────────────────────────────
-- 1. Create reservation_charges
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.reservation_charges (
    id             serial PRIMARY KEY,
    reservation_id integer NOT NULL
        REFERENCES public.reservations(id) ON DELETE CASCADE,
    charge_type    varchar(30) NOT NULL
        CHECK (charge_type IN (
            'accommodation', 'tourism_tax', 'parking', 'pet_fee',
            'short_stay_supplement', 'room_service', 'towel_rental',
            'additional', 'discount'
        )),
    description    text NOT NULL,
    quantity       numeric(10,2) NOT NULL DEFAULT 1,
    unit_price     numeric(10,2) NOT NULL,
    total          numeric(10,2) NOT NULL,
    vat_rate       numeric(5,4) DEFAULT 0.13,
    stay_date      date,
    sort_order     integer DEFAULT 0,
    created_at     timestamptz DEFAULT now(),
    updated_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_charges_reservation ON public.reservation_charges(reservation_id);

-- ─────────────────────────────────────────────────────────────
-- 2. Create invoice_lines
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.invoice_lines (
    id          serial PRIMARY KEY,
    invoice_id  integer NOT NULL
        REFERENCES public.invoices(id) ON DELETE CASCADE,
    charge_type varchar(30) NOT NULL,
    description text NOT NULL,
    quantity    numeric(10,2) NOT NULL DEFAULT 1,
    unit_price  numeric(10,2) NOT NULL,
    total       numeric(10,2) NOT NULL,
    vat_rate    numeric(5,4) DEFAULT 0.13,
    sort_order  integer DEFAULT 0
);

CREATE INDEX idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Simplify pricing_tiers
--    seasonal_rate_* stored as decimal fraction (0.10 = 10% off).
--    Values >= 1.0 were old-style multipliers — treat as 0% discount.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.pricing_tiers
    ADD COLUMN discount_percentage numeric(5,2) DEFAULT 0;

UPDATE public.pricing_tiers
SET discount_percentage = CASE
    WHEN seasonal_rate_a >= 1.000 THEN 0
    ELSE ROUND(COALESCE(seasonal_rate_a, 0) * 100, 2)
END;

ALTER TABLE public.pricing_tiers DROP CONSTRAINT IF EXISTS valid_rates;

ALTER TABLE public.pricing_tiers
    DROP COLUMN seasonal_rate_a,
    DROP COLUMN seasonal_rate_b,
    DROP COLUMN seasonal_rate_c,
    DROP COLUMN seasonal_rate_d,
    DROP COLUMN is_percentage_discount;

-- ─────────────────────────────────────────────────────────────
-- 4. Drop dead/unused tables
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.daily_guest_services CASCADE;
DROP TABLE IF EXISTS public.room_service_orders CASCADE;
DROP TABLE IF EXISTS public.reservation_daily_details CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 5. Clear reservation data (all dummy — no backfill needed)
--    CASCADE empties: guest_stays, guest_children, reservation_guests, invoices
-- ─────────────────────────────────────────────────────────────
TRUNCATE public.reservations CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 6. Drop all views that reference columns being removed
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.guest_stats;
DROP VIEW IF EXISTS public.reservation_with_all_guests;
DROP VIEW IF EXISTS public.reservations_with_enums;

-- ─────────────────────────────────────────────────────────────
-- 7. Drop CHECK constraints that reference columns being dropped
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS valid_amounts;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_payment_status_check;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_seasonal_period_check;

-- ─────────────────────────────────────────────────────────────
-- 8. Remove flat pricing columns from reservations
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.reservations
    DROP COLUMN IF EXISTS seasonal_period,
    DROP COLUMN IF EXISTS base_room_rate,
    DROP COLUMN IF EXISTS subtotal,
    DROP COLUMN IF EXISTS children_discounts,
    DROP COLUMN IF EXISTS tourism_tax,
    DROP COLUMN IF EXISTS vat_amount,
    DROP COLUMN IF EXISTS pet_fee,
    DROP COLUMN IF EXISTS parking_fee,
    DROP COLUMN IF EXISTS short_stay_supplement,
    DROP COLUMN IF EXISTS additional_charges,
    DROP COLUMN IF EXISTS total_amount,
    DROP COLUMN IF EXISTS payment_status,
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS deposit_amount,
    DROP COLUMN IF EXISTS balance_due,
    DROP COLUMN IF EXISTS commission_rate,
    DROP COLUMN IF EXISTS commission_amount,
    DROP COLUMN IF EXISTS net_amount;

-- ─────────────────────────────────────────────────────────────
-- 9. Remove pricing breakdown columns from invoices
--    Keep: subtotal, total_amount, paid_amount, balance_due (generated)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.invoices
    DROP COLUMN IF EXISTS children_discounts,
    DROP COLUMN IF EXISTS tourism_tax,
    DROP COLUMN IF EXISTS vat_amount,
    DROP COLUMN IF EXISTS pet_fee,
    DROP COLUMN IF EXISTS parking_fee,
    DROP COLUMN IF EXISTS short_stay_supplement,
    DROP COLUMN IF EXISTS additional_charges;

-- ─────────────────────────────────────────────────────────────
-- 10. Recreate reservations_with_enums (pricing columns removed)
--     Note: status/booking_source varchar columns already gone from live DB;
--     only status_id/booking_source_id remain.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.reservations_with_enums AS
SELECT
    r.id,
    r.guest_id,
    r.room_id,
    r.check_in_date,
    r.check_out_date,
    r.number_of_nights,
    r.number_of_guests,
    r.adults,
    r.children_count,
    r.special_requests,
    r.internal_notes,
    r.booking_date,
    r.confirmation_number,
    r.created_at,
    r.updated_at,
    r.company_id,
    r.pricing_tier_id,
    r.has_pets,
    r.parking_required,
    r.last_modified,
    r.checked_in_at,
    r.checked_out_at,
    r.booking_reference,
    r.status_id,
    r.booking_source_id,
    r.is_r1,
    r.label_id,
    rs.code  AS status_code,
    rs.name  AS status_name,
    rs.color AS status_color,
    rs.icon  AS status_icon,
    bs.code                    AS booking_source_code,
    bs.name                    AS booking_source_name,
    bs.default_commission_rate,
    bs.color                   AS booking_source_color,
    bs.icon                    AS booking_source_icon
FROM public.reservations r
LEFT JOIN public.reservation_statuses rs ON rs.id = r.status_id
LEFT JOIN public.booking_sources       bs ON bs.id = r.booking_source_id;

-- ─────────────────────────────────────────────────────────────
-- 11. Recreate reservation_with_all_guests (pricing columns removed)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.reservation_with_all_guests AS
SELECT
    r.id,
    r.guest_id,
    r.room_id,
    r.check_in_date,
    r.check_out_date,
    r.number_of_nights,
    r.number_of_guests,
    r.adults,
    r.children_count,
    r.special_requests,
    r.internal_notes,
    r.booking_date,
    r.confirmation_number,
    r.created_at,
    r.updated_at,
    r.company_id,
    r.pricing_tier_id,
    r.has_pets,
    r.parking_required,
    r.last_modified,
    r.checked_in_at,
    r.checked_out_at,
    r.booking_reference,
    r.status_id,
    r.booking_source_id,
    r.is_r1,
    r.label_id,
    rs.code AS status_code,
    bs.code AS booking_source_code,
    COALESCE(
        json_agg(json_build_object(
            'id',         g.id,
            'first_name', g.first_name,
            'last_name',  g.last_name,
            'email',      g.email,
            'phone',      g.phone,
            'is_primary', (g.id = r.guest_id),
            'check_in',   COALESCE(gs.check_in,  r.check_in_date::timestamptz),
            'check_out',  COALESCE(gs.check_out, r.check_out_date::timestamptz)
        )) FILTER (WHERE g.id IS NOT NULL),
        '[]'::json
    ) AS all_guests
FROM public.reservations r
LEFT JOIN public.reservation_statuses rs  ON rs.id = r.status_id
LEFT JOIN public.booking_sources       bs  ON bs.id = r.booking_source_id
LEFT JOIN public.reservation_guests    rg  ON rg.reservation_id = r.id
LEFT JOIN public.guests                g   ON g.id = rg.guest_id
LEFT JOIN public.guest_stays           gs  ON gs.reservation_id = r.id AND gs.guest_id = g.id
GROUP BY r.id, rs.code, bs.code;

-- ─────────────────────────────────────────────────────────────
-- 12. Recreate guest_stats using reservation_charges
--     (was using r.total_amount which is now dropped)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.guest_stats AS
SELECT
    g.id                       AS guest_id,
    COUNT(DISTINCT r.id)       AS total_reservations,
    COALESCE(SUM(rc.total), 0) AS total_spent,
    MIN(r.check_in_date)       AS first_stay,
    MAX(r.check_in_date)       AS last_stay
FROM public.guests g
LEFT JOIN public.reservations r
    ON r.guest_id = g.id
    AND r.status_id <> (
        SELECT id FROM public.reservation_statuses WHERE code = 'unallocated'
    )
LEFT JOIN public.reservation_charges rc ON rc.reservation_id = r.id
GROUP BY g.id;

-- ─────────────────────────────────────────────────────────────
-- 13. RLS for reservation_charges
--     Matches reservations policy: all authenticated users
--     (role-based upgrade can be applied separately once get_user_role_id exists)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.reservation_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users"
    ON public.reservation_charges
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 14. RLS for invoice_lines
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users"
    ON public.invoice_lines
    TO authenticated
    USING (true)
    WITH CHECK (true);
