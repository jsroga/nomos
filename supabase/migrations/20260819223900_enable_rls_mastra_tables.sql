-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- Lock down Mastra store tables in public (PostgresStoreVNext + Studio).
-- RLS on with no anon/authenticated policies: PostgREST cannot read rows.
-- Table owner / service_role still access (Mastra uses DATABASE_URL, not PostgREST).
-- Future mastra_* tables (including daily observability partitions) get the same
-- treatment from the event trigger below.

CREATE OR REPLACE FUNCTION public.enable_rls_on_mastra_tables()
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
      AND c.relkind IN ('r', 'p')
      AND c.relname LIKE 'mastra\_%' ESCAPE '\'
      AND NOT COALESCE(d.in_extension, false)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = r.relname
        AND NOT c.relrowsecurity
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', r.relname);
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS enable_rls_on_mastra_tables;

CREATE EVENT TRIGGER enable_rls_on_mastra_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'ALTER TABLE')
  EXECUTE FUNCTION public.enable_rls_on_mastra_tables();

REVOKE ALL ON FUNCTION public.enable_rls_on_mastra_tables() FROM PUBLIC;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname LIKE 'mastra\_%' ESCAPE '\'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', r.relname);
    END IF;
  END LOOP;
END $$;
