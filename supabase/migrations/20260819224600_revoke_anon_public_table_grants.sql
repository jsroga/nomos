-- Unauthenticated clients must not discover public relations via pg_graphql or
-- PostgREST. Signed-in browser clients keep authenticated grants; Mastra and
-- server jobs keep service_role / table-owner access.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;

DO $$
BEGIN
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not change supabase_admin default privileges for anon';
END $$;

-- App does not use /graphql/v1. Dropping pg_graphql also clears authenticated
-- GraphQL schema exposure (lint 0027) without revoking signed-in PostgREST.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_graphql') THEN
    DROP EXTENSION pg_graphql CASCADE;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'graphql') THEN
      EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql FROM anon';
      EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql FROM authenticated';
      EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql FROM PUBLIC';
    END IF;
    RAISE NOTICE 'Could not drop pg_graphql; revoked graphql schema execute instead';
END $$;

-- supabase_admin default privileges still grant anon; strip it on every new
-- public table regardless of creator.
CREATE OR REPLACE FUNCTION public.revoke_anon_on_public_tables()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT c.relname
    FROM pg_event_trigger_ddl_commands() d
    JOIN pg_class c ON c.oid = d.objid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND NOT COALESCE(d.in_extension, false)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname);
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS revoke_anon_on_public_tables;

CREATE EVENT TRIGGER revoke_anon_on_public_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'CREATE VIEW', 'CREATE MATERIALIZED VIEW', 'CREATE FOREIGN TABLE', 'ALTER TABLE')
  EXECUTE FUNCTION public.revoke_anon_on_public_tables();

REVOKE ALL ON FUNCTION public.revoke_anon_on_public_tables() FROM PUBLIC;
