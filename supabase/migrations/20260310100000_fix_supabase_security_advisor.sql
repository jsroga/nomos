-- Fix Supabase Security Advisor findings:
-- 1. RLS disabled on Mastra tables (public.mastra_*)
-- 2. Extension in public (public.vector -> extensions)
-- 3. Function search_path mutable (trigger_set_timestamps, update_game_entities_updated_at, update_market_analysis_timestamp)

-- =============================================================================
-- 1. Enable RLS on Mastra tables (created by @mastra/pg / Mastra SDK)
--    No permissive policies = only service_role (backend) can access.
-- =============================================================================
DO $$
DECLARE
  t text;
  mastra_tables text[] := ARRAY[
    'mastra_agent_versions', 'mastra_agents', 'mastra_ai_spans', 'mastra_messages',
    'mastra_observational_memory', 'mastra_resources', 'mastra_scorers',
    'mastra_threads', 'mastra_workflow_snapshot'
  ];
BEGIN
  FOREACH t IN ARRAY mastra_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- 2. Move vector extension from public to extensions schema
--    If ALTER EXTENSION fails (e.g. not owner), enable the extension in
--    extensions schema via Dashboard: Database -> Extensions -> vector -> enable in extensions.
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extension to extensions schema (may fail on Supabase if not extension owner)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension e
    JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION vector SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not move vector to extensions schema (insufficient privilege). Enable vector in extensions schema via Dashboard.';
END $$;

-- Ensure roles can use extensions schema for type resolution
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- So that unqualified "vector" type resolves after move
ALTER ROLE anon SET search_path TO public, extensions;
ALTER ROLE authenticated SET search_path TO public, extensions;
ALTER ROLE service_role SET search_path TO public, extensions;

-- =============================================================================
-- 3. Set immutable search_path on functions (CVE-2018-1058 mitigation)
-- =============================================================================

-- trigger_set_timestamps (may not exist in this project)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'trigger_set_timestamps'
  ) THEN
    ALTER FUNCTION public.trigger_set_timestamps() SET search_path = public;
  END IF;
END $$;

-- update_game_entities_updated_at
CREATE OR REPLACE FUNCTION public.update_game_entities_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_market_analysis_timestamp
CREATE OR REPLACE FUNCTION public.update_market_analysis_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
