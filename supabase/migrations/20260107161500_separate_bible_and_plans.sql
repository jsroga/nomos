-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

CREATE TABLE IF NOT EXISTS series_bibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS story_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(project_id)
);

-- Migrate Data
INSERT INTO series_bibles (project_id, content) 
SELECT id, series_bible FROM projects WHERE series_bible IS NOT NULL
ON CONFLICT (project_id) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO story_plans (project_id, content)
SELECT id, story_plan FROM projects WHERE story_plan IS NOT NULL
ON CONFLICT (project_id) DO UPDATE SET content = EXCLUDED.content;

-- Enable RLS
ALTER TABLE series_bibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_plans ENABLE ROW LEVEL SECURITY;

-- Policies for series_bibles
CREATE POLICY "Users can view series bibles of own projects" ON series_bibles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = series_bibles.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert series bibles for own projects" ON series_bibles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = series_bibles.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update series bibles of own projects" ON series_bibles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = series_bibles.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete series bibles of own projects" ON series_bibles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = series_bibles.project_id AND projects.user_id = auth.uid())
  );

-- Policies for story_plans
CREATE POLICY "Users can view story plans of own projects" ON story_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = story_plans.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert story plans for own projects" ON story_plans
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = story_plans.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update story plans of own projects" ON story_plans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = story_plans.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete story plans of own projects" ON story_plans
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = story_plans.project_id AND projects.user_id = auth.uid())
  );
