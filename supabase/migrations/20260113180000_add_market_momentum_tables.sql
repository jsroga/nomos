-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- Migration: Add market momentum and archetype matching tables
-- Purpose: Support "one hit is enough" scoring and real-time market signals

-- Primary archetype match (for "one hit is enough" scoring)
CREATE TABLE IF NOT EXISTS market_analysis_primary_archetype (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_analysis_id UUID NOT NULL REFERENCES market_analyses(id) ON DELETE CASCADE,
  
  archetype_id TEXT NOT NULL, -- 'disco_elysium' | 'vampire_survivors' | 'counter_strike'
  archetype_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL,
  key_patterns TEXT[] DEFAULT ARRAY[]::TEXT[],
  weak_patterns TEXT[] DEFAULT ARRAY[]::TEXT[],
  interpretation TEXT,
  market_implication TEXT,
  viability_verdict TEXT, -- 'strong' | 'moderate' | 'niche' | 'unclear'
  viability_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Market momentum signals from real-time sources
CREATE TABLE IF NOT EXISTS market_analysis_momentum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_analysis_id UUID NOT NULL REFERENCES market_analyses(id) ON DELETE CASCADE,
  
  overall_momentum INTEGER NOT NULL, -- -100 to +100
  momentum_label TEXT NOT NULL, -- 'bullish' | 'neutral' | 'bearish'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Genre-specific momentum data
CREATE TABLE IF NOT EXISTS market_analysis_genre_momentum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  momentum_id UUID NOT NULL REFERENCES market_analysis_momentum(id) ON DELETE CASCADE,
  
  genre TEXT NOT NULL,
  trend TEXT NOT NULL, -- 'rising' | 'stable' | 'declining' | 'emerging'
  momentum_score INTEGER NOT NULL,
  market_timing TEXT NOT NULL, -- 'optimal' | 'good' | 'saturated' | 'risky'
  competitor_density TEXT NOT NULL, -- 'low' | 'medium' | 'high' | 'oversaturated'
  top_performers TEXT[] DEFAULT ARRAY[]::TEXT[],
  opportunities TEXT[] DEFAULT ARRAY[]::TEXT[],
  risks TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Social buzz indicators
CREATE TABLE IF NOT EXISTS market_analysis_social_buzz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  momentum_id UUID NOT NULL REFERENCES market_analysis_momentum(id) ON DELETE CASCADE,
  
  topic TEXT NOT NULL,
  buzz_score INTEGER NOT NULL,
  sentiment TEXT NOT NULL, -- 'positive' | 'negative' | 'mixed'
  viral_potential TEXT NOT NULL, -- 'high' | 'medium' | 'low'
  sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Rising competitors to watch
CREATE TABLE IF NOT EXISTS market_analysis_rising_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  momentum_id UUID NOT NULL REFERENCES market_analysis_momentum(id) ON DELETE CASCADE,
  
  game_name TEXT NOT NULL,
  genres TEXT[] DEFAULT ARRAY[]::TEXT[],
  momentum_score INTEGER NOT NULL,
  why_successful TEXT NOT NULL,
  lessons_to_learn TEXT[] DEFAULT ARRAY[]::TEXT[],
  differentiators TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_analysis_primary_archetype_analysis_id 
  ON market_analysis_primary_archetype(market_analysis_id);

CREATE INDEX IF NOT EXISTS idx_market_analysis_momentum_analysis_id 
  ON market_analysis_momentum(market_analysis_id);

CREATE INDEX IF NOT EXISTS idx_market_analysis_genre_momentum_momentum_id 
  ON market_analysis_genre_momentum(momentum_id);

CREATE INDEX IF NOT EXISTS idx_market_analysis_social_buzz_momentum_id 
  ON market_analysis_social_buzz(momentum_id);

CREATE INDEX IF NOT EXISTS idx_market_analysis_rising_competitors_momentum_id 
  ON market_analysis_rising_competitors(momentum_id);

-- Enable RLS
ALTER TABLE market_analysis_primary_archetype ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_momentum ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_genre_momentum ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_social_buzz ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis_rising_competitors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (access through parent market_analyses table)
CREATE POLICY "Users can view their own archetype data" 
  ON market_analysis_primary_archetype FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM market_analyses ma 
      WHERE ma.id = market_analysis_primary_archetype.market_analysis_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own archetype data" 
  ON market_analysis_primary_archetype FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_analyses ma 
      WHERE ma.id = market_analysis_primary_archetype.market_analysis_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own archetype data" 
  ON market_analysis_primary_archetype FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM market_analyses ma 
      WHERE ma.id = market_analysis_primary_archetype.market_analysis_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own momentum data" 
  ON market_analysis_momentum FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM market_analyses ma 
      WHERE ma.id = market_analysis_momentum.market_analysis_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own momentum data" 
  ON market_analysis_momentum FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_analyses ma 
      WHERE ma.id = market_analysis_momentum.market_analysis_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own momentum data" 
  ON market_analysis_momentum FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM market_analyses ma 
      WHERE ma.id = market_analysis_momentum.market_analysis_id 
      AND ma.user_id = auth.uid()
    )
  );

-- Policies for child tables (access through momentum parent)
CREATE POLICY "Users can view their own genre momentum" 
  ON market_analysis_genre_momentum FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_genre_momentum.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own genre momentum" 
  ON market_analysis_genre_momentum FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_genre_momentum.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own genre momentum" 
  ON market_analysis_genre_momentum FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_genre_momentum.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own social buzz" 
  ON market_analysis_social_buzz FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_social_buzz.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own social buzz" 
  ON market_analysis_social_buzz FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_social_buzz.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own social buzz" 
  ON market_analysis_social_buzz FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_social_buzz.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own rising competitors" 
  ON market_analysis_rising_competitors FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_rising_competitors.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own rising competitors" 
  ON market_analysis_rising_competitors FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_rising_competitors.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own rising competitors" 
  ON market_analysis_rising_competitors FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM market_analysis_momentum mam 
      JOIN market_analyses ma ON ma.id = mam.market_analysis_id
      WHERE mam.id = market_analysis_rising_competitors.momentum_id 
      AND ma.user_id = auth.uid()
    )
  );


