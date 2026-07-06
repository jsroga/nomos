-- Sync schema gaps previously only in Drizzle migrations (drizzle/0000, drizzle/0003).
-- Supabase is the single DDL source going forward.

-- entity_references: created ad-hoc before; formalize here for fresh installs.
CREATE TABLE IF NOT EXISTS public.entity_references (
  id text PRIMARY KEY NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_entity_id uuid,
  embedding vector(1536),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_referenced_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entity_references_project_id_idx
  ON public.entity_references (project_id);

-- relationship_snapshots: columns from drizzle/0003_new_shocker.sql
ALTER TABLE public.relationship_snapshots
  ALTER COLUMN relationship_type DROP NOT NULL;

ALTER TABLE public.relationship_snapshots
  ADD COLUMN IF NOT EXISTS dynamic_summary text;

ALTER TABLE public.relationship_snapshots
  ADD COLUMN IF NOT EXISTS tension_points jsonb DEFAULT '[]'::jsonb;
