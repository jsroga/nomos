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
export {
  runStorytellerWorkflow,
  normalizeMastraTraceId,
} from './agents/orchestration/StorytellerWorkflow'
export { workflowStore } from './agents/orchestration/WorkflowContext'
export { runConsistencyCheck } from './agents/judges/ConsistencyAgent'
export {
  reviewScript,
  quickReview,
  type ScriptReviewRequest,
} from './agents/judges/ScriptReviewAgent'
export { getUndoManager } from './core/editing/UndoManager'
