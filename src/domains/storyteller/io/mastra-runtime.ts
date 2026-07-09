/**
 * Storyteller Mastra runtime surface — the ONE sanctioned deep-import point
 * for the central Mastra instance (`io/*` is the only storyteller path other
 * modules may deep-import, per the ESLint barrel guard).
 *
 * Everything exported here is cycle-free with respect to
 * `@/shared/agent-kernel`: stateless agents, critics, and the workflow import
 * only prompts/config/tools — never the Mastra instance itself.
 */

import type { Agent } from '@mastra/core/agent'
import { registerMastraModule } from '@/shared/agent-kernel/mastra/runtime-registry'
import {
  statelessGrrmAuthor,
  statelessBeatPlanner,
} from '@/domains/storyteller/agents/workflows/stateless-agents'
import {
  continuityCritic,
  proseCritic,
  stakesCritic,
} from '@/domains/storyteller/agents/critics'
import { beatDraftWorkflow } from '@/domains/storyteller/agents/workflows/beat-draft-workflow'

/** The 5 GRRM-topology agents (author, planner, 3 critics). */
export const storytellerRuntimeAgents: Record<string, Agent> = {
  grrmAuthor: statelessGrrmAuthor,
  beatPlanner: statelessBeatPlanner,
  continuityCritic,
  proseCritic,
  stakesCritic,
}

/** Workflows registered on the production Mastra instance. */
export const storytellerRuntimeWorkflows = {
  beatDraftWorkflow,
}

export {
  BEAT_DRAFT_WORKFLOW_ID,
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  VERDICT_STEP_ID,
} from '@/domains/storyteller/agents/workflows/beat-draft-contract'
export {
  buildStorytellerRequestContext,
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  STORYTELLER_AUTHOR_MODEL,
} from '@/domains/storyteller/agents/request-context'

// Dependency inversion: push this domain's runtime into the kernel registry
// at module-load time. The tools barrel imports this module, so any code
// path that can call getMastraInstance() has already registered us.
registerMastraModule({
  agents: storytellerRuntimeAgents,
  workflows: storytellerRuntimeWorkflows,
})
