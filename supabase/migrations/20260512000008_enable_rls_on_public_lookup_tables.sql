-- Lint 0013_rls_disabled_in_public: 7 tables are reachable through PostgREST without RLS.
-- All 7 are reference/lookup tables read by the staff-only app via the authenticated role;
-- only admins (role_id = 5) need to mutate them.  room_cleaning_reset_log is appended only
-- by a SECURITY DEFINER trigger which bypasses RLS, so we keep writes admin-only too.

-- booking_sources
ALTER TABLE public.booking_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY booking_sources_read   ON public.booking_sources FOR SELECT TO authenticated USING (get_user_role_id() IS NOT NULL);
CREATE POLICY booking_sources_insert ON public.booking_sources FOR INSERT TO authenticated WITH CHECK (get_user_role_id() = 5);
CREATE POLICY booking_sources_update ON public.booking_sources FOR UPDATE TO authenticated USING (get_user_role_id() = 5) WITH CHECK (get_user_role_id() = 5);
CREATE POLICY booking_sources_delete ON public.booking_sources FOR DELETE TO authenticated USING (get_user_role_id() = 5);

-- hotels
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY hotels_read   ON public.hotels FOR SELECT TO authenticated USING (get_user_role_id() IS NOT NULL);
CREATE POLICY hotels_insert ON public.hotels FOR INSERT TO authenticated WITH CHECK (get_user_role_id() = 5);
CREATE POLICY hotels_update ON public.hotels FOR UPDATE TO authenticated USING (get_user_role_id() = 5) WITH CHECK (get_user_role_id() = 5);
CREATE POLICY hotels_delete ON public.hotels FOR DELETE TO authenticated USING (get_user_role_id() = 5);

-- pricing_seasons
ALTER TABLE public.pricing_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY pricing_seasons_read   ON public.pricing_seasons FOR SELECT TO authenticated USING (get_user_role_id() IS NOT NULL);
CREATE POLICY pricing_seasons_insert ON public.pricing_seasons FOR INSERT TO authenticated WITH CHECK (get_user_role_id() = 5);
CREATE POLICY pricing_seasons_update ON public.pricing_seasons FOR UPDATE TO authenticated USING (get_user_role_id() = 5) WITH CHECK (get_user_role_id() = 5);
CREATE POLICY pricing_seasons_delete ON public.pricing_seasons FOR DELETE TO authenticated USING (get_user_role_id() = 5);

-- room_cleaning_reset_log (append-only, written by SECURITY DEFINER trigger)
ALTER TABLE public.room_cleaning_reset_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY room_cleaning_reset_log_read   ON public.room_cleaning_reset_log FOR SELECT TO authenticated USING (get_user_role_id() IS NOT NULL);
CREATE POLICY room_cleaning_reset_log_delete ON public.room_cleaning_reset_log FOR DELETE TO authenticated USING (get_user_role_id() = 5);

-- room_pricing
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY room_pricing_read   ON public.room_pricing FOR SELECT TO authenticated USING (get_user_role_id() IS NOT NULL);
CREATE POLICY room_pricing_insert ON public.room_pricing FOR INSERT TO authenticated WITH CHECK (get_user_role_id() = 5);
CREATE POLICY room_pricing_update ON public.room_pricing FOR UPDATE TO authenticated USING (get_user_role_id() = 5) WITH CHECK (get_user_role_id() = 5);
CREATE POLICY room_pricing_delete ON public.room_pricing FOR DELETE TO authenticated USING (get_user_role_id() = 5);

-- room_types
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY room_types_read   ON public.room_types FOR SELECT TO authenticated USING (get_user_role_id() IS NOT NULL);
CREATE POLICY room_types_insert ON public.room_types FOR INSERT TO authenticated WITH CHECK (get_user_role_id() = 5);
CREATE POLICY room_types_update ON public.room_types FOR UPDATE TO authenticated USING (get_user_role_id() = 5) WITH CHECK (get_user_role_id() = 5);
CREATE POLICY room_types_delete ON public.room_types FOR DELETE TO authenticated USING (get_user_role_id() = 5);

-- reservation_statuses
ALTER TABLE public.reservation_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY reservation_statuses_read   ON public.reservation_statuses FOR SELECT TO authenticated USING (get_user_role_id() IS NOT NULL);
CREATE POLICY reservation_statuses_insert ON public.reservation_statuses FOR INSERT TO authenticated WITH CHECK (get_user_role_id() = 5);
CREATE POLICY reservation_statuses_update ON public.reservation_statuses FOR UPDATE TO authenticated USING (get_user_role_id() = 5) WITH CHECK (get_user_role_id() = 5);
CREATE POLICY reservation_statuses_delete ON public.reservation_statuses FOR DELETE TO authenticated USING (get_user_role_id() = 5);
