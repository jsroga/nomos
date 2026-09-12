/**
 * Storyteller Mastra runtime surface — the ONE sanctioned deep-import point
 * for the central Mastra instance (`io/*` is the only storyteller path other
 * modules may deep-import, per the ESLint barrel guard).
 *
 * Everything exported here is cycle-free with respect to
 * `@/shared/agent-kernel`: stateless agents, critics, and the workflow import
 * only prompts/config/tools — never the Mastra instance itself.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import { Agent } from '@mastra/core/agent'
import { Workspace, LocalFilesystem } from '@mastra/core/workspace'
import { registerMastraModule } from '@/shared/agent-kernel/mastra/runtime-registry'
import {
  STORYTELLER_WORKSPACE_DIR_ENV,
  STORYTELLER_WORKSPACE_DIR_NAME,
} from '@/domains/storyteller/core/io/constants/controller-workspace'
import { createInheritedAgentMemory } from '@/shared/agent-kernel/mastra/studio-memory'
import {
  statelessGrrmAuthor,
  statelessBeatPlanner,
} from '@/domains/storyteller/ai/workflows/stateless-agents'
import {
  continuityCritic,
  proseCritic,
  stakesCritic,
  dialogueCritic,
} from '@/domains/storyteller/ai/agents/critics'
import { defaultArtifactDraftDeps } from '@/domains/storyteller/ai/workflows/artifact-draft-default-deps'
import { createArtifactDraftWorkflow } from '@/domains/storyteller/ai/workflows/artifact-draft-workflow'
import { beatDraftWorkflow } from '@/domains/storyteller/ai/workflows/beat-draft-workflow'
import { defaultFixInconsistenciesDeps } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-default-deps'
import { createFixInconsistenciesWorkflow } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-workflow'
import { bindStorytellerWorkflowRegistry } from '@/domains/storyteller/core/io/storyteller-workflow-registry'
// Tools come from their CONCRETE modules, never the tools barrel — the barrel
// side-effect-imports this file (registration ordering), so importing it here
// would create a cycle.
import {
  manageBeatApprovalTool,
  listBeatsTool,
} from '@/domains/storyteller/ai/tools/beat-tools'
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
import { checkSectionAlignmentTool } from '@/domains/storyteller/ai/tools/section-alignment-tool'
import { searchManuscriptTool } from '@/domains/storyteller/ai/tools/search-manuscript'
import { promoteRuleTool } from '@/domains/storyteller/ai/tools/promote-rule-tool'
import { proposeCharacterFieldsTool } from '@/domains/storyteller/ai/tools/propose-character-fields-tool'
import { runBeatDraftWorkflowTool } from '@/domains/storyteller/ai/tools/workflow-tool'
import { buildChatAdapterPrompt } from '@/domains/storyteller/ai/prompts/chat-adapter-prompt'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { resolveRoleModel, AGENT_MODEL_MATRIX } from '@/domains/storyteller/config/model-config'
import { mastraCompletionSettings } from '@/shared/ai/gateway/output-budget'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import {
  STORYTELLER_CHAT_MODEL,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import { AgentController } from '@mastra/core/agent-controller'
import { createDurableAgent } from '@mastra/core/agent/durable'
import type { DurableAgent } from '@mastra/core/agent/durable'
import { buildStorytellerControllerConfig } from '@/domains/storyteller/ai/controller/storyteller-controller'
import { autonomousAuthorAgent, AUTONOMOUS_AUTHOR_ID } from '@/domains/storyteller/ai/agents/AutonomousAuthor/autonomous-author-agent'
import { museAgent, museRankerAgent } from '@/domains/storyteller/ai/agents/Muse/muse-agent'
import { getStorageInstance } from '@/shared/agent-kernel/mastra-instance'
import { CHAT_HTTP_SCORERS } from '@/shared/agent-kernel/scorers/chat-live-scorers'
import { EDITOR_TOOL_MEMBERSHIP_ONLY } from '@/shared/agent-kernel/mastra/editor-permissions'
import { getPublishedAgentOr } from '@/shared/agent-kernel/mastra/get-published-agent'
import {
  BeatPlannerAgentId,
  GrrmAuthorAgentId,
  StorytellerAgentDescription,
  StorytellerAgentId,
} from '@/domains/storyteller/ai/constants/agent-identity'
import { CriticAgentId } from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import { MuseAgentId } from '@/domains/storyteller/ai/agents/Muse/constants/muse-agents'

const CHAT_ADAPTER_ID = StorytellerAgentId.Storyteller
const CHAT_ADAPTER_NAME = 'Storyteller'
const CHAT_ADAPTER_DESCRIPTION = StorytellerAgentDescription.Storyteller
const CHAT_ROLE: Parameters<typeof resolveRoleModel>[0] = 'chat'

const CHAT_ADAPTER_DEFAULT_OPTIONS = mastraCompletionSettings(LlmFeature.StorytellerChat, {
  roleBudget: AGENT_MODEL_MATRIX.chat.maxOutputTokens,
})

const CHAT_ADAPTER_TOOLS = {
  [manageBeatApprovalTool.id]: manageBeatApprovalTool,
  [listBeatsTool.id]: listBeatsTool,
  [manageCharacterTool.id]: manageCharacterTool,
  [listCharactersTool.id]: listCharactersTool,
  [manageEpisodeTool.id]: manageEpisodeTool,
  [listEpisodesTool.id]: listEpisodesTool,
  [updateWorldBibleTool.id]: updateWorldBibleTool,
  [readWorldBibleTool.id]: readWorldBibleTool,
  [checkContinuityTool.id]: checkContinuityTool,
  [checkSectionAlignmentTool.id]: checkSectionAlignmentTool,
  [searchManuscriptTool.id]: searchManuscriptTool,
  [promoteRuleTool.id]: promoteRuleTool,
  [proposeCharacterFieldsTool.id]: proposeCharacterFieldsTool,
  [runBeatDraftWorkflowTool.id]: runBeatDraftWorkflowTool,
}

/**
 * The REAL chat adapter registered for Studio/observability parity: same
 * prompt builder, same 'chat' role slot, same tools as the production
 * per-request `StorytellerAgent`. Memory inherits Mastra instance storage
 * (parity with StorytellerAgent's lastMessages window). This replaces the
 * hardcoded Studio stub when registration loads (PLAN-V2 1.1).
 */
