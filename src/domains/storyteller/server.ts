/**
 * Server-only storyteller exports.
 * Use in API routes, MCP, and Trigger tasks — never import from the client barrel.
 */

export * from './db/schema'
export * as storytellerSchema from './db/schema'

export * from './services/AccessVerificationService'
export * from './services/ContextAssemblyService'
export * from './services/ContextualSummaryService'
export * from './services/EntityAutoLinkerService'
export * from './services/EntityRegistryService'
export * from './services/MoodboardGenerationService'
export * from './services/PosterGenerationService'
export * from './services/RagService'
export * from './services/RelationshipEnricherService'
export * from './services/ScriptOperationsService'
export * from './services/context/SeriesBible'
export * from './services/StorytellerCrudService'

export { createStorytellerAgent } from './agents/StorytellerAgent/StorytellerAgent'
export { normalizeMastraTraceId, createMastraTraceId } from './agents/tracing'

// Script review — critic-backed (replaces the deleted persona judge)
export {
  reviewScript,
  quickReview,
  type ScriptReviewRequest,
  type ScriptReviewResult,
  type PersonaReview,
} from './services/ScriptReviewService'

export { storytellerService } from './services/StorytellerCrudService'

// Consistency check — pure service behind the legacy API shape
// (replaces the deleted ConsistencyAgent judge)
export { runConsistencyCheck } from './services/ConsistencyCheckAdapter'

export { getUndoManager } from './core/editing/UndoManager'
