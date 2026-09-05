ALTER TABLE "episodes" ADD COLUMN IF NOT EXISTS "manuscript_mode" text NOT NULL DEFAULT 'script';
