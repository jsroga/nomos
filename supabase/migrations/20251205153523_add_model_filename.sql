-- Add model_filename column to assets table
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS model_filename TEXT;

