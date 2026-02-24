-- Add style_preset column to projects table
-- When set, overrides style_reference_urls with predefined preset URLs
ALTER TABLE projects ADD COLUMN IF NOT EXISTS style_preset TEXT;
