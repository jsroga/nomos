-- Add character metrics columns
ALTER TABLE characters ADD COLUMN IF NOT EXISTS trust_level integer DEFAULT 50;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS power_level integer DEFAULT 30;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS morality_level integer DEFAULT 50;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS hope_level integer DEFAULT 60;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS isolation_level integer DEFAULT 20;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS transformation_progress integer DEFAULT 0;



