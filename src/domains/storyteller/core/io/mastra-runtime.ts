/**
 * Storyteller Mastra runtime surface — the ONE sanctioned deep-import point
 * for the central Mastra instance (`io/*` is the only storyteller path other
 * modules may deep-import, per the ESLint barrel guard).
 *
 * Everything exported here is cycle-free with respect to
 * `@/shared/agent-kernel`: stateless agents, critics, and the workflow import
 * only prompts/config/tools — never the Mastra instance itself.
 */

import { Agent } from '@mastra/core/agent'
import { registerMastraModule } from '@/shared/agent-kernel/mastra/runtime-registry'
import {
  statelessGrrmAuthor,
  statelessBeatPlanner,
} from '@/domains/storyteller/ai/workflows/stateless-agents'
import {
  continuityCritic,
  proseCritic,
  stakesCritic,
} from '@/domains/storyteller/ai/agents/critics'
import { beatDraftWorkflow } from '@/domains/storyteller/ai/workflows/beat-draft-workflow'
// Tools come from their CONCRETE modules, never the tools barrel — the barrel
// side-effect-imports this file (registration ordering), so importing it here
// would create a cycle.
import { manageBeatTool, listBeatsTool } from '@/domains/storyteller/ai/tools/beat-tools'
import {
  manageCharacterTool,
  listCharactersTool,
} from '@/domains/storyteller/ai/tools/character-tools'
import {
  manageEpisodeTool,
  listEpisodesTool,
} from '@/domains/storyteller/ai/tools/episode-tools'
import {
  updateWorldBibleTool,
  readWorldBibleTool,
  checkContinuityTool,
} from '@/domains/storyteller/ai/tools/bible-tools'
import { runBeatDraftWorkflowTool } from '@/domains/storyteller/ai/tools/workflow-tool'
import { buildChatAdapterPrompt } from '@/domains/storyteller/ai/prompts/chat-adapter-prompt'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { AgentController } from '@mastra/core/agent-controller'
import { buildStorytellerControllerConfig } from '@/domains/storyteller/ai/controller/storyteller-controller'
import { getStorageInstance } from '@/shared/agent-kernel/mastra-instance'

const CHAT_ADAPTER_ID = 'storyteller'
const CHAT_ADAPTER_NAME = 'Storyteller'
const CHAT_ADAPTER_DESCRIPTION =
  'Chat adapter: converse, keep the world bible current via tools, delegate beat drafting to the beat-draft workflow.'
const CHAT_ROLE: Parameters<typeof resolveRoleModel>[0] = 'chat'

/**
 * The REAL chat adapter registered for Studio/observability parity: same
 * prompt builder, same 'chat' role slot, same 10 tools as the production
 * per-request `StorytellerAgent` (which additionally carries Memory). This is
 * what replaces the hardcoded Studio stub (PLAN-V2 1.1).
 */
const chatAdapterAgent = new Agent({
  id: CHAT_ADAPTER_ID,
  name: CHAT_ADAPTER_NAME,
  description: CHAT_ADAPTER_DESCRIPTION,
  instructions: () => buildChatAdapterPrompt(getEntityLinkRequirements()),
  model: () => resolveRoleModel(CHAT_ROLE),
  tools: {
    [manageBeatTool.id]: manageBeatTool,
    [listBeatsTool.id]: listBeatsTool,
    [manageCharacterTool.id]: manageCharacterTool,
    [listCharactersTool.id]: listCharactersTool,
    [manageEpisodeTool.id]: manageEpisodeTool,
    [listEpisodesTool.id]: listEpisodesTool,
    [updateWorldBibleTool.id]: updateWorldBibleTool,
    [readWorldBibleTool.id]: readWorldBibleTool,
    [checkContinuityTool.id]: checkContinuityTool,
    [runBeatDraftWorkflowTool.id]: runBeatDraftWorkflowTool,
  },
})

/** The 6 GRRM-topology agents (chat adapter, author, planner, 3 critics). */
export const storytellerRuntimeAgents: Record<string, Agent> = {
  storyteller: chatAdapterAgent,
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
} from '@/domains/storyteller/ai/workflows/beat-draft-contract'
export {
  buildStorytellerRequestContext,
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  STORYTELLER_AUTHOR_MODEL,
} from '@/domains/storyteller/ai/request-context'

// Dependency inversion: push this domain's runtime into the kernel registry
// at module-load time. The tools barrel imports this module, so any code
// path that can call getMastraInstance() has already registered us.
registerMastraModule({
  agents: storytellerRuntimeAgents,
  workflows: storytellerRuntimeWorkflows,
})

// PLAN-V2 Phase 4.2/4.3 — lazily-initialized storyteller chat controller.
// Instantiation is deferred (not at module load) so the legacy path pays
// nothing; the flagged route (`STORYTELLER_CONTROLLER=1`) awaits this getter.
// Reuses the EXISTING Postgres store — never a second store (AGENTS.md).
let storytellerControllerPromise: Promise<AgentController> | null = null

export function getStorytellerController(): Promise<AgentController> {
  if (!storytellerControllerPromise) {
    const controller = new AgentController(
      buildStorytellerControllerConfig({
        agent: chatAdapterAgent,
        storage: getStorageInstance(),
      })
    )
    storytellerControllerPromise = controller.init().then(() => controller)
  }
  return storytellerControllerPromise
}
