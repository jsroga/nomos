-- Add story_plan column to episodes table for storing 8-sequence structure
-- This allows each episode to have its own story plan

ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS story_plan JSONB DEFAULT NULL;

-- Add story_plan to projects for series-level planning
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS story_plan JSONB DEFAULT NULL;

-- Add plan_approved flag to track if the plan has been approved
ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS plan_approved BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_episodes_plan_approved ON public.episodes(plan_approved);

-- Add comment explaining the structure
COMMENT ON COLUMN public.episodes.story_plan IS 'JSON object containing 8-sequence story structure: {title, genre, tone, centralQuestion, protagonist, antagonist, sequences[], themes[]}';
COMMENT ON COLUMN public.projects.story_plan IS 'Series-level story plan that applies to all episodes';



