-- Performance indexes migration
-- Adds indexes on frequently queried foreign keys to improve query performance

-- =============================================================================
-- Core Schema Indexes (src/db/schema.ts)
-- =============================================================================

-- Game Entities - heavily queried for cross-domain lookups
CREATE INDEX IF NOT EXISTS idx_game_entities_project_id ON game_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_game_entities_source_domain ON game_entities(source_domain);
CREATE INDEX IF NOT EXISTS idx_game_entities_entity_type ON game_entities(entity_type);

-- Entity Relationships - for graph queries
CREATE INDEX IF NOT EXISTS idx_entity_relationships_project_id ON entity_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_from_entity ON entity_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_to_entity ON entity_relationships(to_entity_id);

-- Tiles - for project tile lookups
CREATE INDEX IF NOT EXISTS idx_tiles_project_id ON tiles(project_id);

-- Assets - for project asset lookups
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);

-- Interior Designs - for project design lookups
CREATE INDEX IF NOT EXISTS idx_interior_designs_project_id ON interior_designs(project_id);
CREATE INDEX IF NOT EXISTS idx_interior_designs_user_id ON interior_designs(user_id);

-- Game Loops - for project loop lookups
CREATE INDEX IF NOT EXISTS idx_game_loops_project_id ON game_loops(project_id);
CREATE INDEX IF NOT EXISTS idx_game_loops_user_id ON game_loops(user_id);

-- =============================================================================
-- Market Analysis Indexes (10 related tables)
-- =============================================================================

-- Main market analyses table
CREATE INDEX IF NOT EXISTS idx_market_analyses_game_loop_id ON market_analyses(game_loop_id);
CREATE INDEX IF NOT EXISTS idx_market_analyses_user_id ON market_analyses(user_id);

-- Reference scores
CREATE INDEX IF NOT EXISTS idx_market_analysis_reference_scores_analysis_id 
  ON market_analysis_reference_scores(market_analysis_id);

-- Market size
CREATE INDEX IF NOT EXISTS idx_market_analysis_market_size_analysis_id 
  ON market_analysis_market_size(market_analysis_id);

-- Audience fit
CREATE INDEX IF NOT EXISTS idx_market_analysis_audience_fit_analysis_id 
  ON market_analysis_audience_fit(market_analysis_id);

-- Competitors
CREATE INDEX IF NOT EXISTS idx_market_analysis_competitors_analysis_id 
  ON market_analysis_competitors(market_analysis_id);

-- Trends
CREATE INDEX IF NOT EXISTS idx_market_analysis_trends_analysis_id 
  ON market_analysis_trends(market_analysis_id);

-- Patterns
CREATE INDEX IF NOT EXISTS idx_market_analysis_patterns_analysis_id 
  ON market_analysis_patterns(market_analysis_id);

-- Primary archetype
CREATE INDEX IF NOT EXISTS idx_market_analysis_primary_archetype_analysis_id 
  ON market_analysis_primary_archetype(market_analysis_id);

-- Momentum
CREATE INDEX IF NOT EXISTS idx_market_analysis_momentum_analysis_id 
  ON market_analysis_momentum(market_analysis_id);

-- Genre momentum (references momentum table)
CREATE INDEX IF NOT EXISTS idx_market_analysis_genre_momentum_id 
  ON market_analysis_genre_momentum(momentum_id);

-- Social buzz (references momentum table)
CREATE INDEX IF NOT EXISTS idx_market_analysis_social_buzz_momentum_id 
  ON market_analysis_social_buzz(momentum_id);

-- Rising competitors (references momentum table)
CREATE INDEX IF NOT EXISTS idx_market_analysis_rising_competitors_momentum_id 
  ON market_analysis_rising_competitors(momentum_id);

-- =============================================================================
-- Storyteller Schema Indexes (src/domains/storyteller/db/schema.ts)
-- =============================================================================

-- Characters - for project character lookups
CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);

-- Episodes - for project episode lookups and ordering
CREATE INDEX IF NOT EXISTS idx_episodes_project_id ON episodes(project_id);
CREATE INDEX IF NOT EXISTS idx_episodes_sequence ON episodes(project_id, sequence);

-- Beats - for episode beat lookups and ordering
CREATE INDEX IF NOT EXISTS idx_beats_episode_id ON beats(episode_id);
CREATE INDEX IF NOT EXISTS idx_beats_sequence ON beats(episode_id, sequence);

-- Setups/Payoffs - for causality tracking
CREATE INDEX IF NOT EXISTS idx_setups_project_id ON setups(project_id);
CREATE INDEX IF NOT EXISTS idx_setups_setup_beat_id ON setups(setup_beat_id);
CREATE INDEX IF NOT EXISTS idx_setups_payoff_beat_id ON setups(payoff_beat_id);

-- Document Embeddings - for RAG retrieval (critical for vector search performance)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_project_id ON document_embeddings(project_id);
-- Note: Vector index (HNSW) should be created separately if using pgvector
-- CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector ON document_embeddings 
--   USING hnsw (embedding vector_cosine_ops);

-- Series Bibles - for project bible lookups
CREATE INDEX IF NOT EXISTS idx_series_bibles_project_id ON series_bibles(project_id);

-- Story Plans - for project plan lookups
CREATE INDEX IF NOT EXISTS idx_story_plans_project_id ON story_plans(project_id);

-- =============================================================================
-- Composite indexes for common query patterns
-- =============================================================================

-- Game entities by project and type (common filter combination)
CREATE INDEX IF NOT EXISTS idx_game_entities_project_type 
  ON game_entities(project_id, entity_type);

-- Beats by episode and status (for filtering approved/locked beats)
CREATE INDEX IF NOT EXISTS idx_beats_episode_status 
  ON beats(episode_id, status);

-- Episodes by project and status
CREATE INDEX IF NOT EXISTS idx_episodes_project_status 
  ON episodes(project_id, status);
