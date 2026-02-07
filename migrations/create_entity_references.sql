-- Create entity_references table for GraphRAG entity tracking
-- This table stores all referenceable entities with embeddings for smart context assembly

CREATE TABLE IF NOT EXISTS entity_references (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_entity_id UUID,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_referenced_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for fast lookups by project
CREATE INDEX IF NOT EXISTS idx_entity_references_project ON entity_references(project_id);

-- Index for fast lookups by type
CREATE INDEX IF NOT EXISTS idx_entity_references_type ON entity_references(type);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_entity_references_embedding ON entity_references 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;
