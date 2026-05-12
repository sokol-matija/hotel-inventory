-- Lint 0010_security_definer_view (4 views)
-- Switch each view to SECURITY INVOKER so RLS on the underlying tables applies based on
-- the *querying* user, not the view's owner.  We've already enabled RLS on every base
-- table these views read from with authenticated-can-read policies, so staff queries
-- continue to work.

ALTER VIEW public.guest_stats                   SET (security_invoker = true);
ALTER VIEW public.reservations_with_enums       SET (security_invoker = true);
ALTER VIEW public.reservation_with_all_guests   SET (security_invoker = true);
ALTER VIEW public.rooms_with_enums              SET (security_invoker = true);