const chatAdapterAgent = new Agent({
  id: CHAT_ADAPTER_ID,
  name: CHAT_ADAPTER_NAME,
  description: CHAT_ADAPTER_DESCRIPTION,
  instructions: () => buildChatAdapterPrompt(getEntityLinkRequirements()),
  model: ({ requestContext }) =>
    resolveRoleModel(
      CHAT_ROLE,
      requestContextString(requestContext, STORYTELLER_CHAT_MODEL),
    ),
  memory: createInheritedAgentMemory(),
  // Opt out of Mastra-instance workspace (repo FS tools). A function that
  // returns undefined does not fall back to the global workspace.
  workspace: () => undefined,
  scorers: CHAT_HTTP_SCORERS,
  defaultOptions: CHAT_ADAPTER_DEFAULT_OPTIONS,
  tools: CHAT_ADAPTER_TOOLS,
  editor: EDITOR_TOOL_MEMBERSHIP_ONLY,
})

/** Production tools listed on the Mastra instance for Editor's project-tool picker. */
export const storytellerRuntimeTools = CHAT_ADAPTER_TOOLS

/** Chat adapter, author, planner, floor critics, muse pair, autonomous author. Keys match agent.id. */
export const storytellerRuntimeAgents: Record<string, Agent> = {
  [CHAT_ADAPTER_ID]: chatAdapterAgent,
  [GrrmAuthorAgentId.GrrmAuthor]: statelessGrrmAuthor,
  [BeatPlannerAgentId.BeatPlanner]: statelessBeatPlanner,
  [CriticAgentId.Continuity]: continuityCritic,
  [CriticAgentId.Prose]: proseCritic,
  [CriticAgentId.Stakes]: stakesCritic,
  [CriticAgentId.Dialogue]: dialogueCritic,
  [MuseAgentId.Muse]: museAgent,
  [MuseAgentId.Ranker]: museRankerAgent,
  [AUTONOMOUS_AUTHOR_ID]: autonomousAuthorAgent,
}

const artifactDraftWorkflow = createArtifactDraftWorkflow(defaultArtifactDraftDeps)
const fixInconsistenciesWorkflow = createFixInconsistenciesWorkflow(
  defaultFixInconsistenciesDeps
)

/** Workflows registered on the production Mastra instance — one key per contract id. */
export const storytellerRuntimeWorkflows = bindStorytellerWorkflowRegistry({
  beatDraft: beatDraftWorkflow,
  artifactDraft: artifactDraftWorkflow,
  fixInconsistencies: fixInconsistenciesWorkflow,
})

