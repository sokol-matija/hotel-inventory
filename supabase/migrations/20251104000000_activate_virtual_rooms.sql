-- Migration: Activate virtual rooms (Floor 5) for unallocated reservations
-- Date: 2025-11-04
-- Description: Sets is_active=true for all virtual rooms (501-550) so they can be used
--              for unallocated reservation workflow

-- Activate all virtual rooms on Floor 5
UPDATE rooms
SET is_active = true
WHERE floor_number = 5
  AND room_type = 'UNALLOC'
  AND is_active = false;

-- Verify the update
DO $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM rooms
  WHERE floor_number = 5
    AND room_type = 'UNALLOC'
    AND is_active = true;

  RAISE NOTICE 'Activated % virtual rooms on Floor 5', active_count;

  IF active_count < 50 THEN
    RAISE EXCEPTION 'Expected 50 virtual rooms to be activated, but only % were found', active_count;
  END IF;
END $$;
