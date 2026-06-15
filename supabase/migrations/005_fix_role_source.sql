-- =============================================================
-- Fix current_user_role() to read from app_metadata, not user_metadata.
--
-- user_metadata is client-writable (supabase.auth.updateUser()).
-- app_metadata can only be set by the service role (admin).
-- Using user_metadata for authorization is a privilege-escalation risk.
-- =============================================================

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;
