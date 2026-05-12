-- Lint: 0014_extension_in_public
-- Move pg_trgm out of public into the dedicated `extensions` schema (already exists
-- in every Supabase project). The dependent index `idx_labels_name_search` keeps its
-- OID reference to the operator class, so no rebuild is needed.

ALTER EXTENSION pg_trgm SET SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
