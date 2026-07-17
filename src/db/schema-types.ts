import {
  projects,
  gameEntities,
  entityRelationships,
  tiles,
  assets,
  interiorDesigns,
  gameLoops,
} from './schema-parts/core-tables'
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
} from './schema-parts/market-analysis-tables'

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

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

export type MarketAnalysis = typeof marketAnalyses.$inferSelect
export type NewMarketAnalysis = typeof marketAnalyses.$inferInsert
export type MarketAnalysisReferenceScore = typeof marketAnalysisReferenceScores.$inferSelect
export type MarketAnalysisMarketSizeRow = typeof marketAnalysisMarketSize.$inferSelect
export type MarketAnalysisAudienceFitRow = typeof marketAnalysisAudienceFit.$inferSelect
export type MarketAnalysisCompetitor = typeof marketAnalysisCompetitors.$inferSelect
export type MarketAnalysisTrend = typeof marketAnalysisTrends.$inferSelect
export type MarketAnalysisPattern = typeof marketAnalysisPatterns.$inferSelect

export type MarketAnalysisPrimaryArchetypeRow = typeof marketAnalysisPrimaryArchetype.$inferSelect
export type NewMarketAnalysisPrimaryArchetype = typeof marketAnalysisPrimaryArchetype.$inferInsert
export type MarketAnalysisMomentumRow = typeof marketAnalysisMomentum.$inferSelect
export type MarketAnalysisGenreMomentumRow = typeof marketAnalysisGenreMomentum.$inferSelect
export type MarketAnalysisSocialBuzzRow = typeof marketAnalysisSocialBuzz.$inferSelect
export type MarketAnalysisRisingCompetitorRow = typeof marketAnalysisRisingCompetitors.$inferSelect
