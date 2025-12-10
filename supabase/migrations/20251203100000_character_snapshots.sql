-- Character State Snapshots Table
-- Tracks character states at each beat for timeline navigation

CREATE TABLE IF NOT EXISTS public.character_state_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
    stress_level integer DEFAULT 0,
    knowledge_state jsonb DEFAULT '{}'::jsonb,
    emotional_state text,
    goals jsonb DEFAULT '[]'::jsonb,
    fears jsonb DEFAULT '[]'::jsonb,
    transformation_progress integer DEFAULT 0,
    notes text,
    created_at timestamp DEFAULT now() NOT NULL,
    
    -- Ensure one snapshot per character per beat
    UNIQUE(character_id, beat_id)
);

-- Index for efficient timeline queries
CREATE INDEX IF NOT EXISTS idx_snapshots_beat ON public.character_state_snapshots(beat_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_character ON public.character_state_snapshots(character_id);

-- Enable RLS
ALTER TABLE public.character_state_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage snapshots for characters in their projects
CREATE POLICY "Users can manage character snapshots" ON public.character_state_snapshots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.characters c
            JOIN public.projects p ON c.project_id = p.id
            WHERE c.id = character_id AND p.user_id = auth.uid()
        )
    );