export {
  BEAT_DRAFT_WORKFLOW_ID,
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  VERDICT_STEP_ID,
  beatDraftOutputSchema,
} from '@/domains/storyteller/ai/workflows/beat-draft-contract'
export {
  ARTIFACT_DRAFT_WORKFLOW_ID,
  ARTIFACT_DRAFT_VERDICT_STEP_ID,
  ArtifactDraftVerdictAction,
  artifactDraftOutputSchema,
} from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
export {
  FIX_INCONSISTENCIES_WORKFLOW_ID,
  FIX_INCONSISTENCIES_VERDICT_STEP,
} from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
export {
  buildStorytellerRequestContext,
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  STORYTELLER_AUTHOR_MODEL,
  STORYTELLER_CHAT_MODEL,
} from '@/domains/storyteller/ai/request-context'
export {
  BEAT_TOOL_ID,
  LIST_BEATS_TOOL_ID,
  CHARACTER_TOOL_ID,
  LIST_CHARACTERS_TOOL_ID,
  EPISODE_TOOL_ID,
  LIST_EPISODES_TOOL_ID,
  UPDATE_WORLD_BIBLE_TOOL_ID,
  READ_WORLD_BIBLE_TOOL_ID,
  CHECK_CONTINUITY_TOOL_ID,
  CHECK_SECTION_ALIGNMENT_TOOL_ID,
  PROPOSE_CHARACTER_FIELDS_TOOL_ID,
} from '@/domains/storyteller/ai/tools/manage-tools-wire'

// Dependency inversion: push this domain's runtime into the kernel registry
// at module-load time. The tools barrel imports this module, so any code
// path that can call getMastraInstance() has already registered us.
registerMastraModule({
  agents: storytellerRuntimeAgents,
  workflows: storytellerRuntimeWorkflows,
})

// PLAN-V2 Phase 4.2/4.3 — lazily-initialized storyteller chat controller.
// Instantiation is deferred (not at module load) so the legacy path pays
// nothing; the flagged route (`FF_STORYTELLER_CONTROLLER=true`) awaits this getter.
// Reuses the EXISTING Postgres store — never a second store (AGENTS.md).
let storytellerControllerPromise: Promise<AgentController> | null = null

/**
 * Scratch workspace for the controller session.
 *
 * Defaults under the OS temp dir because that is the one writable location in
 * both local dev and serverless (Vercel gives the function `/tmp`); the repo
 * root is read-only in production. Contents are disposable — the plan body is
 * carried in the suspension payload, so an evicted tmp dir cannot strand an
 * approval.
 */
function resolveControllerWorkspaceDir(): string {
  const override = process.env[STORYTELLER_WORKSPACE_DIR_ENV]?.trim()
  return override || path.join(os.tmpdir(), STORYTELLER_WORKSPACE_DIR_NAME)
}

export function getStorytellerController(): Promise<AgentController> {
  if (!storytellerControllerPromise) {
    const basePath = resolveControllerWorkspaceDir()
    fs.mkdirSync(basePath, { recursive: true })

    storytellerControllerPromise = (async () => {
      const agent = await getPublishedAgentOr(CHAT_ADAPTER_ID, chatAdapterAgent)
      const controller = new AgentController(
        buildStorytellerControllerConfig({
          agent,
          storage: getStorageInstance(),
          workspace: new Workspace({ filesystem: new LocalFilesystem({ basePath }) }),
        })
      )
      await controller.init()
      return controller
    })()
  }
  return storytellerControllerPromise
}

// Eval-recommendation Phase — durable wrap of the autonomous author (goals loop).
// Lazily created so the legacy path pays nothing; the flagged entry
// (`FF_STORYTELLER_AUTONOMOUS=true`) uses it. In-process cache for the pilot (no Redis);
// swap in RedisServerCache for multi-process reconnection.
let autonomousDurableAgent: DurableAgent | null = null

export function getStorytellerAutonomousAgent(): DurableAgent {
  if (!autonomousDurableAgent) {
    autonomousDurableAgent = createDurableAgent({ agent: autonomousAuthorAgent })
  }
  return autonomousDurableAgent
}

/**
 * Start (or restart) the autonomous drafting loop for a thread: set the standing
 * objective in thread state, then stream the durable run. Reconnect a dropped
 * client with `getStorytellerAutonomousAgent().observe(runId)`; the returned
 * `runId`/`cleanup` come from the durable stream.
 */
export async function startAutonomousEpisodeDraft(params: {
  threadId: string
  resourceId: string
  objective: string
  prompt: string
  maxRuns?: number
}) {
  const agent = await getPublishedAgentOr(AUTONOMOUS_AUTHOR_ID, autonomousAuthorAgent)
  await agent.setObjective(params.objective, {
    threadId: params.threadId,
    resourceId: params.resourceId,
    ...(params.maxRuns !== undefined ? { maxRuns: params.maxRuns } : {}),
  })
  if (!autonomousDurableAgent) {
    autonomousDurableAgent = createDurableAgent({ agent })
  }
  return autonomousDurableAgent.stream(params.prompt, {
    memory: { thread: params.threadId, resource: params.resourceId },
    ...mastraCompletionSettings(LlmFeature.StorytellerBeatDraft, {
      roleBudget: AGENT_MODEL_MATRIX.author.maxOutputTokens,
    }),
  })
}
