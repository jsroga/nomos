import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  unique,
  decimal,
} from 'drizzle-orm/pg-core'

import { 
  characters, 
  episodes, 
  beats, 
  seriesBibles, 
  storyPlans, 
  entityReferences,
  seriesBiblesRelations,
  storyPlansRelations,
} from '../domains/storyteller/db/schema'

// Projects table (world-building + storyteller)
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  projectPrompt: text('project_prompt'), // legacy field
  masterPrompt: text('master_prompt'), // storyteller field
  userId: uuid('user_id').notNull(),
  seriesBible: jsonb('series_bible').notNull().default({}),
  storyPlan: jsonb('story_plan'),
  styleReferenceUrls: jsonb('style_reference_urls').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Game Entities table (shared across ALL domains - the Swiss Army Knife bridge)
export const gameEntities = pgTable('game_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),

  // Core entity data
  entityType: text('entity_type').notNull(), // 'character' | 'location' | 'mechanic' | 'faction' | 'item' | 'quest'
  name: text('name').notNull(),
  description: text('description'),

  // Domain tracking
  sourceDomain: text('source_domain').notNull(), // 'storyteller' | 'loop-creator' | 'interior-designer' | 'world-building'
  sourceEntityId: uuid('source_entity_id'), // ID in the source domain's table
  usedInDomains: text('used_in_domains').array().default([]), // ['storyteller', 'loop-creator']

  // Rich metadata from source domain
  metadata: jsonb('metadata').default({}), // Domain-specific data (character stats, location coordinates, etc.)

  // Search and display
  tags: text('tags').array().default([]),
  imageUrl: text('image_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Entity Relationships table (for cross-domain connections)
export const entityRelationships = pgTable('entity_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),

  fromEntityId: uuid('from_entity_id')
    .notNull()
    .references(() => gameEntities.id, { onDelete: 'cascade' }),
  toEntityId: uuid('to_entity_id')
    .notNull()
    .references(() => gameEntities.id, { onDelete: 'cascade' }),

  relationshipType: text('relationship_type').notNull(), // 'uses' | 'located_in' | 'conflicts_with' | 'allies_with' | 'owns'
  metadata: jsonb('metadata').default({}), // Additional relationship context

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Tiles table (world-building)
export const tiles = pgTable(
  'tiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    tilePrompt: text('tile_prompt'),
    imageFilename: text('image_filename'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    uniqueTilePosition: unique().on(table.projectId, table.x, table.y),
  })
)

// Assets table (3d-asset-exporter)
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  imageFilename: text('image_filename').notNull(),
  modelFilename: text('model_filename'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Select points table (for SAM segmentation)
export const selectPoints = pgTable('select_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  label: integer('label').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Interior Designs table (interior-designer)
export const interiorDesigns = pgTable('interior_designs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  sceneData: jsonb('scene_data').notNull(), // { walls, floors, objects, activeLevel }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Game Loops table (loop-creator)
export const gameLoops = pgTable('game_loops', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  nodes: jsonb('nodes').notNull().default([]),
  edges: jsonb('edges').notNull().default([]),
  metadata: jsonb('metadata'), // { id, name, description, version, genre, etc. }
  analysis: jsonb('analysis'), // { coreInsight, pillarScores, keyInnovations, etc. }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

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

// =============================================================================
// Relations for Drizzle Query Builder (enables eager loading with `with:` clause)
// =============================================================================

import { relations } from 'drizzle-orm'

// Projects relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  characters: many(characters),
  episodes: many(episodes),
  tiles: many(tiles),
  assets: many(assets),
  interiorDesigns: many(interiorDesigns),
  gameLoops: many(gameLoops),
  gameEntities: many(gameEntities),
  seriesBibleTable: one(seriesBibles, {
    fields: [projects.id],
    references: [seriesBibles.projectId],
  }),
  storyPlanTable: one(storyPlans, {
    fields: [projects.id],
    references: [storyPlans.projectId],
  }),
}))

// Game Loop relations
export const gameLoopsRelations = relations(gameLoops, ({ many }) => ({
  marketAnalyses: many(marketAnalyses),
}))

// Market Analysis relations (main table)
export const marketAnalysesRelations = relations(marketAnalyses, ({ one, many }) => ({
  gameLoop: one(gameLoops, {
    fields: [marketAnalyses.gameLoopId],
    references: [gameLoops.id],
  }),
  referenceScores: one(marketAnalysisReferenceScores, {
    fields: [marketAnalyses.id],
    references: [marketAnalysisReferenceScores.marketAnalysisId],
  }),
  marketSize: one(marketAnalysisMarketSize, {
    fields: [marketAnalyses.id],
    references: [marketAnalysisMarketSize.marketAnalysisId],
  }),
  audienceFit: one(marketAnalysisAudienceFit, {
    fields: [marketAnalyses.id],
    references: [marketAnalysisAudienceFit.marketAnalysisId],
  }),
  primaryArchetype: one(marketAnalysisPrimaryArchetype, {
    fields: [marketAnalyses.id],
    references: [marketAnalysisPrimaryArchetype.marketAnalysisId],
  }),
  momentum: one(marketAnalysisMomentum, {
    fields: [marketAnalyses.id],
    references: [marketAnalysisMomentum.marketAnalysisId],
  }),
  competitors: many(marketAnalysisCompetitors),
  trends: many(marketAnalysisTrends),
  patterns: many(marketAnalysisPatterns),
}))

// Market Analysis sub-table relations
export const marketAnalysisReferenceScoresRelations = relations(
  marketAnalysisReferenceScores,
  ({ one }) => ({
    analysis: one(marketAnalyses, {
      fields: [marketAnalysisReferenceScores.marketAnalysisId],
      references: [marketAnalyses.id],
    }),
  })
)

export const marketAnalysisMarketSizeRelations = relations(marketAnalysisMarketSize, ({ one }) => ({
  analysis: one(marketAnalyses, {
    fields: [marketAnalysisMarketSize.marketAnalysisId],
    references: [marketAnalyses.id],
  }),
}))

export const marketAnalysisAudienceFitRelations = relations(
  marketAnalysisAudienceFit,
  ({ one }) => ({
    analysis: one(marketAnalyses, {
      fields: [marketAnalysisAudienceFit.marketAnalysisId],
      references: [marketAnalyses.id],
    }),
  })
)

export const marketAnalysisCompetitorsRelations = relations(
  marketAnalysisCompetitors,
  ({ one }) => ({
    analysis: one(marketAnalyses, {
      fields: [marketAnalysisCompetitors.marketAnalysisId],
      references: [marketAnalyses.id],
    }),
  })
)

export const marketAnalysisTrendsRelations = relations(marketAnalysisTrends, ({ one }) => ({
  analysis: one(marketAnalyses, {
    fields: [marketAnalysisTrends.marketAnalysisId],
    references: [marketAnalyses.id],
  }),
}))

export const marketAnalysisPatternsRelations = relations(marketAnalysisPatterns, ({ one }) => ({
  analysis: one(marketAnalyses, {
    fields: [marketAnalysisPatterns.marketAnalysisId],
    references: [marketAnalyses.id],
  }),
}))

export const marketAnalysisPrimaryArchetypeRelations = relations(
  marketAnalysisPrimaryArchetype,
  ({ one }) => ({
    analysis: one(marketAnalyses, {
      fields: [marketAnalysisPrimaryArchetype.marketAnalysisId],
      references: [marketAnalyses.id],
    }),
  })
)

export const marketAnalysisMomentumRelations = relations(
  marketAnalysisMomentum,
  ({ one, many }) => ({
    analysis: one(marketAnalyses, {
      fields: [marketAnalysisMomentum.marketAnalysisId],
      references: [marketAnalyses.id],
    }),
    genreMomentum: many(marketAnalysisGenreMomentum),
    socialBuzz: many(marketAnalysisSocialBuzz),
    risingCompetitors: many(marketAnalysisRisingCompetitors),
  })
)

export const marketAnalysisGenreMomentumRelations = relations(
  marketAnalysisGenreMomentum,
  ({ one }) => ({
    momentum: one(marketAnalysisMomentum, {
      fields: [marketAnalysisGenreMomentum.momentumId],
      references: [marketAnalysisMomentum.id],
    }),
  })
)

export const marketAnalysisSocialBuzzRelations = relations(marketAnalysisSocialBuzz, ({ one }) => ({
  momentum: one(marketAnalysisMomentum, {
    fields: [marketAnalysisSocialBuzz.momentumId],
    references: [marketAnalysisMomentum.id],
  }),
}))

export const marketAnalysisRisingCompetitorsRelations = relations(
  marketAnalysisRisingCompetitors,
  ({ one }) => ({
    momentum: one(marketAnalysisMomentum, {
      fields: [marketAnalysisRisingCompetitors.momentumId],
      references: [marketAnalysisMomentum.id],
    }),
  })
)

// Game Entities relations
export const gameEntitiesRelations = relations(gameEntities, ({ one }) => ({
  project: one(projects, {
    fields: [gameEntities.projectId],
    references: [projects.id],
  }),
}))

// Entity Relationships relations
export const entityRelationshipsRelations = relations(entityRelationships, ({ one }) => ({
  project: one(projects, {
    fields: [entityRelationships.projectId],
    references: [projects.id],
  }),
  fromEntity: one(gameEntities, {
    fields: [entityRelationships.fromEntityId],
    references: [gameEntities.id],
  }),
  toEntity: one(gameEntities, {
    fields: [entityRelationships.toEntityId],
    references: [gameEntities.id],
  }),
}))

// =============================================================================
// Type exports for use in application
// =============================================================================

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

// Game Entities (cross-domain)
export type GameEntity = typeof gameEntities.$inferSelect
export type NewGameEntity = typeof gameEntities.$inferInsert
export type EntityRelationship = typeof entityRelationships.$inferSelect
export type NewEntityRelationship = typeof entityRelationships.$inferInsert

export type Tile = typeof tiles.$inferSelect
export type NewTile = typeof tiles.$inferInsert
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type InteriorDesign = typeof interiorDesigns.$inferSelect
export type NewInteriorDesign = typeof interiorDesigns.$inferInsert
export type GameLoop = typeof gameLoops.$inferSelect
export type NewGameLoop = typeof gameLoops.$inferInsert

// Market Analysis types
export type MarketAnalysis = typeof marketAnalyses.$inferSelect
export type NewMarketAnalysis = typeof marketAnalyses.$inferInsert
export type MarketAnalysisReferenceScore = typeof marketAnalysisReferenceScores.$inferSelect
export type MarketAnalysisMarketSizeRow = typeof marketAnalysisMarketSize.$inferSelect
export type MarketAnalysisAudienceFitRow = typeof marketAnalysisAudienceFit.$inferSelect
export type MarketAnalysisCompetitor = typeof marketAnalysisCompetitors.$inferSelect
export type MarketAnalysisTrend = typeof marketAnalysisTrends.$inferSelect
export type MarketAnalysisPattern = typeof marketAnalysisPatterns.$inferSelect

// Best-match archetype types
export type MarketAnalysisPrimaryArchetypeRow = typeof marketAnalysisPrimaryArchetype.$inferSelect
export type NewMarketAnalysisPrimaryArchetype = typeof marketAnalysisPrimaryArchetype.$inferInsert // Market momentum types
export type MarketAnalysisMomentumRow = typeof marketAnalysisMomentum.$inferSelect
export type MarketAnalysisGenreMomentumRow = typeof marketAnalysisGenreMomentum.$inferSelect
export type MarketAnalysisSocialBuzzRow = typeof marketAnalysisSocialBuzz.$inferSelect
export type MarketAnalysisRisingCompetitorRow = typeof marketAnalysisRisingCompetitors.$inferSelect
// Re-export storyteller tables for unified db.query access
export { 
  characters, 
  episodes, 
  beats, 
  seriesBibles, 
  storyPlans, 
  entityReferences,
  seriesBiblesRelations,
  storyPlansRelations,
}