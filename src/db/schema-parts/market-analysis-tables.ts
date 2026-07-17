import { pgTable, uuid, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core'
import { gameLoops } from './core-tables'

// Market Analysis tables (normalized, no JSONB for structured data)
export const marketAnalyses = pgTable('market_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameLoopId: uuid('game_loop_id')
    .notNull()
    .references(() => gameLoops.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),

  overallScore: integer('overall_score').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),

  recommendations: text('recommendations').array().default([]),
  risks: text('risks').array().default([]),
  opportunities: text('opportunities').array().default([]),
  sourcesUsed: text('sources_used').array().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const marketAnalysisReferenceScores = pgTable('market_analysis_reference_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketAnalysisId: uuid('market_analysis_id')
    .notNull()
    .references(() => marketAnalyses.id, { onDelete: 'cascade' }),

  discoElysiumScore: integer('disco_elysium_score').notNull(),
  vampireSurvivorsScore: integer('vampire_survivors_score').notNull(),
  counterStrikeScore: integer('counter_strike_score').notNull(),

  discoElysiumNotes: text('disco_elysium_notes'),
  vampireSurvivorsNotes: text('vampire_survivors_notes'),
  counterStrikeNotes: text('counter_strike_notes'),
})

export const marketAnalysisMarketSize = pgTable('market_analysis_market_size', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketAnalysisId: uuid('market_analysis_id')
    .notNull()
    .references(() => marketAnalyses.id, { onDelete: 'cascade' }),

  tam: text('tam').notNull(),
  sam: text('sam').notNull(),
  relevantSegment: text('relevant_segment').notNull(),
  growthRate: text('growth_rate').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
  sources: text('sources').array().default([]),
})

export const marketAnalysisAudienceFit = pgTable('market_analysis_audience_fit', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketAnalysisId: uuid('market_analysis_id')
    .notNull()
    .references(() => marketAnalyses.id, { onDelete: 'cascade' }),

  targetDemographic: text('target_demographic').notNull(),
  fitScore: integer('fit_score').notNull(),
  strengths: text('strengths').array().default([]),
  concerns: text('concerns').array().default([]),
  recommendations: text('recommendations').array().default([]),
})

export const marketAnalysisCompetitors = pgTable('market_analysis_competitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketAnalysisId: uuid('market_analysis_id')
    .notNull()
    .references(() => marketAnalyses.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  genre: text('genre').notNull(),
  platforms: text('platforms').array().default([]),
  playerCount: text('player_count'),
  similarityScore: integer('similarity_score').notNull(),
  strengths: text('strengths').array().default([]),
  weaknesses: text('weaknesses').array().default([]),
  marketPosition: text('market_position'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const marketAnalysisTrends = pgTable('market_analysis_trends', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketAnalysisId: uuid('market_analysis_id')
    .notNull()
    .references(() => marketAnalyses.id, { onDelete: 'cascade' }),

  trendName: text('trend_name').notNull(),
  direction: text('direction').notNull(), // 'rising' | 'stable' | 'declining'
  relevance: integer('relevance').notNull(),
  description: text('description').notNull(),
  timeframe: text('timeframe'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const marketAnalysisPatterns = pgTable('market_analysis_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketAnalysisId: uuid('market_analysis_id')
    .notNull()
    .references(() => marketAnalyses.id, { onDelete: 'cascade' }),

  patternName: text('pattern_name').notNull(),
  matchScore: integer('match_score').notNull(),
  description: text('description').notNull(),
  examples: text('examples').array().default([]),
  applicability: text('applicability'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Primary archetype match (for "one hit is enough" scoring)
export const marketAnalysisPrimaryArchetype = pgTable('market_analysis_primary_archetype', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketAnalysisId: uuid('market_analysis_id')
    .notNull()
    .references(() => marketAnalyses.id, { onDelete: 'cascade' }),

  archetypeId: text('archetype_id').notNull(), // 'disco_elysium' | 'vampire_survivors' | 'counter_strike'
  archetypeName: text('archetype_name').notNull(),
  score: integer('score').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
  keyPatterns: text('key_patterns').array().default([]),
  weakPatterns: text('weak_patterns').array().default([]),
  interpretation: text('interpretation'),
  marketImplication: text('market_implication'),
  viabilityVerdict: text('viability_verdict'), // 'strong' | 'moderate' | 'niche' | 'unclear'
  viabilityReason: text('viability_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Market momentum signals from real-time sources (Twitter, Steam, Reddit)
export const marketAnalysisMomentum = pgTable('market_analysis_momentum', {
  id: uuid('id').primaryKey().defaultRandom(),
  marketAnalysisId: uuid('market_analysis_id')
    .notNull()
    .references(() => marketAnalyses.id, { onDelete: 'cascade' }),

  overallMomentum: integer('overall_momentum').notNull(), // -100 to +100
  momentumLabel: text('momentum_label').notNull(), // 'bullish' | 'neutral' | 'bearish'

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Genre-specific momentum data
export const marketAnalysisGenreMomentum = pgTable('market_analysis_genre_momentum', {
  id: uuid('id').primaryKey().defaultRandom(),
  momentumId: uuid('momentum_id')
    .notNull()
    .references(() => marketAnalysisMomentum.id, { onDelete: 'cascade' }),

  genre: text('genre').notNull(),
  trend: text('trend').notNull(), // 'rising' | 'stable' | 'declining' | 'emerging'
  momentumScore: integer('momentum_score').notNull(),
  marketTiming: text('market_timing').notNull(), // 'optimal' | 'good' | 'saturated' | 'risky'
  competitorDensity: text('competitor_density').notNull(), // 'low' | 'medium' | 'high' | 'oversaturated'
  topPerformers: text('top_performers').array().default([]),
  opportunities: text('opportunities').array().default([]),
  risks: text('risks').array().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Social buzz indicators
export const marketAnalysisSocialBuzz = pgTable('market_analysis_social_buzz', {
  id: uuid('id').primaryKey().defaultRandom(),
  momentumId: uuid('momentum_id')
    .notNull()
    .references(() => marketAnalysisMomentum.id, { onDelete: 'cascade' }),

  topic: text('topic').notNull(),
  buzzScore: integer('buzz_score').notNull(),
  sentiment: text('sentiment').notNull(), // 'positive' | 'negative' | 'mixed'
  viralPotential: text('viral_potential').notNull(), // 'high' | 'medium' | 'low'
  sources: text('sources').array().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Rising competitors to watch
export const marketAnalysisRisingCompetitors = pgTable('market_analysis_rising_competitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  momentumId: uuid('momentum_id')
    .notNull()
    .references(() => marketAnalysisMomentum.id, { onDelete: 'cascade' }),

  gameName: text('game_name').notNull(),
  genres: text('genres').array().default([]),
  momentumScore: integer('momentum_score').notNull(),
  whySuccessful: text('why_successful').notNull(),
  lessonsToLearn: text('lessons_to_learn').array().default([]),
  differentiators: text('differentiators').array().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})
