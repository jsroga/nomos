-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- Market Analysis Tables
-- Properly normalized schema avoiding JSONB for structured data

-- Main market analysis record
CREATE TABLE market_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_loop_id UUID NOT NULL REFERENCES game_loops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Overall summary
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Arrays of insights (PostgreSQL native arrays, not JSON)
  recommendations TEXT[] DEFAULT '{}',
  risks TEXT[] DEFAULT '{}',
  opportunities TEXT[] DEFAULT '{}',
  sources_used TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reference game scores (hidden internal scores)
CREATE TABLE market_analysis_reference_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_analysis_id UUID NOT NULL REFERENCES market_analyses(id) ON DELETE CASCADE,
  
  disco_elysium_score INTEGER NOT NULL CHECK (disco_elysium_score >= 0 AND disco_elysium_score <= 100),
  vampire_survivors_score INTEGER NOT NULL CHECK (vampire_survivors_score >= 0 AND vampire_survivors_score <= 100),
  counter_strike_score INTEGER NOT NULL CHECK (counter_strike_score >= 0 AND counter_strike_score <= 100),
  
  -- Breakdown notes for each (stored as text, not JSON)
  disco_elysium_notes TEXT,
  vampire_survivors_notes TEXT,
  counter_strike_notes TEXT,
  
  UNIQUE (market_analysis_id)
);

-- Market size data
CREATE TABLE market_analysis_market_size (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_analysis_id UUID NOT NULL REFERENCES market_analyses(id) ON DELETE CASCADE,
  
  tam TEXT NOT NULL,              -- e.g., "$4.2B"
  sam TEXT NOT NULL,              -- e.g., "$1.8B"  
  relevant_segment TEXT NOT NULL, -- e.g., "$180M"
  growth_rate TEXT NOT NULL,      -- e.g., "18% YoY"
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources TEXT[] DEFAULT '{}',
  
  UNIQUE (market_analysis_id)
);

-- Audience fit analysis
CREATE TABLE market_analysis_audience_fit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_analysis_id UUID NOT NULL REFERENCES market_analyses(id) ON DELETE CASCADE,
  
  target_demographic TEXT NOT NULL,
  fit_score INTEGER NOT NULL CHECK (fit_score >= 0 AND fit_score <= 100),
  strengths TEXT[] DEFAULT '{}',
  concerns TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  
  UNIQUE (market_analysis_id)
);

-- Competitors (one-to-many)
CREATE TABLE market_analysis_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_analysis_id UUID NOT NULL REFERENCES market_analyses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  genre TEXT NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  player_count TEXT,
  similarity_score INTEGER NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 100),
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  market_position TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trends (one-to-many)
CREATE TABLE market_analysis_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_analysis_id UUID NOT NULL REFERENCES market_analyses(id) ON DELETE CASCADE,
  
  trend_name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('rising', 'stable', 'declining')),
  relevance INTEGER NOT NULL CHECK (relevance >= 0 AND relevance <= 100),
  description TEXT NOT NULL,
  timeframe TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patterns matched (one-to-many)
CREATE TABLE market_analysis_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_analysis_id UUID NOT NULL REFERENCES market_analyses(id) ON DELETE CASCADE,
  
  pattern_name TEXT NOT NULL,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  description TEXT NOT NULL,
  examples TEXT[] DEFAULT '{}',
  applicability TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_market_analyses_game_loop ON market_analyses(game_loop_id);
CREATE INDEX idx_market_analyses_user ON market_analyses(user_id);
CREATE INDEX idx_market_analysis_competitors_analysis ON market_analysis_competitors(market_analysis_id);
CREATE INDEX idx_market_analysis_trends_analysis ON market_analysis_trends(market_analysis_id);
CREATE INDEX idx_market_analysis_patterns_analysis ON market_analysis_patterns(market_analysis_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_market_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER market_analyses_updated_at
  BEFORE UPDATE ON market_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_market_analysis_timestamp();

-- RLS policies
ALTER TABLE market_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_reference_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_market_size ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_audience_fit ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_patterns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own market analyses
CREATE POLICY "Users can view own market analyses"
  ON market_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own market analyses"
  ON market_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own market analyses"
  ON market_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own market analyses"
  ON market_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Related tables inherit access through market_analyses
CREATE POLICY "Users can view own reference scores"
  ON market_analysis_reference_scores FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own reference scores"
  ON market_analysis_reference_scores FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own market size"
  ON market_analysis_market_size FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own market size"
  ON market_analysis_market_size FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own audience fit"
  ON market_analysis_audience_fit FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own audience fit"
  ON market_analysis_audience_fit FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own competitors"
  ON market_analysis_competitors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own competitors"
  ON market_analysis_competitors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own trends"
  ON market_analysis_trends FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own trends"
  ON market_analysis_trends FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own patterns"
  ON market_analysis_patterns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own patterns"
  ON market_analysis_patterns FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));


