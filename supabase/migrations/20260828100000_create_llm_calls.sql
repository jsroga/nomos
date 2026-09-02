-- One row per paid model call.
--
-- Append-only, and deliberately with no foreign key to projects: a deleted
-- project must keep its cost history, or last month's spend changes when
-- someone tidies up.
--
-- No partitioning or retention policy at current volume. Revisit both if this
-- passes ~1M rows (docs/DECISIONS.md ADR 0003).
CREATE TABLE IF NOT EXISTS llm_calls (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id      text,
  project_id    uuid NOT NULL,
  user_id       text NOT NULL,
  feature       text NOT NULL,
  model         text NOT NULL,
  provider      text NOT NULL,
  prompt_tokens     integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  cached_tokens     integer NOT NULL DEFAULT 0,
  cost_usd      numeric(12, 6) NOT NULL DEFAULT 0,
  latency_ms    integer NOT NULL DEFAULT 0,
  outcome       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- The two questions this table exists to answer: what did a project cost, and
-- what did a feature cost, over a window.
CREATE INDEX IF NOT EXISTS llm_calls_project_created_idx ON llm_calls (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS llm_calls_feature_created_idx ON llm_calls (feature, created_at DESC);

ALTER TABLE llm_calls ENABLE ROW LEVEL SECURITY;

-- Written by the gateway through the service role only. No policy grants the
-- anon or authenticated roles access: spend is not tenant-readable data.
REVOKE ALL ON llm_calls FROM anon, authenticated;
