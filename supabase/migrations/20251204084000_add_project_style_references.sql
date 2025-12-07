-- Add style reference URLs to projects table for Midjourney portrait generation
-- These URLs are sent with the --sref parameter to influence the artistic style

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS style_reference_urls jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN projects.style_reference_urls IS 'Array of Midjourney --sref image URLs for character portrait style consistency';
