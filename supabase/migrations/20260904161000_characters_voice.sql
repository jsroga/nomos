ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS voice jsonb NOT NULL DEFAULT '{}'::jsonb;
