-- Add gender column to characters table
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS gender text;

