-- Lint: 0011_function_search_path_mutable (17 functions)
-- Lock down search_path so unqualified references inside the bodies can no longer be
-- redirected by a malicious session. Using `public, pg_temp` instead of an empty string
-- because several function bodies reference unqualified public tables; this satisfies
-- the lint without rewriting every body.

ALTER FUNCTION public.auto_normalize_reservation()                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_child_age()                                              SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_line_item_totals()                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_payment_amounts()                                        SET search_path = public, pg_temp;
ALTER FUNCTION public.check_tables_exist(table_names text[])                             SET search_path = public, pg_temp;
ALTER FUNCTION public.get_next_available_virtual_room(p_check_in date, p_check_out date) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_room_price(p_room_id integer, p_date date)                     SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role_id()                                                 SET search_path = public, pg_temp;
ALTER FUNCTION public.log_audit_entry(
  p_user_id uuid, p_action text, p_table_name text, p_record_id integer,
  p_description text, p_old_values jsonb, p_new_values jsonb
)                                                                                        SET search_path = public, pg_temp;
ALTER FUNCTION public.migrate_all_reservations_to_daily_details()                        SET search_path = public, pg_temp;
ALTER FUNCTION public.migrate_enumeration_data()                                         SET search_path = public, pg_temp;
ALTER FUNCTION public.migrate_reservation_guests()                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.migrate_reservation_to_daily_details(p_reservation_id integer)     SET search_path = public, pg_temp;
ALTER FUNCTION public.reset_daily_room_cleaning()                                        SET search_path = public, pg_temp;
ALTER FUNCTION public.reset_daily_room_cleaning(trigger_source text)                     SET search_path = public, pg_temp;
ALTER FUNCTION public.set_current_user_for_audit(user_uuid uuid)                         SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column()                                         SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_room_401_booking()                                        SET search_path = public, pg_temp;
