-- Lint 0028/0029: SECURITY DEFINER functions executable by anon/authenticated.
--
-- Internal helpers (audit triggers, audit-log inserters, session-context setters,
-- inventory logger) -> revoke EXECUTE from anon AND authenticated.  These are
-- only called from triggers / SQL bodies that run as definer; the REST API surface
-- must never reach them.
-- get_user_role_id() -> switch to SECURITY INVOKER (only reads the caller's own
-- user_profiles row, which RLS already permits).
-- get_next_available_virtual_room() -> revoke anon; keep authenticated grant because
-- VirtualRoomService.ts calls it via supabase.rpc() during booking. Left as
-- SECURITY DEFINER because it INSERTs new "virtual" rooms and we don't want every
-- authenticated user to also have direct INSERT on rooms.

-- Internal helpers: lock down completely
REVOKE EXECUTE ON FUNCTION public.audit_trigger_function()                                FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_audit_entry(uuid, text, text, integer, text, jsonb, jsonb)
                                                                                          FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_inventory_quantity_update(integer, text, integer, integer, text)
                                                                                          FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_current_user_for_audit(uuid)                        FROM anon, authenticated, public;

-- get_user_role_id: convert to invoker, drop anon grant
ALTER  FUNCTION public.get_user_role_id() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_user_role_id() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_user_role_id() TO   authenticated, service_role;

-- get_next_available_virtual_room: keep definer (needs to INSERT rooms), drop anon
REVOKE EXECUTE ON FUNCTION public.get_next_available_virtual_room(p_check_in date, p_check_out date)
                                                FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_next_available_virtual_room(p_check_in date, p_check_out date)
                                                TO   authenticated, service_role;
