-- Lint: 0001_unindexed_foreign_keys (4 FKs flagged by advisor)
-- Each foreign key needs a covering index on its referencing column so:
--   * ON DELETE/UPDATE on the parent row doesn't seq-scan the child table
--   * joins via the FK can use an index lookup
-- Index names follow the existing idx_<table>_<column> convention.

CREATE INDEX IF NOT EXISTS idx_companies_pricing_tier_id  ON public.companies      (pricing_tier_id);
CREATE INDEX IF NOT EXISTS idx_guest_children_guest_id    ON public.guest_children (guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id_fk    ON public.reservations   (room_id);
CREATE INDEX IF NOT EXISTS idx_room_pricing_season_id     ON public.room_pricing   (season_id);
