-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- =============================================================================
-- Add relationship_edges table
-- 
-- Stores pre-computed, LLM-extracted relationship edges for the character web.
-- The relationships/route.ts reads from this table first (cheap DB read),
-- falling back to live LLM extraction only when the table is empty for a project.
--
-- Distinct from relationship_snapshots which tracks per-beat evolution.
-- This table tracks the authoritative, current relationship graph.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.relationship_edges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Source and target use canonical entity IDs from entity_references.id
  -- or the slug-based IDs used for characters/factions outside that table
  source_id     text NOT NULL,
  target_id     text NOT NULL,

  -- Relationship semantics
  relationship_type text NOT NULL,  -- ally, enemy, rival, mentor, member_of, etc.
  weight        real NOT NULL DEFAULT 0.5,    -- 0.0–1.0 edge strength
  label         text,                          -- Human-readable label ("Rivals", "Mentor to")

  -- LLM extraction provenance
  evidence      text,       -- Quote or paraphrase of story text that evidences this edge
  llm_grounded  boolean NOT NULL DEFAULT false,
  confidence    real,        -- LLM confidence 0.0–1.0

  -- Temporal awareness (for future timeline scrubbing)
  since_beat_id uuid REFERENCES public.beats(id) ON DELETE SET NULL,
  until_beat_id uuid REFERENCES public.beats(id) ON DELETE SET NULL,

  extracted_at  timestamp with time zone NOT NULL DEFAULT now(),
  created_at    timestamp with time zone NOT NULL DEFAULT now(),

  -- One edge per (project, source, target, type) tuple
  UNIQUE (project_id, source_id, target_id, relationship_type)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

-- Primary read pattern: fetch all edges for a project graph
CREATE INDEX IF NOT EXISTS relationship_edges_project_id_idx
  ON public.relationship_edges (project_id);

-- Temporal queries: find edges active at a given beat
CREATE INDEX IF NOT EXISTS relationship_edges_since_beat_idx
  ON public.relationship_edges (since_beat_id) WHERE since_beat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS relationship_edges_until_beat_idx
  ON public.relationship_edges (until_beat_id) WHERE until_beat_id IS NOT NULL;

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.relationship_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage relationship edges in their projects"
  ON public.relationship_edges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

-- ─── Comment ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.relationship_edges IS
  'Pre-computed relationship graph edges for the CharacterWeb visualisation. '
  'LLM-extracted edges include textual evidence from story beats. '
  'Refreshed on relationship API calls; since_beat_id/until_beat_id enable temporal scrubbing.';
