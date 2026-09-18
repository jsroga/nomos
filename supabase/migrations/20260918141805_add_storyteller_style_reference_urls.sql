-- Storyteller style refs are independent of 2D Canvas style_reference_urls.

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS storyteller_style_reference_urls jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN projects.storyteller_style_reference_urls IS
  'Array of style-reference image URLs for Storyteller portraits, posters, and moodboards';
