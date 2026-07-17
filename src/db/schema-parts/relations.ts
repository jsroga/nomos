import { relations } from 'drizzle-orm'
import {
  projects,
  characters,
  episodes,
  beats,
  documentEmbeddings,
  relationshipEdges,
  seriesBibles,
  storyPlans,
  gameEntities,
  entityRelationships,
  tiles,
  assets,
  interiorDesigns,
  gameLoops,
} from './core-tables'
import {
  marketAnalyses,
  marketAnalysisReferenceScores,
  marketAnalysisMarketSize,
  marketAnalysisAudienceFit,
  marketAnalysisCompetitors,
  marketAnalysisTrends,
  marketAnalysisPatterns,
  marketAnalysisPrimaryArchetype,
  marketAnalysisMomentum,
  marketAnalysisGenreMomentum,
  marketAnalysisSocialBuzz,
  marketAnalysisRisingCompetitors,
} from './market-analysis-tables'

// =============================================================================
// Relations for Drizzle Query Builder (enables eager loading with `with:` clause)
// =============================================================================

// Projects relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  characters: many(characters),
  episodes: many(episodes),
  embeddings: many(documentEmbeddings),
  relationshipEdges: many(relationshipEdges),
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

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  project: one(projects, {
    fields: [episodes.projectId],
    references: [projects.id],
  }),
  beats: many(beats),
}))

export const beatsRelations = relations(beats, ({ one }) => ({
  episode: one(episodes, {
    fields: [beats.episodeId],
    references: [episodes.id],
  }),
}))

export const seriesBiblesRelations = relations(seriesBibles, ({ one }) => ({
  project: one(projects, {
    fields: [seriesBibles.projectId],
    references: [projects.id],
  }),
}))

export const storyPlansRelations = relations(storyPlans, ({ one }) => ({
  project: one(projects, {
    fields: [storyPlans.projectId],
    references: [projects.id],
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
