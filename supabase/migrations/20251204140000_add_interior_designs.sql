-- Create interior_designs table for the Interior Designer domain
CREATE TABLE interior_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  scene_data jsonb NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Add index for faster project queries
CREATE INDEX idx_interior_designs_project_id ON interior_designs(project_id);
CREATE INDEX idx_interior_designs_user_id ON interior_designs(user_id);
