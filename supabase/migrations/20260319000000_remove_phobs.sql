-- Remove all Phobs (channel manager) tables and columns
-- Phobs integration has been removed from the application

-- Drop Phobs-specific tables (order matters for foreign key dependencies)
DROP TABLE IF EXISTS "public"."phobs_webhook_events" CASCADE;
DROP TABLE IF EXISTS "public"."phobs_sync_log" CASCADE;
DROP TABLE IF EXISTS "public"."phobs_conflicts" CASCADE;
DROP TABLE IF EXISTS "public"."phobs_availability" CASCADE;
DROP TABLE IF EXISTS "public"."phobs_room_mappings" CASCADE;
DROP TABLE IF EXISTS "public"."phobs_rate_plans" CASCADE;
DROP TABLE IF EXISTS "public"."phobs_channel_metrics" CASCADE;
DROP TABLE IF EXISTS "public"."phobs_channel_status" CASCADE;
DROP TABLE IF EXISTS "public"."phobs_channels" CASCADE;

-- Remove phobs_guest_id from guests table
DROP INDEX IF EXISTS "public"."idx_guests_phobs_id";
ALTER TABLE "public"."guests"
  DROP CONSTRAINT IF EXISTS "guests_phobs_guest_id_key",
  DROP COLUMN IF EXISTS "phobs_guest_id";

-- Remove phobs_reservation_id from reservations table
DROP INDEX IF EXISTS "public"."idx_reservations_phobs_id";
ALTER TABLE "public"."reservations"
  DROP CONSTRAINT IF EXISTS "reservations_phobs_reservation_id_key",
  DROP COLUMN IF EXISTS "phobs_reservation_id";
