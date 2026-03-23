-- Add pet_count column to reservation_daily_details
-- This was referenced in UnifiedPricingService but the column was missing from the schema

ALTER TABLE "public"."reservation_daily_details"
  ADD COLUMN IF NOT EXISTS "pet_count" integer DEFAULT 0;
