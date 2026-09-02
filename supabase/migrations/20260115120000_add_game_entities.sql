-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- Game Entities - Cross-Domain Entity System
-- This enables the "Swiss Army Knife" vision by connecting entities across all domains

-- Create game_entities table
CREATE TABLE IF NOT EXISTS game_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Core entity data
  entity_type TEXT NOT NULL, -- 'character' | 'location' | 'mechanic' | 'faction' | 'item' | 'quest'
  name TEXT NOT NULL,
  description TEXT,
  
  -- Domain tracking
  source_domain TEXT NOT NULL, -- 'storyteller' | 'loop-creator' | 'interior-designer' | 'world-building'
  source_entity_id UUID, -- ID in the source domain's table
  used_in_domains TEXT[] DEFAULT '{}', -- ['storyteller', 'loop-creator']
  
  -- Rich metadata from source domain
  metadata JSONB DEFAULT '{}',
  
  -- Search and display
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create entity_relationships table
CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  from_entity_id UUID NOT NULL REFERENCES game_entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES game_entities(id) ON DELETE CASCADE,
  
  relationship_type TEXT NOT NULL, -- 'uses' | 'located_in' | 'conflicts_with' | 'allies_with' | 'owns'
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_entities_project_id ON game_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_game_entities_entity_type ON game_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_game_entities_source_domain ON game_entities(source_domain);
CREATE INDEX IF NOT EXISTS idx_game_entities_name_search ON game_entities USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_entity_relationships_project_id ON entity_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_from_entity ON entity_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_to_entity ON entity_relationships(to_entity_id);

-- Enable RLS
ALTER TABLE game_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_entities
CREATE POLICY "Users can view entities in their projects"
  ON game_entities FOR SELECT
  USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert entities in their projects"
  ON game_entities FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update entities in their projects"
  ON game_entities FOR UPDATE
  USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete entities in their projects"
  ON game_entities FOR DELETE
  USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for entity_relationships
CREATE POLICY "Users can view relationships in their projects"
  ON entity_relationships FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert relationships in their projects"
  ON entity_relationships FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update relationships in their projects"
  ON entity_relationships FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete relationships in their projects"
  ON entity_relationships FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_game_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_entities_updated_at
  BEFORE UPDATE ON game_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_game_entities_updated_at();

