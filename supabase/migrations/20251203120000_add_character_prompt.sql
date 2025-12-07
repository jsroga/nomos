-- Add character_prompt column to characters table
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS character_prompt text;

