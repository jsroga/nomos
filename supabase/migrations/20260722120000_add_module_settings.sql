-- Admin-configurable canvas module settings (Track A2).
-- One row per canvas module (loop-creator, storyteller-corkboard, world-building, …).
-- Overrides the catalog defaults in CANVAS_MODULES: enable/disable, canvas
-- placement, and a per-module config blob (e.g. { modelRole }).
-- Writes are gated by the admin API (isAdminUser email check) via the server
-- connection; regular clients may only read.

CREATE TABLE IF NOT EXISTS module_settings (
  module_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  canvas_slot TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE module_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read module config (the canvas host surfaces it).
CREATE POLICY "Authenticated can read module settings"
  ON module_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- No client INSERT/UPDATE/DELETE policies: writes go through the server
-- (service-role / DATABASE_URL connection) after the admin API verifies the
-- caller is an admin (NEXT_PUBLIC_CENTRAL_USERS).

COMMENT ON TABLE module_settings IS 'Admin-configurable canvas module settings (enable/placement/config). Writes gated by the admin API.';
COMMENT ON COLUMN module_settings.module_key IS 'Canvas module key from CANVAS_MODULES (loop-creator, storyteller-corkboard, …).';
COMMENT ON COLUMN module_settings.config IS 'Per-module override blob, e.g. { "modelRole": "chat" }.';
