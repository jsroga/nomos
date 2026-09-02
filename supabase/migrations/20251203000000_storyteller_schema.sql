-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- Storyteller Domain Schema
-- Add new columns to projects table for storyteller
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS master_prompt text,
ADD COLUMN IF NOT EXISTS series_bible jsonb DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;

-- Characters Table
CREATE TABLE IF NOT EXISTS public.characters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    role text NOT NULL,
    mbti text,
    stress_level integer DEFAULT 0,
    voice_signature text,
    psychology jsonb DEFAULT '{}'::jsonb NOT NULL,
    arc_status jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
);

-- Episodes Table
CREATE TABLE IF NOT EXISTS public.episodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sequence integer NOT NULL,
    title text,
    master_prompt text,
    summary text,
    script_content text,
    status text DEFAULT 'planning',
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
);

-- Beats Table (Story beats / Index Cards)
CREATE TABLE IF NOT EXISTS public.beats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    sequence integer NOT NULL,
    logline text NOT NULL,
    beat_type text NOT NULL,
    content text,
    visual_hook text,
    characters_involved jsonb DEFAULT '[]'::jsonb,
    emotional_shifts jsonb DEFAULT '{}'::jsonb,
    causal_dependencies jsonb DEFAULT '[]'::jsonb,
    setups_payoffs jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'proposed',
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
);

-- Setups/Payoffs Table (Story causality tracking)
CREATE TABLE IF NOT EXISTS public.setups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    setup_beat_id uuid REFERENCES public.beats(id),
    payoff_beat_id uuid REFERENCES public.beats(id),
    description text NOT NULL,
    is_resolved boolean DEFAULT false,
    created_at timestamp DEFAULT now() NOT NULL
);

-- Enable pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Document Embeddings Table (RAG)
CREATE TABLE IF NOT EXISTS public.document_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    content text NOT NULL,
    metadata jsonb NOT NULL,
    embedding vector(1536),
    created_at timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_characters_project ON public.characters(project_id);
CREATE INDEX IF NOT EXISTS idx_episodes_project ON public.episodes(project_id);
CREATE INDEX IF NOT EXISTS idx_beats_episode ON public.beats(episode_id);
CREATE INDEX IF NOT EXISTS idx_setups_project ON public.setups(project_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_project ON public.document_embeddings(project_id);

-- RLS Policies for Storyteller tables
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- Characters RLS
CREATE POLICY "Users can manage characters in their projects" ON public.characters
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- Episodes RLS
CREATE POLICY "Users can manage episodes in their projects" ON public.episodes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- Beats RLS (through episodes -> projects)
CREATE POLICY "Users can manage beats in their episodes" ON public.beats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.episodes e
            JOIN public.projects p ON e.project_id = p.id
            WHERE e.id = episode_id AND p.user_id = auth.uid()
        )
    );

-- Setups RLS
CREATE POLICY "Users can manage setups in their projects" ON public.setups
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- Document Embeddings RLS
CREATE POLICY "Users can manage embeddings in their projects" ON public.document_embeddings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

