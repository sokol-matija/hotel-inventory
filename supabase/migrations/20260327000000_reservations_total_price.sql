-- Add denormalized total_price to reservations for fast card display.
-- NULL = legacy reservation created before the charge system.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2);
