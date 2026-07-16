/**
 * Server-only storyteller exports.
 * Use in API routes, MCP, and Trigger tasks — never import from the client barrel.
 */

// (Schema re-exports removed with the duplicate domain schema, PLAN-V2 6.1 —
// tables live at @/db/schema; no server-barrel consumer imported them.)

export * from './services/access-verification-service'
export * from './services/context-assembly-service'
export * from './services/contextual-summary-service'
export * from './services/entity-auto-linker-service'
export * from './services/entity-registry-service'
export * from './services/moodboard-generation-service'
export * from './services/poster-generation-service'
export * from './services/rag-service'
export * from './services/relationship-enricher-service'
export * from './services/script-operations-service'
export * from './services/context/series-bible'
export * from './services/storyteller-crud-service'

export { createStorytellerAgent } from './ai/agents/StorytellerAgent/storyteller-agent'
export { normalizeMastraTraceId, createMastraTraceId } from './ai/tracing'

// Script review — critic-backed (replaces the deleted persona judge)
export {
  reviewScript,
  quickReview,
  type ScriptReviewRequest,
  type ScriptReviewResult,
  type PersonaReview,
} from './services/script-review-service'

export { storytellerService } from './services/storyteller-crud-service'

// Consistency check — pure service behind the legacy API shape
// (replaces the deleted ConsistencyAgent judge)
export { runConsistencyCheck } from './services/consistency-check-adapter'

export { getUndoManager } from './core/editing/undo-manager'
