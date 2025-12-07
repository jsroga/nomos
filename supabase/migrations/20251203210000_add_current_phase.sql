-- Add current_phase column to episodes table
ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'premise';

-- Add constraint for valid phases
ALTER TABLE public.episodes
ADD CONSTRAINT valid_phase CHECK (current_phase IN ('premise', 'breaking', 'cardlock', 'writing', 'complete'));

COMMENT ON COLUMN public.episodes.current_phase IS 'Current story phase: premise, breaking, cardlock, writing, complete';



