-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- Enable RLS on all public tables flagged by Supabase linter
-- Some tables already had RLS enabled in prior migrations but may have been
-- reset; ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent.

-- ============================================================================
-- 1. relationship_snapshots — has project_id, needs user-scoped policy
-- ============================================================================
ALTER TABLE public.relationship_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage relationship snapshots in their projects"
  ON public.relationship_snapshots FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );

-- ============================================================================
-- 2. entity_references — has project_id, needs user-scoped policy
-- ============================================================================
ALTER TABLE public.entity_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage entity references in their projects"
  ON public.entity_references FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );

-- ============================================================================
-- 3. series_bibles & story_plans — re-enable RLS (policies already exist)
-- ============================================================================
ALTER TABLE public.series_bibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. LangGraph checkpoint tables — no user/project columns.
--    Enable RLS with no anon/authenticated policies so PostgREST cannot
--    access them. The backend uses service_role which bypasses RLS.
-- ============================================================================
ALTER TABLE public.checkpoint_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_writes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. game_design_patterns — Mastra PgVector table, same treatment
-- ============================================================================
ALTER TABLE public.game_design_patterns ENABLE ROW LEVEL SECURITY;
