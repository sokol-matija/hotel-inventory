-- Migration: Drop stale OTA/Phobs columns from reservations
-- Why: The Phobs channel manager integration was fully removed from the frontend.
--      No code reads or writes ota_channel, sync_status, sync_errors, or last_synced_at.
--      Keeping dead columns creates confusion and schema bloat.
-- Note: Two dependent views (reservation_with_all_guests, reservations_with_enums) were
--       dropped via CASCADE and recreated without these columns in the same migration run.

ALTER TABLE reservations
  DROP COLUMN IF EXISTS ota_channel CASCADE,
  DROP COLUMN IF EXISTS sync_status CASCADE,
  DROP COLUMN IF EXISTS sync_errors CASCADE,
  DROP COLUMN IF EXISTS last_synced_at CASCADE;

-- Recreate reservation_with_all_guests without the dropped columns
CREATE OR REPLACE VIEW reservation_with_all_guests AS
 SELECT r.id,
    r.guest_id,
    r.room_id,
    r.check_in_date,
    r.check_out_date,
    r.number_of_nights,
    r.number_of_guests,
    r.adults,
    r.children_count,
    r.status,
    r.booking_source,
    r.special_requests,
    r.internal_notes,
    r.seasonal_period,
    r.base_room_rate,
    r.subtotal,
    r.children_discounts,
    r.tourism_tax,
    r.vat_amount,
    r.pet_fee,
    r.parking_fee,
    r.short_stay_supplement,
    r.additional_charges,
    r.total_amount,
    r.payment_status,
    r.payment_method,
    r.deposit_amount,
    r.balance_due,
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
    r.commission_rate,
    r.commission_amount,
    r.net_amount,
    COALESCE(json_agg(json_build_object('id', g.id, 'first_name', g.first_name, 'last_name', g.last_name, 'email', g.email, 'phone', g.phone, 'is_primary', (g.id = r.guest_id), 'check_in', COALESCE(gs.check_in, (r.check_in_date)::timestamp with time zone), 'check_out', COALESCE(gs.check_out, (r.check_out_date)::timestamp with time zone))) FILTER (WHERE (g.id IS NOT NULL)), '[]'::json) AS all_guests
   FROM (((reservations r
     LEFT JOIN reservation_guests rg ON ((r.id = rg.reservation_id)))
     LEFT JOIN guests g ON ((rg.guest_id = g.id)))
     LEFT JOIN guest_stays gs ON (((r.id = gs.reservation_id) AND (g.id = gs.guest_id))))
  GROUP BY r.id;

-- Recreate reservations_with_enums without the dropped columns
CREATE OR REPLACE VIEW reservations_with_enums AS
 SELECT r.id,
    r.guest_id,
    r.room_id,
    r.check_in_date,
    r.check_out_date,
    r.number_of_nights,
    r.number_of_guests,
    r.adults,
    r.children_count,
    r.status,
    r.booking_source,
    r.special_requests,
    r.internal_notes,
    r.seasonal_period,
    r.base_room_rate,
    r.subtotal,
    r.children_discounts,
    r.tourism_tax,
    r.vat_amount,
    r.pet_fee,
    r.parking_fee,
    r.short_stay_supplement,
    r.additional_charges,
    r.total_amount,
    r.payment_status,
    r.payment_method,
    r.deposit_amount,
    r.balance_due,
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
    r.commission_rate,
    r.commission_amount,
    r.net_amount,
    r.status_id,
    r.booking_source_id,
    COALESCE(rs.code, r.status) AS status_code,
    COALESCE(rs.name, r.status) AS status_name,
    rs.color AS status_color,
    rs.icon AS status_icon,
    COALESCE(bs.code, r.booking_source) AS booking_source_code,
    COALESCE(bs.name, r.booking_source) AS booking_source_name,
    bs.default_commission_rate,
    bs.color AS booking_source_color,
    bs.icon AS booking_source_icon
   FROM ((reservations r
     LEFT JOIN reservation_statuses rs ON ((r.status_id = rs.id)))
     LEFT JOIN booking_sources bs ON ((r.booking_source_id = bs.id)));
