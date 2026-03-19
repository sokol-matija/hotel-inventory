-- Migration: Add guest_stats computed view
-- Why: guests.total_stays, guests.total_spent, guests.average_rating are denormalized
--      aggregates on the guests table that go stale whenever reservations change.
--      This view computes live aggregate stats directly from the reservations table,
--      so callers always get accurate figures without manual maintenance.
-- Note: The original columns (total_stays, total_spent, average_rating) are NOT dropped
--       to preserve any existing data. Future code should query this view instead.

CREATE OR REPLACE VIEW guest_stats AS
SELECT
  g.id AS guest_id,
  COUNT(DISTINCT r.id) AS total_reservations,
  COALESCE(SUM(r.total_amount), 0) AS total_spent,
  MIN(r.check_in_date) AS first_stay,
  MAX(r.check_in_date) AS last_stay
FROM guests g
LEFT JOIN reservations r ON r.guest_id = g.id
  AND r.status NOT IN ('unallocated')
GROUP BY g.id;
