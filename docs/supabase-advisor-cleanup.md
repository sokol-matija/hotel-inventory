# Supabase Advisor Cleanup — May 2026

## Starting State
- **Security:** 45 lints — 11 ERROR, 34 WARN
- **Performance:** 128 lints — 76 WARN, 52 INFO

## Final State (after migrations 20260512000001..09)
- **Security:** 4 WARN, 0 ERROR
- **Performance:** ~52 INFO (all `unused_index` — stats freshly reset, see below)

## Migrations Applied

| # | File | Lint | Effect |
|---|---|---|---|
| 001 | `harden_function_search_path.sql` | 0011 | Pinned `search_path = public, pg_temp` on 17 functions |
| 002 | `add_unindexed_fk_indexes.sql` | 0001 | Added 4 btree indexes on FK columns |
| 003 | `move_pg_trgm_to_extensions_schema.sql` | 0014 | Moved `pg_trgm` from `public` → `extensions` |
| 004 | `lockdown_security_definer_functions.sql` | 0028/0029 | Revoked anon+auth EXECUTE on 4 internal helpers; converted `get_user_role_id` to INVOKER; kept `get_next_available_virtual_room` as DEFINER but anon-revoked |
| 005 | `wrap_auth_uid_in_rls_policies.sql` | 0003 | Wrapped `auth.uid()` in `(select auth.uid())` across 9 policies (audit_logs, user_profiles, labels) |
| 006 | `split_write_policies_to_eliminate_select_overlap.sql` | 0006 | Replaced 11 `*_write FOR ALL` policies with explicit `_insert / _update / _delete` so `*_read` is the sole SELECT policy |
| 007 | `merge_audit_logs_select_policies.sql` | 0006 | Merged "admin can see all" + "user can see own" SELECT policies into one OR predicate |
| 008 | `enable_rls_on_public_lookup_tables.sql` | 0013 | Enabled RLS on 7 reference tables with authenticated-read / admin-write policies |
| 009 | `views_to_security_invoker.sql` | 0010 | Set `security_invoker = true` on 4 views |

## Residual WARNs (intentional / manual)

1. **`authenticated_security_definer_function_executable` — `get_next_available_virtual_room`**: kept as DEFINER because the function INSERTs new "virtual" rooms; we don't want to grant every staff user direct INSERT on `rooms`. The function is only callable by authenticated and is audited via trigger.
2. **`auth_otp_long_expiry`**: dashboard setting — Auth → Email → OTP expiry. Reduce to ≤ 1 hour.
3. **`auth_leaked_password_protection`**: dashboard setting — Auth → Policies → enable HaveIBeenPwned check.
4. **`vulnerable_postgres_version`**: schedule database upgrade in dashboard during a maintenance window (current `supabase-postgres-17.4.1.054` has security patches available).

## Why `unused_index` lints are not addressed

The advisor reports 52 indexes as "unused" (`idx_scan = 0`). Querying `pg_stat_user_indexes` shows that *every* index — including primary keys and unique constraints that the running app demonstrably uses — also has `idx_scan = 0`. The stats counters were reset recently (Postgres patch upgrade or admin action), so the data is not reliable.

**Decision:** do NOT drop any indexes from this report. Re-evaluate after ~30 days of accumulated stats.

## Verification Checklist

- [x] `mcp__supabase__get_advisors` security → 4 (all by design)
- [x] `mcp__supabase__get_advisors` performance → 0 WARN, only INFO unused_index
- [ ] Manual: log in as staff, drag-create a reservation on `/hotel/frontdesk`
- [ ] Manual: run `npm run validate:fast`
- [ ] Manual: dashboard fixes for the 3 auth/PG warnings
