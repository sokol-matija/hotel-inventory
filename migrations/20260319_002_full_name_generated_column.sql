-- Migration: Make guests.full_name a generated column
-- Why: Previously full_name was a plain stored column manually populated on insert/update,
--      which could drift out of sync with first_name / last_name. Converting it to
--      GENERATED ALWAYS ensures it is always exactly first_name || ' ' || last_name.

-- Step 2a: Drop the old stored column
ALTER TABLE guests DROP COLUMN IF EXISTS full_name;

-- Step 2b: Re-add as a generated column
ALTER TABLE guests
  ADD COLUMN full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
