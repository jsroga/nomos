/**
 * Storyteller Agents — GRRM/StoryForge topology.
 *
 * 1 chat adapter + 1 author + 1 planner + 3 narrow critics, orchestrated by
 * the single beat-draft workflow. The legacy writers'-room council, judges,
 * and multi-hop orchestration are gone.
 */

// ai/ is a server-only layer (browser-bundle guard; node/Studio/evals safe)
import '@/shared/data/server-guard'

// Chat adapter (conversation glue; owns the 10-tool surface)
export { StorytellerAgent, createStorytellerAgent } from './agents/StorytellerAgent/storyteller-agent'

// GRRM solo agents (class wrappers for request-scoped, memory-backed use)
export { GrrmAuthorAgent, createGrrmAuthorAgent } from './agents/GrrmAuthor/grrm-author-agent'
export { BeatPlannerAgent, createBeatPlannerAgent } from './agents/BeatPlanner/beat-planner-agent'
export { BeatPlanSchema, type BeatPlan } from './agents/BeatPlanner/beat-plan-schema'
export {
  assessBeatPlanConcreteness,
  formatPlanQualityFeedback,
} from './agents/BeatPlanner/beat-plan-quality'
export { beatPlanConcretenessScorer } from './agents/BeatPlanner/beat-plan-concreteness-scorer'

// Narrow critics (diagnose only — quoted evidence, never rewrites)
export * from './agents/critics'

// Workflow contract (ids + boundary schemas; implementation registered via io/mastra-runtime)
export {
  BEAT_DRAFT_WORKFLOW_ID,
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  VERDICT_STEP_ID,
  beatDraftInputSchema,
  beatDraftOutputSchema,
  type BeatDraftInput,
  type BeatDraftOutput,
} from './workflows/beat-draft-contract'

// Tracing helpers
export { normalizeMastraTraceId, createMastraTraceId } from './tracing'

// Request-context keys/helpers (server-trusted per-request values)
export * from './request-context'

// Tools (9 CRUD + 1 workflow entry)
export * from './tools'

// Deterministic domain eval scorers — unioned with the shared scorers by
// evals/run.ts (they cannot live in shared/agent-kernel: the gate and the
// critic rules are domain modules, and shared/ may not import domains).
import { beatPlanConcretenessScorer as _beatPlanConcretenessScorer } from './agents/BeatPlanner/beat-plan-concreteness-scorer'
import { criticDisciplineScorer as _criticDisciplineScorer } from './agents/critics/critic-discipline-scorer'

export const STORYTELLER_EVAL_SCORERS = [
  _beatPlanConcretenessScorer,
  _criticDisciplineScorer,
] as const
