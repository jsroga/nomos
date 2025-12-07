-- Add premise and thematic_focus columns to episodes table
ALTER TABLE "episodes" ADD COLUMN IF NOT EXISTS "premise" text;
ALTER TABLE "episodes" ADD COLUMN IF NOT EXISTS "thematic_focus" text;
