-- Admin-configurable per-role model routing (OpenRouter model ids).
-- One row per slot ('default', 'author', 'chat', 'game-design', 'judging', ...).
-- Writes are gated by the admin API (isAdminUser email check) via the server
-- connection; regular clients may only read.

CREATE TABLE IF NOT EXISTS model_settings (
  role TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE model_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read the model config (the app/UI surfaces it).
CREATE POLICY "Authenticated can read model settings"
  ON model_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- No client INSERT/UPDATE/DELETE policies: writes go through the server
-- (service-role / DATABASE_URL connection) after the admin API verifies the
-- caller is an admin (NEXT_PUBLIC_CENTRAL_USERS).

COMMENT ON TABLE model_settings IS 'Admin-configurable per-role model routing (OpenRouter ids). Writes gated by the admin API.';
COMMENT ON COLUMN model_settings.role IS 'Model slot: default | chat | author | planner | premise | critic | muse | game-design | loop-creator | judging';
COMMENT ON COLUMN model_settings.model IS 'OpenRouter model id in provider/model form, e.g. openai/gpt-5.6-luna or openrouter/auto-beta';
