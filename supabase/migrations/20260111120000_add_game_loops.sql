-- Create game_loops table for Loop Creator
CREATE TABLE IF NOT EXISTS game_loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB,
  analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_game_loops_project_id ON game_loops(project_id);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_game_loops_user_id ON game_loops(user_id);

-- Enable Row Level Security
ALTER TABLE game_loops ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own game loops
CREATE POLICY "Users can view own game loops"
  ON game_loops
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own game loops
CREATE POLICY "Users can insert own game loops"
  ON game_loops
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own game loops
CREATE POLICY "Users can update own game loops"
  ON game_loops
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own game loops
CREATE POLICY "Users can delete own game loops"
  ON game_loops
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_game_loops_updated_at ON game_loops;
CREATE TRIGGER update_game_loops_updated_at
  BEFORE UPDATE ON game_loops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


