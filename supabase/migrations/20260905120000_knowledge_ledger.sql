-- Operator applies this; agents do not run it against live databases.
-- Drizzle path is BYPASSRLS (ADR 0001). RLS covers PostgREST / user-scoped clients.

CREATE TABLE IF NOT EXISTS knowledge_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL,
  beat_id uuid REFERENCES beats(id) ON DELETE SET NULL,
  fact_text text NOT NULL,
  author_truth boolean NOT NULL DEFAULT false,
  known_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_ledger_project_idx ON knowledge_ledger (project_id);

ALTER TABLE knowledge_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage knowledge ledger in their projects"
  ON knowledge_ledger FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS promoted_project_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  rule_text text NOT NULL,
  consequence text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  revoked_at timestamptz,
  promoted_from text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promoted_project_rules_project_idx ON promoted_project_rules (project_id);

ALTER TABLE promoted_project_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage promoted project rules in their projects"
  ON promoted_project_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );
