-- Operator applies this; agents do not run it against live databases.
-- Drizzle path is BYPASSRLS (ADR 0001). RLS covers PostgREST / user-scoped clients.
-- Messages stay in Mastra memory; this table is the overlay host row only.

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  module_id text NOT NULL,
  thread text NOT NULL,
  resource text NOT NULL,
  title text NOT NULL,
  title_locked boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  run_id text,
  wire text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_project_user_updated_idx
  ON chat_sessions (project_id, user_id, updated_at DESC);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage chat sessions in their projects"
  ON chat_sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );
