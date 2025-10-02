-- Fix valid_guests constraint to use correct column name
-- The constraint was checking 'children' but the actual column is 'children_count'

-- Drop the old constraint
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS valid_guests;

-- Add the corrected constraint
ALTER TABLE reservations ADD CONSTRAINT valid_guests CHECK (adults >= 1 AND children_count >= 0);